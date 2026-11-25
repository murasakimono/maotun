mod feeds;
mod models;

use models::*;

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
async fn get_weather_aqi(lat: f64, lon: f64) -> WeatherAqi {
    feeds::fetch_weather_aqi(lat, lon).await
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
        .invoke_handler(tauri::generate_handler![
            get_earthquakes,
            get_disasters,
            get_flights,
            get_military_flights,
            get_satellite_tles,
            get_kiwisdr_nodes,
            get_rainviewer_meta,
            get_weather_aqi,
            get_space_weather,
            get_ships,
            get_firms_fires,
            get_radios,
            get_tv_channels,
            get_news,
            get_outages,
            get_live_cameras,
            reverse_geocode,
            search_place,
            ai_region_brief
        ])
        .run(tauri::generate_context!())
        .expect("MAOTUN başlatılırken hata oluştu");
}
