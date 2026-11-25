mod feeds;
mod models;
mod proxy;

use models::*;

#[tauri::command]
fn get_proxy_port() -> u16 {
    proxy::get_port()
}

#[tauri::command]
async fn get_wind_temp_grid() -> Vec<WindTempPoint> {
    feeds::fetch_wind_temp_grid().await
}

#[tauri::command]
async fn get_cyber_threats() -> Vec<CyberThreat> {
    feeds::fetch_cyber_threats().await
}

#[tauri::command]
async fn get_on_this_day() -> Vec<HistoryEvent> {
    feeds::fetch_on_this_day().await
}

#[tauri::command]
async fn get_city_media_works(city: String) -> Vec<MediaWork> {
    feeds::fetch_city_media_works(&city).await
}

#[tauri::command]
async fn get_earthquakes() -> Vec<EarthquakeItem> {
    feeds::fetch_earthquakes().await
}

#[tauri::command]
async fn get_disasters() -> Vec<DisasterItem> {
    feeds::fetch_disasters().await
}

#[tauri::command]
async fn get_flights(lat: f64, lon: f64, radius_nm: u32) -> Vec<FlightItem> {
    feeds::fetch_flights(lat, lon, radius_nm).await
}

#[tauri::command]
async fn get_military_flights() -> Vec<FlightItem> {
    feeds::fetch_military_flights().await
}

#[tauri::command]
async fn get_satellite_tles() -> Vec<SatelliteTle> {
    feeds::fetch_satellite_tles().await
}

#[tauri::command]
async fn get_kiwisdr_nodes() -> Vec<KiwiSdrNode> {
    feeds::fetch_kiwisdr_nodes().await
}

#[tauri::command]
async fn get_rainviewer_meta() -> RainViewerMeta {
    feeds::fetch_rainviewer_meta().await
}

#[tauri::command]
async fn get_forecast_rich(lat: f64, lon: f64) -> RichForecast {
    feeds::fetch_forecast_rich(lat, lon).await
}

#[tauri::command]
async fn get_space_weather() -> SpaceWeather {
    feeds::fetch_space_weather().await
}

#[tauri::command]
async fn get_ships() -> Vec<ShipItem> {
    feeds::fetch_ships().await
}

#[tauri::command]
async fn get_firms_fires(map_key: String) -> Vec<FireHotspot> {
    feeds::fetch_firms_fires(&map_key).await
}

#[tauri::command]
async fn get_rockets() -> Vec<RocketLaunch> {
    feeds::fetch_rockets().await
}

#[tauri::command]
async fn get_fireballs() -> Vec<FireballItem> {
    feeds::fetch_fireballs().await
}

#[tauri::command]
async fn get_tor_relays() -> Vec<TorRelay> {
    feeds::fetch_tor_relays().await
}

#[tauri::command]
async fn get_wiki_nearby(lat: f64, lon: f64, country_code: String) -> Vec<WikiPlace> {
    feeds::fetch_wiki_nearby(lat, lon, &country_code).await
}

#[tauri::command]
async fn get_inaturalist(lat: f64, lon: f64) -> Vec<WildlifeObs> {
    feeds::fetch_inaturalist(lat, lon).await
}

#[tauri::command]
async fn get_osm_nearby(lat: f64, lon: f64, kind: String) -> Vec<OsmPoi> {
    feeds::fetch_osm_nearby(lat, lon, &kind).await
}

#[tauri::command]
async fn get_country_context(country_code: String) -> CountryContext {
    feeds::fetch_country_context(&country_code).await
}

#[tauri::command]
async fn get_istanbul_data() -> IstanbulData {
    feeds::fetch_istanbul_data().await
}

#[tauri::command]
async fn get_radios(country_code: String, city: String) -> Vec<RadioStation> {
    feeds::fetch_radios(&country_code, &city).await
}

#[tauri::command]
async fn get_tv_channels(country_code: String) -> Vec<TvChannel> {
    feeds::fetch_tv_channels(&country_code).await
}

#[tauri::command]
async fn get_news(query: String) -> Vec<NewsItem> {
    feeds::fetch_news(&query).await
}

#[tauri::command]
async fn get_outages(country_code: String) -> Vec<OutageItem> {
    feeds::fetch_outages(&country_code).await
}

#[tauri::command]
async fn get_live_cameras() -> Vec<LiveCameraItem> {
    feeds::fetch_live_cameras().await
}

#[tauri::command]
async fn reverse_geocode(lat: f64, lon: f64) -> PlaceInfo {
    feeds::reverse_geocode(lat, lon).await
}

#[tauri::command]
async fn search_place(query: String) -> Vec<PlaceInfo> {
    feeds::search_place(&query).await
}

#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Geçersiz URL".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn save_to_downloads(filename: String, base64_data: String) -> Result<String, String> {
    let safe_name: String = filename
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_' || *c == '.')
        .collect();
    if safe_name.is_empty() {
        return Err("Geçersiz dosya adı".to_string());
    }
    let home = std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string());
    let path = std::path::PathBuf::from(home).join("Downloads").join(&safe_name);
    let raw_b64 = base64_data.split(',').last().unwrap_or(&base64_data);
    let bytes = decode_b64(raw_b64)?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

fn decode_b64(input: &str) -> Result<Vec<u8>, String> {
    let mut out = Vec::with_capacity(input.len() * 3 / 4);
    let mut buf: u32 = 0;
    let mut bits: u8 = 0;
    for b in input.bytes() {
        let val = match b {
            b'A'..=b'Z' => b - b'A',
            b'a'..=b'z' => b - b'a' + 26,
            b'0'..=b'9' => b - b'0' + 52,
            b'+' => 62,
            b'/' => 63,
            b'=' | b'\n' | b'\r' | b' ' => continue,
            _ => return Err("Base64 karakter hatası".to_string()),
        };
        buf = (buf << 6) | (val as u32);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
        }
    }
    Ok(out)
}

#[tauri::command]
async fn ai_region_brief(
    region: String,
    summary_context: String,
    endpoint: String,
    model: String,
) -> Result<String, String> {
    feeds::ai_region_brief(region, summary_context, endpoint, model).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            proxy::start_proxy_server();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_proxy_port,
            get_wind_temp_grid,
            get_cyber_threats,
            get_on_this_day,
            get_city_media_works,
            get_earthquakes,
            get_disasters,
            get_flights,
            get_military_flights,
            get_satellite_tles,
            get_kiwisdr_nodes,
            get_rainviewer_meta,
            get_forecast_rich,
            get_space_weather,
            get_ships,
            get_firms_fires,
            get_rockets,
            get_fireballs,
            get_tor_relays,
            get_wiki_nearby,
            get_inaturalist,
            get_osm_nearby,
            get_country_context,
            get_istanbul_data,
            get_radios,
            get_tv_channels,
            get_news,
            get_outages,
            get_live_cameras,
            reverse_geocode,
            search_place,
            open_external,
            save_to_downloads,
            ai_region_brief
        ])
        .run(tauri::generate_context!())
        .expect("MAOTUN başlatılırken hata oluştu");
}
