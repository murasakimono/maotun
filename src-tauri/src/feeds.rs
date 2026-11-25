use crate::models::*;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .user_agent("MAOTUN/1.0 (Global Signal Console)")
        .build()
        .unwrap_or_default()
}

pub async fn fetch_earthquakes() -> Vec<EarthquakeItem> {
    let client = http_client();
    let mut results = Vec::new();

    // 1. Turkey live earthquakes (Kandilli)
    if let Ok(resp) = client
        .get("https://api.orhanaydogdu.com.tr/deprem/kandilli/live?limit=35")
        .send()
        .await
    {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(arr) = json["result"].as_array() {
                for item in arr {
                    let coords = item["geojson"]["coordinates"].as_array();
                    if let Some(c) = coords {
                        let lon = c.first().and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let lat = c.get(1).and_then(|v| v.as_f64()).unwrap_or(0.0);
                        if lat != 0.0 && lon != 0.0 {
                            results.push(EarthquakeItem {
                                id: item["earthquake_id"].as_str().unwrap_or("tr").to_string(),
                                title: item["title"].as_str().unwrap_or("Türkiye").to_string(),
                                mag: item["mag"].as_f64().unwrap_or(0.0),
                                depth_km: item["depth"].as_f64().unwrap_or(0.0),
                                lat,
                                lon,
                                time_str: item["date"].as_str().unwrap_or("").to_string(),
                                source: "KANDİLLİ".to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    // 2. Global live earthquakes (USGS M2.5+ past 24h)
    if let Ok(resp) = client
        .get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson")
        .send()
        .await
    {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(arr) = json["features"].as_array() {
                for item in arr.iter().take(65) {
                    let props = &item["properties"];
                    let coords = item["geometry"]["coordinates"].as_array();
                    if let Some(c) = coords {
                        let lon = c.first().and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let lat = c.get(1).and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let depth = c.get(2).and_then(|v| v.as_f64()).unwrap_or(0.0);
                        results.push(EarthquakeItem {
                            id: item["id"].as_str().unwrap_or("usgs").to_string(),
                            title: props["place"].as_str().unwrap_or("Global").to_string(),
                            mag: props["mag"].as_f64().unwrap_or(0.0),
                            depth_km: depth,
                            lat,
                            lon,
                            time_str: "Son 24s (USGS)".to_string(),
                            source: "USGS".to_string(),
                        });
                    }
                }
            }
        }
    }

    results
}

pub async fn fetch_disasters() -> Vec<DisasterItem> {
    let client = http_client();
    let mut results = Vec::new();
    if let Ok(resp) = client
        .get("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=40")
        .send()
        .await
    {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(events) = json["events"].as_array() {
                for ev in events {
                    let cat = ev["categories"]
                        .as_array()
                        .and_then(|a| a.first())
                        .and_then(|c| c["title"].as_str())
                        .unwrap_or("Doğal Olay")
                        .to_string();
                    if let Some(geo) = ev["geometry"].as_array().and_then(|g| g.last()) {
                        if let Some(coords) = geo["coordinates"].as_array() {
                            if let (Some(lon), Some(lat)) = (
                                coords.first().and_then(|v| v.as_f64()),
                                coords.get(1).and_then(|v| v.as_f64()),
                            ) {
                                results.push(DisasterItem {
                                    id: ev["id"].as_str().unwrap_or("eonet").to_string(),
                                    title: ev["title"].as_str().unwrap_or("Olay").to_string(),
                                    category: cat,
                                    lat,
                                    lon,
                                    date_str: geo["date"].as_str().unwrap_or("").chars().take(10).collect(),
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    results
}

pub async fn fetch_flights(lat: f64, lon: f64, radius_nm: u32) -> Vec<FlightItem> {
    let client = http_client();
    let url = format!("https://api.adsb.lol/v2/lat/{:.4}/lon/{:.4}/dist/{}", lat, lon, radius_nm.min(250));
    let mut results = Vec::new();
    if let Ok(resp) = client.get(&url).send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(ac_list) = json["ac"].as_array() {
                for ac in ac_list.iter().take(70) {
                    if let (Some(alat), Some(alon)) = (ac["lat"].as_f64(), ac["lon"].as_f64()) {
                        results.push(FlightItem {
                            hex: ac["hex"].as_str().unwrap_or("").to_string(),
                            callsign: ac["flight"].as_str().unwrap_or("N/A").trim().to_string(),
                            lat: alat,
                            lon: alon,
                            alt_ft: ac["alt_baro"].as_i64().unwrap_or(0),
                            speed_kt: ac["gs"].as_f64().unwrap_or(0.0),
                            heading: ac["track"].as_f64().unwrap_or(0.0),
                            aircraft_type: ac["t"].as_str().unwrap_or("AIRCRAFT").to_string(),
                        });
                    }
                }
            }
        }
    }
    results
}

pub async fn fetch_satellites() -> Vec<SatelliteItem> {
    let client = http_client();
    let mut sats = Vec::new();

    // Real-time ISS telemetry
    if let Ok(resp) = client
        .get("https://api.wheretheiss.at/v1/satellites/25544")
        .send()
        .await
    {
        if let Ok(j) = resp.json::<serde_json::Value>().await {
            if let (Some(lat), Some(lon)) = (j["latitude"].as_f64(), j["longitude"].as_f64()) {
                sats.push(SatelliteItem {
                    id: "25544".to_string(),
                    name: "ISS (Uluslararası Uzay İstasyonu)".to_string(),
                    category: "İstasyon".to_string(),
                    lat,
                    lon,
                    alt_km: j["altitude"].as_f64().unwrap_or(420.0),
                    velocity_kmh: j["velocity"].as_f64().unwrap_or(27600.0),
                });
            }
        }
    }

    // Live orbital propagation approximations for key tracked satellites (deterministic from epoch)
    let now_sec = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64();

    let extra = [
        ("48274", "CSS Tiangong (Çin İstasyonu)", "İstasyon", 41.5, 390.0, 27650.0, 92.0, 0.8),
        ("20580", "Hubble Uzay Teleskobu", "Gözlem", 28.5, 535.0, 27300.0, 95.4, 2.1),
        ("43013", "NOAA-20 Hava Uydusu", "Meteoroloji", 78.0, 824.0, 26800.0, 101.4, 3.7),
        ("40697", "Sentinel-2A Yer Gözlem", "Gözlem", 76.0, 786.0, 26900.0, 100.6, 5.1),
        ("SL-TR", "Starlink-31042 (Alçak Yörünge)", "İletişim", 53.2, 550.0, 27200.0, 95.6, 1.4),
    ];

    for (id, name, cat, incl, alt, vel, period_min, phase) in extra {
        let angle = (now_sec / (period_min * 60.0)) * std::f64::consts::TAU + phase;
        let lat = (angle.sin() * incl).clamp(-82.0, 82.0);
        let lon = ((((angle * 57.2958) - (now_sec * 0.004178)) % 360.0) + 540.0) % 360.0 - 180.0;
        sats.push(SatelliteItem {
            id: id.to_string(),
            name: name.to_string(),
            category: cat.to_string(),
            lat,
            lon,
            alt_km: alt,
            velocity_kmh: vel,
        });
    }

    sats
}

pub async fn fetch_radios(country_code: &str, city: &str) -> Vec<RadioStation> {
    let client = http_client();
    let cc = country_code.trim().to_uppercase();
    let url = if !cc.is_empty() {
        format!(
            "https://de1.api.radio-browser.info/json/stations/search?countrycode={}&limit=28&order=clickcount&reverse=true&hidebroken=true",
            cc
        )
    } else {
        format!(
            "https://de1.api.radio-browser.info/json/stations/search?name={}&limit=24&order=clickcount&reverse=true&hidebroken=true",
            city
        )
    };

    let mut stations = Vec::new();
    if let Ok(resp) = client.get(&url).send().await {
        if let Ok(arr) = resp.json::<Vec<serde_json::Value>>().await {
            for s in arr {
                let stream = s["url_resolved"]
                    .as_str()
                    .filter(|u| !u.is_empty())
                    .or_else(|| s["url"].as_str())
                    .unwrap_or("");
                if stream.starts_with("http") {
                    stations.push(RadioStation {
                        id: s["stationuuid"].as_str().unwrap_or("").to_string(),
                        name: s["name"].as_str().unwrap_or("Radyo").trim().to_string(),
                        country: s["country"].as_str().unwrap_or("").to_string(),
                        tags: s["tags"].as_str().unwrap_or("").to_string(),
                        stream_url: stream.to_string(),
                        bitrate: s["bitrate"].as_i64().unwrap_or(128),
                        favicon: s["favicon"].as_str().unwrap_or("").to_string(),
                    });
                }
            }
        }
    }
    stations
}

pub async fn fetch_tv_channels(country_code: &str) -> Vec<TvChannel> {
    let client = http_client();
    let cc = if country_code.trim().is_empty() {
        "tr".to_string()
    } else {
        country_code.trim().to_lowercase()
    };
    let url = format!("https://iptv-org.github.io/iptv/countries/{}.m3u", cc);
    let mut channels = Vec::new();

    if let Ok(resp) = client.get(&url).send().await {
        if let Ok(text) = resp.text().await {
            let mut cur_name = String::new();
            let mut cur_group = String::new();
            let mut cur_logo = String::new();

            for line in text.lines() {
                let l = line.trim();
                if l.starts_with("#EXTINF:") {
                    cur_name = l.rsplit(',').next().unwrap_or("TV Kanalı").trim().to_string();
                    cur_group = extract_attr(l, "group-title");
                    cur_logo = extract_attr(l, "tvg-logo");
                } else if l.starts_with("http") && !cur_name.is_empty() {
                    channels.push(TvChannel {
                        name: cur_name.clone(),
                        group: if cur_group.is_empty() { "Canlı TV".to_string() } else { cur_group.clone() },
                        logo: cur_logo.clone(),
                        stream_url: l.to_string(),
                    });
                    cur_name.clear();
                    if channels.len() >= 35 {
                        break;
                    }
                }
            }
        }
    }
    channels
}

fn extract_attr(line: &str, key: &str) -> String {
    let needle = format!("{}=\"", key);
    if let Some(start) = line.find(&needle) {
        let rest = &line[start + needle.len()..];
        if let Some(end) = rest.find('"') {
            return rest[..end].to_string();
        }
    }
    String::new()
}

pub async fn fetch_news(query: &str) -> Vec<NewsItem> {
    let client = http_client();
    let q = if query.trim().is_empty() { "Turkey" } else { query.trim() };
    let url = format!(
        "https://api.gdeltproject.org/api/v2/doc/doc?query={}&mode=ArtList&maxrecords=12&format=json&sort=DateDesc",
        url_encode(q)
    );
    let mut list = Vec::new();
    if let Ok(resp) = client.get(&url).send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(arts) = json["articles"].as_array() {
                for a in arts {
                    list.push(NewsItem {
                        title: a["title"].as_str().unwrap_or("").to_string(),
                        url: a["url"].as_str().unwrap_or("").to_string(),
                        domain: a["domain"].as_str().unwrap_or("").to_string(),
                        seendate: a["seendate"].as_str().unwrap_or("").chars().take(15).collect(),
                    });
                }
            }
        }
    }
    list
}

pub async fn fetch_outages(country_code: &str) -> Vec<OutageItem> {
    let client = http_client();
    let cc = if country_code.trim().is_empty() { "TR" } else { country_code.trim() }.to_uppercase();
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let from = now.saturating_sub(86400 * 3);
    let url = format!(
        "https://api.ioda.inetintel.cc.gatech.edu/v2/outages/alerts?entityType=country&entityCode={}&from={}&until={}",
        cc, from, now
    );
    let mut out = Vec::new();
    if let Ok(resp) = client.get(&url).send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(arr) = json["data"].as_array() {
                for a in arr.iter().take(10) {
                    out.push(OutageItem {
                        entity: a["entity"]["name"].as_str().unwrap_or(&cc).to_string(),
                        datasource: a["datasource"].as_str().unwrap_or("BGP").to_string(),
                        level: a["level"].as_str().unwrap_or("normal").to_string(),
                        time_str: a["time"].to_string(),
                    });
                }
            }
        }
    }
    out
}

pub async fn reverse_geocode(lat: f64, lon: f64) -> PlaceInfo {
    let client = http_client();
    let url = format!(
        "https://nominatim.openstreetmap.org/reverse?lat={:.5}&lon={:.5}&format=json&accept-language=tr",
        lat, lon
    );
    if let Ok(resp) = client.get(&url).send().await {
        if let Ok(j) = resp.json::<serde_json::Value>().await {
            let addr = &j["address"];
            let city = addr["suburb"]
                .as_str()
                .or_else(|| addr["town"].as_str())
                .or_else(|| addr["city"].as_str())
                .or_else(|| addr["state"].as_str())
                .unwrap_or("Bölge")
                .to_string();
            let country = addr["country"].as_str().unwrap_or("Uluslararası").to_string();
            let cc = addr["country_code"].as_str().unwrap_or("TR").to_uppercase();
            return PlaceInfo {
                display_name: j["display_name"].as_str().unwrap_or(&city).to_string(),
                city,
                country,
                country_code: cc,
                lat,
                lon,
            };
        }
    }
    PlaceInfo {
        display_name: format!("{:.3}, {:.3}", lat, lon),
        city: "Seçili Koordinat".to_string(),
        country: "Dünya".to_string(),
        country_code: "TR".to_string(),
        lat,
        lon,
    }
}

pub async fn search_place(query: &str) -> Vec<PlaceInfo> {
    let client = http_client();
    let url = format!(
        "https://nominatim.openstreetmap.org/search?q={}&format=json&addressdetails=1&limit=6&accept-language=tr",
        url_encode(query)
    );
    let mut results = Vec::new();
    if let Ok(resp) = client.get(&url).send().await {
        if let Ok(arr) = resp.json::<Vec<serde_json::Value>>().await {
            for j in arr {
                let lat = j["lat"].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                let lon = j["lon"].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                let addr = &j["address"];
                let city = j["name"].as_str().unwrap_or("Konum").to_string();
                let country = addr["country"].as_str().unwrap_or("").to_string();
                let cc = addr["country_code"].as_str().unwrap_or("TR").to_uppercase();
                results.push(PlaceInfo {
                    display_name: j["display_name"].as_str().unwrap_or(&city).to_string(),
                    city,
                    country,
                    country_code: cc,
                    lat,
                    lon,
                });
            }
        }
    }
    results
}

pub async fn ai_region_brief(region: String, summary_context: String, endpoint: String, model: String) -> Result<String, String> {
    let client = http_client();
    let base = endpoint.trim_end_matches('/');
    let url = format!("{}/api/chat", base);
    let payload = serde_json::json!({
        "model": model,
        "stream": false,
        "messages": [
            {
                "role": "system",
                "content": "Sen MAOTUN küresel istihbarat konsolunun analistisin. Sana verilen canlı deprem, uçuş, kesinti ve haber verilerinden 3-4 cümlelik net, sakin ve bilgi yoğun Türkçe bir durum brifingi yaz."
            },
            {
                "role": "user",
                "content": format!("Bölge: {}\nCanlı Veriler:\n{}", region, summary_context)
            }
        ]
    });
    let resp = client.post(&url).json(&payload).send().await.map_err(|e| format!("Ollama bağlantı hatası: {}", e))?;
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(json["message"]["content"].as_str().unwrap_or("Brifing oluşturulamadı.").to_string())
}

fn url_encode(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (b as char).to_string(),
            b' ' => "%20".to_string(),
            _ => format!("%{:02X}", b),
        })
        .collect()
}
