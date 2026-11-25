use std::sync::OnceLock;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

static PROXY_PORT: OnceLock<u16> = OnceLock::new();

pub fn get_port() -> u16 {
    *PROXY_PORT.get().unwrap_or(&0)
}

pub fn start_proxy_server() {
    tauri::async_runtime::spawn(async move {
        let listener = match TcpListener::bind("127.0.0.1:0").await {
            Ok(l) => l,
            Err(_) => return,
        };
        if let Ok(addr) = listener.local_addr() {
            let _ = PROXY_PORT.set(addr.port());
        }
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
            .build()
            .unwrap_or_default();

        loop {
            if let Ok((stream, _)) = listener.accept().await {
                let c = client.clone();
                let port = get_port();
                tokio::spawn(async move {
                    let _ = handle_conn(stream, c, port).await;
                });
            }
        }
    });
}

async fn handle_conn(mut stream: TcpStream, client: reqwest::Client, port: u16) -> Result<(), ()> {
    let mut buf = [0u8; 8192];
    let n = stream.read(&mut buf).await.map_err(|_| ())?;
    if n == 0 {
        return Ok(());
    }
    let req_str = String::from_utf8_lossy(&buf[..n]);
    let first_line = req_str.lines().next().unwrap_or("");
    let mut parts = first_line.split_whitespace();
    let method = parts.next().unwrap_or("GET");
    let path = parts.next().unwrap_or("/");

    if method == "OPTIONS" {
        let resp = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\nConnection: close\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes()).await;
        return Ok(());
    }

    let target_url = match path.split("url=").nth(1) {
        Some(raw) => percent_decode(raw.split('&').next().unwrap_or("")),
        None => {
            let _ = stream
                .write_all(b"HTTP/1.1 400 Bad Request\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\nMissing url")
                .await;
            return Ok(());
        }
    };

    if !target_url.starts_with("http://") && !target_url.starts_with("https://") {
        let _ = stream
            .write_all(b"HTTP/1.1 400 Bad Request\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\nInvalid url")
            .await;
        return Ok(());
    }

    let upstream = client
        .get(&target_url)
        .header("Accept", "*/*")
        .send()
        .await;

    let resp = match upstream {
        Ok(r) => r,
        Err(_) => {
            let _ = stream
                .write_all(b"HTTP/1.1 502 Bad Gateway\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\nUpstream error")
                .await;
            return Ok(());
        }
    };

    let status = resp.status().as_u16();
    let content_type = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    let is_m3u8 = target_url.contains(".m3u8")
        || content_type.contains("mpegurl")
        || content_type.contains("m3u");

    let bytes = resp.bytes().await.map_err(|_| ())?;
    let body: Vec<u8> = if is_m3u8 {
        let text = String::from_utf8_lossy(&bytes);
        rewrite_m3u8(&text, &target_url, port).into_bytes()
    } else {
        bytes.to_vec()
    };

    let header = format!(
        "HTTP/1.1 {} OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n",
        status,
        content_type,
        body.len()
    );
    let _ = stream.write_all(header.as_bytes()).await;
    let _ = stream.write_all(&body).await;
    Ok(())
}

fn rewrite_m3u8(content: &str, base_url: &str, port: u16) -> String {
    let base_dir = match base_url.rfind('/') {
        Some(idx) => &base_url[..=idx],
        None => base_url,
    };
    let origin = extract_origin(base_url);
    let mut out = String::with_capacity(content.len() + 512);

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            // Also rewrite URI="..." inside #EXT-X-KEY or #EXT-X-MEDIA
            if let Some(pos) = trimmed.find("URI=\"") {
                let before = &trimmed[..pos + 5];
                let rest = &trimmed[pos + 5..];
                if let Some(end) = rest.find('"') {
                    let uri = &rest[..end];
                    let abs = resolve_url(uri, base_dir, &origin);
                    let proxied = format!("http://127.0.0.1:{}/stream?url={}", port, percent_encode(&abs));
                    out.push_str(before);
                    out.push_str(&proxied);
                    out.push_str(&rest[end..]);
                    out.push('\n');
                    continue;
                }
            }
            out.push_str(trimmed);
            out.push('\n');
        } else {
            let abs = resolve_url(trimmed, base_dir, &origin);
            let proxied = format!("http://127.0.0.1:{}/stream?url={}", port, percent_encode(&abs));
            out.push_str(&proxied);
            out.push('\n');
        }
    }
    out
}

fn resolve_url(uri: &str, base_dir: &str, origin: &str) -> String {
    if uri.starts_with("http://") || uri.starts_with("https://") {
        uri.to_string()
    } else if uri.starts_with("//") {
        format!("https:{}", uri)
    } else if uri.starts_with('/') {
        format!("{}{}", origin, uri)
    } else {
        format!("{}{}", base_dir, uri)
    }
}

fn extract_origin(url: &str) -> String {
    if let Some(scheme_end) = url.find("://") {
        let rest = &url[scheme_end + 3..];
        if let Some(slash) = rest.find('/') {
            return url[..scheme_end + 3 + slash].to_string();
        }
    }
    url.to_string()
}

fn percent_encode(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (b as char).to_string(),
            _ => format!("%{:02X}", b),
        })
        .collect()
}

fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(hex) = std::str::from_utf8(&bytes[i + 1..i + 3]) {
                if let Ok(val) = u8::from_str_radix(hex, 16) {
                    out.push(val);
                    i += 3;
                    continue;
                }
            }
        } else if bytes[i] == b'+' {
            out.push(b' ');
            i += 1;
            continue;
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}
