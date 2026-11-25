use crate::models::*;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(14))
        .user_agent("MAOTUN/2.0 (Global Signal Console)")
        .build()
        .unwrap_or_default()
}

pub async fn fetch_earthquakes() -> Vec<EarthquakeItem> {
    let client = http_client();
    let mut results: Vec<EarthquakeItem> = Vec::new();

    // 1. Kandilli live Turkey
    if let Ok(resp) = client
        .get("https://api.orhanaydogdu.com.tr/deprem/kandilli/live?limit=35")
        .send()
        .await
    {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(arr) = json["result"].as_array() {
                for item in arr {
                    if let Some(c) = item["geojson"]["coordinates"].as_array() {
                        let lon = c.first().and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let lat = c.get(1).and_then(|v| v.as_f64()).unwrap_or(0.0);
                        if lat != 0.0 && lon != 0.0 {
                            results.push(EarthquakeItem {
                                id: item["earthquake_id"].as_str().unwrap_or("knd").to_string(),
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

    // 2. AFAD live Turkey (deduplicated against Kandilli by proximity)
    if let Ok(resp) = client
        .get("https://api.orhanaydogdu.com.tr/deprem/afad/live?limit=25")
        .send()
        .await
    {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(arr) = json["result"].as_array() {
                for item in arr {
                    if let Some(c) = item["geojson"]["coordinates"].as_array() {
                        let lon = c.first().and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let lat = c.get(1).and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let mag = item["mag"].as_f64().unwrap_or(0.0);
                        if lat != 0.0 && lon != 0.0 {
                            let is_dup = results.iter().any(|e| {
                                (e.lat - lat).abs() < 0.15
                                    && (e.lon - lon).abs() < 0.15
                                    && (e.mag - mag).abs() < 0.5
                            });
                            if !is_dup {
                                results.push(EarthquakeItem {
                                    id: item["earthquake_id"].as_str().unwrap_or("afad").to_string(),
                                    title: item["title"].as_str().unwrap_or("Türkiye").to_string(),
                                    mag,
                                    depth_km: item["depth"].as_f64().unwrap_or(0.0),
                                    lat,
                                    lon,
                                    time_str: item["date"].as_str().unwrap_or("").to_string(),
                                    source: "AFAD".to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Global USGS M2.5+ past 24h
    if let Ok(resp) = client
        .get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson")
        .send()
        .await
    {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(arr) = json["features"].as_array() {
                for item in arr.iter().take(70) {
                    let props = &item["properties"];
                    if let Some(c) = item["geometry"]["coordinates"].as_array() {
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
        .get("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=45")
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

fn parse_adsb_list(json: &serde_json::Value, force_cat: Option<&str>, limit: usize) -> Vec<FlightItem> {
    let mut results = Vec::new();
    if let Some(ac_list) = json["ac"].as_array() {
        for ac in ac_list.iter().take(limit) {
            if let (Some(alat), Some(alon)) = (ac["lat"].as_f64(), ac["lon"].as_f64()) {
                let db_flags = ac["dbFlags"].as_i64().unwrap_or(0);
                let category = if let Some(fc) = force_cat {
                    fc.to_string()
                } else if (db_flags & 1) != 0 {
                    "MIL".to_string()
                } else if (db_flags & 8) != 0 {
                    "LADD".to_string()
                } else if (db_flags & 4) != 0 {
                    "PIA".to_string()
                } else {
                    "CIVIL".to_string()
                };
                results.push(FlightItem {
                    hex: ac["hex"].as_str().unwrap_or("").to_string(),
                    callsign: ac["flight"].as_str().unwrap_or("N/A").trim().to_string(),
                    lat: alat,
                    lon: alon,
                    alt_ft: ac["alt_baro"].as_i64().unwrap_or(0),
                    speed_kt: ac["gs"].as_f64().unwrap_or(0.0),
                    heading: ac["track"].as_f64().unwrap_or(0.0),
                    aircraft_type: ac["t"].as_str().unwrap_or("AIRCRAFT").to_string(),
                    category,
                    squawk: ac["squawk"].as_str().unwrap_or("----").to_string(),
                });
            }
        }
    }
    results
}

pub async fn fetch_flights(lat: f64, lon: f64, radius_nm: u32) -> Vec<FlightItem> {
    let client = http_client();
    let url = format!("https://api.adsb.lol/v2/lat/{:.4}/lon/{:.4}/dist/{}", lat, lon, radius_nm.min(250));
    if let Ok(resp) = client.get(&url).send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            return parse_adsb_list(&json, None, 80);
        }
    }
    Vec::new()
}

pub async fn fetch_military_flights() -> Vec<FlightItem> {
    let client = http_client();
    if let Ok(resp) = client.get("https://api.adsb.lol/v2/mil").send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            return parse_adsb_list(&json, Some("MIL"), 120);
        }
    }
    Vec::new()
}

pub async fn fetch_satellite_tles() -> Vec<SatelliteTle> {
    let client = http_client();
    let mut out = Vec::new();
    let groups = [
        ("stations", "STATION", 12usize),
        ("weather", "WEATHER", 14usize),
        ("gps-ops", "GPS", 14usize),
        ("starlink", "STARLINK", 24usize),
    ];

    for (slug, label, max_n) in groups {
        let url = format!("https://celestrak.org/NORAD/elements/gp.php?GROUP={}&FORMAT=tle", slug);
        if let Ok(resp) = client.get(&url).send().await {
            if let Ok(text) = resp.text().await {
                let lines: Vec<&str> = text.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
                let mut count = 0usize;
                let mut i = 0usize;
                while i + 2 < lines.len() && count < max_n {
                    let name = lines[i];
                    let tle1 = lines[i + 1];
                    let tle2 = lines[i + 2];
                    if tle1.starts_with("1 ") && tle2.starts_with("2 ") {
                        let norad = tle1.get(2..7).unwrap_or("00000").trim().to_string();
                        out.push(SatelliteTle {
                            id: norad,
                            name: name.to_string(),
                            group: label.to_string(),
                            tle1: tle1.to_string(),
                            tle2: tle2.to_string(),
                        });
                        count += 1;
                        i += 3;
                    } else {
                        i += 1;
                    }
                }
            }
        }
    }
    out
}

pub async fn fetch_kiwisdr_nodes() -> Vec<KiwiSdrNode> {
    let client = http_client();
    let mut out = Vec::new();
    if let Ok(resp) = client.get("http://rx.linkfanel.net/kiwisdr_com.js").send().await {
        if let Ok(text) = resp.text().await {
            if let (Some(start), Some(end)) = (text.find('['), text.rfind(']')) {
                let raw = &text[start..=end];
                if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(raw) {
                    for item in arr.iter().take(160) {
                        let gps = item["gps"].as_str().unwrap_or("");
                        let cleaned = gps.trim_matches(|c| c == '(' || c == ')' || c == ' ');
                        let mut parts = cleaned.split(',');
                        let lat = parts.next().and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0);
                        let lon = parts.next().and_then(|s| s.trim().parse::<f64>().ok()).unwrap_or(0.0);
                        let url = item["url"].as_str().unwrap_or("").to_string();
                        if lat != 0.0 && lon != 0.0 && !url.is_empty() {
                            out.push(KiwiSdrNode {
                                name: item["name"].as_str().unwrap_or("KiwiSDR").chars().take(48).collect(),
                                url,
                                lat,
                                lon,
                                users: item["users"].as_str().and_then(|s| s.parse().ok()).unwrap_or(0),
                                users_max: item["users_max"].as_str().and_then(|s| s.parse().ok()).unwrap_or(4),
                                bands: item["bands"].as_str().unwrap_or("0-30 MHz").to_string(),
                                antenna: item["antenna"].as_str().unwrap_or("HF Antenna").chars().take(42).collect(),
                            });
                        }
                    }
                }
            }
        }
    }
    out
}

pub async fn fetch_rainviewer_meta() -> RainViewerMeta {
    let client = http_client();
    let mut frames = Vec::new();
    let mut host = "https://tilecache.rainviewer.com".to_string();
    if let Ok(resp) = client
        .get("https://api.rainviewer.com/public/weather-maps.json")
        .send()
        .await
    {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(h) = json["host"].as_str() {
                host = h.to_string();
            }
            if let Some(past) = json["radar"]["past"].as_array() {
                for f in past {
                    if let (Some(t), Some(p)) = (f["time"].as_i64(), f["path"].as_str()) {
                        frames.push(RainViewerFrame { time: t, path: p.to_string() });
                    }
                }
            }
            if let Some(nowc) = json["radar"]["nowcast"].as_array() {
                for f in nowc {
                    if let (Some(t), Some(p)) = (f["time"].as_i64(), f["path"].as_str()) {
                        frames.push(RainViewerFrame { time: t, path: p.to_string() });
                    }
                }
            }
        }
    }
    RainViewerMeta { host, frames }
}

pub async fn fetch_weather_aqi(lat: f64, lon: f64) -> WeatherAqi {
    let client = http_client();
    let mut res = WeatherAqi {
        temp_c: 0.0,
        wind_kmh: 0.0,
        wind_dir: 0.0,
        humidity: 0.0,
        pm25: 0.0,
        pm10: 0.0,
        co: 0.0,
        us_aqi: 0,
    };

    let w_url = format!(
        "https://api.open-meteo.com/v1/forecast?latitude={:.4}&longitude={:.4}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m",
        lat, lon
    );
    if let Ok(resp) = client.get(&w_url).send().await {
        if let Ok(j) = resp.json::<serde_json::Value>().await {
            let cur = &j["current"];
            res.temp_c = cur["temperature_2m"].as_f64().unwrap_or(0.0);
            res.humidity = cur["relative_humidity_2m"].as_f64().unwrap_or(0.0);
            res.wind_kmh = cur["wind_speed_10m"].as_f64().unwrap_or(0.0);
            res.wind_dir = cur["wind_direction_10m"].as_f64().unwrap_or(0.0);
        }
    }

    let aq_url = format!(
        "https://air-quality-api.open-meteo.com/v1/air-quality?latitude={:.4}&longitude={:.4}&current=pm10,pm2_5,carbon_monoxide,us_aqi",
        lat, lon
    );
    if let Ok(resp) = client.get(&aq_url).send().await {
        if let Ok(j) = resp.json::<serde_json::Value>().await {
            let cur = &j["current"];
            res.pm25 = cur["pm2_5"].as_f64().unwrap_or(0.0);
            res.pm10 = cur["pm10"].as_f64().unwrap_or(0.0);
            res.co = cur["carbon_monoxide"].as_f64().unwrap_or(0.0);
            res.us_aqi = cur["us_aqi"].as_i64().unwrap_or(0);
        }
    }
    res
}

pub async fn fetch_space_weather() -> SpaceWeather {
    let client = http_client();
    let mut kp_index = 2.0;
    let mut kp_time = String::new();
    let mut aurora_points = Vec::new();

    if let Ok(resp) = client
        .get("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json")
        .send()
        .await
    {
        if let Ok(arr) = resp.json::<Vec<serde_json::Value>>().await {
            if let Some(last) = arr.last() {
                kp_index = last["kp_index"].as_f64().unwrap_or(2.0);
                kp_time = last["time_tag"].as_str().unwrap_or("").to_string();
            }
        }
    }

    if let Ok(resp) = client
        .get("https://services.swpc.noaa.gov/json/ovation_aurora_latest.json")
        .send()
        .await
    {
        if let Ok(j) = resp.json::<serde_json::Value>().await {
            if let Some(coords) = j["coordinates"].as_array() {
                // Sample every 2nd strong point (>= 14% probability) for smooth 60 FPS heatmap
                for (idx, pt) in coords.iter().enumerate() {
                    if idx % 2 != 0 {
                        continue;
                    }
                    if let Some(a) = pt.as_array() {
                        let lon_raw = a.first().and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let lat = a.get(1).and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let prob = a.get(2).and_then(|v| v.as_i64()).unwrap_or(0);
                        if prob >= 14 {
                            let lon = if lon_raw > 180.0 { lon_raw - 360.0 } else { lon_raw };
                            aurora_points.push(AuroraPoint { lon, lat, prob });
                            if aurora_points.len() >= 1400 {
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    let storm_level = if kp_index >= 7.0 {
        "G3+ GÜÇLÜ FIRTINA"
    } else if kp_index >= 5.0 {
        "G1-G2 JEOMANYETİK FIRTINA"
    } else if kp_index >= 4.0 {
        "AKTİF"
    } else {
        "SAKİN"
    }
    .to_string();

    SpaceWeather {
        kp_index,
        kp_time,
        storm_level,
        aurora_points,
    }
}

pub async fn fetch_ships() -> Vec<ShipItem> {
    let client = http_client();
    let mut ships = Vec::new();
    // Keyless open AIS feed (Digitraffic Marine - Baltic/Northern Europe)
    if let Ok(resp) = client
        .get("https://meri.digitraffic.fi/api/ais/v1/locations")
        .header("Digitraffic-User", "MAOTUN/2.0")
        .send()
        .await
    {
        if let Ok(j) = resp.json::<serde_json::Value>().await {
            if let Some(feats) = j["features"].as_array() {
                for f in feats.iter().take(120) {
                    if let Some(c) = f["geometry"]["coordinates"].as_array() {
                        let lon = c.first().and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let lat = c.get(1).and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let p = &f["properties"];
                        let mmsi = f["mmsi"].to_string();
                        ships.push(ShipItem {
                            mmsi: mmsi.clone(),
                            name: format!("VESSEL {}", mmsi),
                            lat,
                            lon,
                            sog: p["sog"].as_f64().unwrap_or(0.0),
                            cog: p["cog"].as_f64().unwrap_or(0.0),
                            source: "DIGITRAFFIC".to_string(),
                        });
                    }
                }
            }
        }
    }
    ships
}

pub async fn fetch_firms_fires(map_key: &str) -> Vec<FireHotspot> {
    if map_key.trim().is_empty() {
        return Vec::new();
    }
    let client = http_client();
    let url = format!(
        "https://firms.modaps.eosdis.nasa.gov/api/area/csv/{}/VIIRS_SNPP_NRT/world/1",
        map_key.trim()
    );
    let mut out = Vec::new();
    if let Ok(resp) = client.get(&url).send().await {
        if let Ok(text) = resp.text().await {
            for line in text.lines().skip(1).take(300) {
                let cols: Vec<&str> = line.split(',').collect();
                if cols.len() >= 13 {
                    if let (Ok(lat), Ok(lon)) = (cols[0].parse::<f64>(), cols[1].parse::<f64>()) {
                        out.push(FireHotspot {
                            lat,
                            lon,
                            brightness: cols[2].parse::<f64>().unwrap_or(300.0),
                            acq_date: cols[5].to_string(),
                            frp: cols[12].parse::<f64>().unwrap_or(0.0),
                        });
                    }
                }
            }
        }
    }
    out
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
    // Also query RIPE Stat country routing stats for live ASN/IPv4 visibility
    let ripe_url = format!("https://stat.ripe.net/data/country-routing-stats/data.json?resource={}", cc);
    if let Ok(resp) = client.get(&ripe_url).send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(stats) = json["data"]["stats"].as_array().and_then(|a| a.last()) {
                let asns = stats["asns_ris"].as_i64().unwrap_or(0);
                let prefixes = stats["v4_prefixes_ris"].as_i64().unwrap_or(0);
                if asns > 0 {
                    out.push(OutageItem {
                        entity: format!("RIPE RIS // {} ({} ASN)", cc, asns),
                        datasource: format!("{} IPv4 BGP Öneki", prefixes),
                        level: "normal".to_string(),
                        time_str: "CANLI".to_string(),
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
                "content": "Sen MAOTUN küresel istihbarat konsolunun analistisin. Sana verilen canlı deprem, uçuş, hava kalitesi, kesinti ve haber verilerinden 3-4 cümlelik net, sakin ve bilgi yoğun Türkçe bir durum brifingi yaz."
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

pub async fn fetch_live_cameras() -> Vec<LiveCameraItem> {
    let client = http_client();
    let mut cams: Vec<LiveCameraItem> = Vec::new();

    // 1. Fetch verified global public HLS/MP4/JPEG cameras from Live-Environment-Streams
    if let Ok(resp) = client
        .get("https://raw.githubusercontent.com/william-ricchiuti/Live-Environment-Streams/main/streams.geojson")
        .send()
        .await
    {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(feats) = json["features"].as_array() {
                let mut per_country: std::collections::HashMap<String, usize> =
                    std::collections::HashMap::new();
                for (i, f) in feats.iter().enumerate() {
                    let p = &f["properties"];
                    if p["status"].as_str().unwrap_or("") != "active" {
                        continue;
                    }
                    let utype = p["url_type"].as_str().unwrap_or("");
                    let kind = match utype {
                        "hls" => "hls",
                        "mp4" => "mp4",
                        "jpeg" | "jpg" | "image" => "snapshot",
                        _ => continue,
                    };
                    let url = p["url"].as_str().unwrap_or("");
                    if !url.starts_with("https://") {
                        continue;
                    }
                    let cc = p["country_code"].as_str().unwrap_or("INT").to_uppercase();
                    let count = per_country.entry(cc.clone()).or_insert(0);
                    if *count >= 16 {
                        continue;
                    }
                    if let Some(c) = f["geometry"]["coordinates"].as_array() {
                        let lon = c.first().and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let lat = c.get(1).and_then(|v| v.as_f64()).unwrap_or(0.0);
                        if lat == 0.0 && lon == 0.0 {
                            continue;
                        }
                        *count += 1;
                        cams.push(LiveCameraItem {
                            id: format!("env-{}", i),
                            name: p["name"].as_str().unwrap_or("Canlı Kamera").chars().take(52).collect(),
                            city: p["display_name"].as_str().unwrap_or(&cc).chars().take(34).collect(),
                            country_code: cc,
                            lat,
                            lon,
                            kind: kind.to_string(),
                            embed_url: url.to_string(),
                            refresh_sec: if kind == "snapshot" { Some(8) } else { None },
                        });
                        if cams.len() >= 180 {
                            break;
                        }
                    }
                }
            }
        }
    }

    // 2. Dynamically resolve live YouTube 24/7 channels (ISS 4K, EarthCam, Tokyo, Skyline)
    let yt_channels = [
        ("yt-iss-sen", "ISS 4K — Uzaydan Canlı Dünya (Sen)", "Yörünge (420 km)", "INT", 24.0, 22.0, "https://www.youtube.com/@Sen/live"),
        ("yt-earthcam", "EarthCam — Canlı Dünya & New York", "New York", "US", 40.758, -73.9855, "https://www.youtube.com/@earthcam/live"),
        ("yt-tokyo-ann", "Tokyo — Canlı Şehir & Haber Kamerası", "Tokyo", "JP", 35.6595, 139.7004, "https://www.youtube.com/@ANNnewsCH/live"),
        ("yt-skyline", "SkylineWebcams — Canlı Şehir Akışı", "Avrupa", "IT", 45.4371, 12.3326, "https://www.youtube.com/@SkylineWebcams/live"),
    ];
    for (id, name, city, cc, lat, lon, live_url) in yt_channels {
        if let Ok(resp) = client.get(live_url).send().await {
            if let Ok(html) = resp.text().await {
                if let Some(vid) = extract_youtube_video_id(&html) {
                    cams.insert(
                        0,
                        LiveCameraItem {
                            id: id.to_string(),
                            name: name.to_string(),
                            city: city.to_string(),
                            country_code: cc.to_string(),
                            lat,
                            lon,
                            kind: "youtube".to_string(),
                            embed_url: format!("https://www.youtube-nocookie.com/embed/{}?autoplay=1&mute=1", vid),
                            refresh_sec: None,
                        },
                    );
                }
            }
        }
    }

    cams
}

fn extract_youtube_video_id(html: &str) -> Option<String> {
    let needle = "\"videoId\":\"";
    if let Some(pos) = html.find(needle) {
        let rest = &html[pos + needle.len()..];
        let id: String = rest.chars().take(11).collect();
        if id.len() == 11 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
            return Some(id);
        }
    }
    None
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
