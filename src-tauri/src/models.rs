use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EarthquakeItem {
    pub id: String,
    pub title: String,
    pub mag: f64,
    pub depth_km: f64,
    pub lat: f64,
    pub lon: f64,
    pub time_str: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisasterItem {
    pub id: String,
    pub title: String,
    pub category: String,
    pub lat: f64,
    pub lon: f64,
    pub date_str: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightItem {
    pub hex: String,
    pub callsign: String,
    pub lat: f64,
    pub lon: f64,
    pub alt_ft: i64,
    pub speed_kt: f64,
    pub heading: f64,
    pub aircraft_type: String,
    pub category: String,
    pub squawk: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SatelliteTle {
    pub id: String,
    pub name: String,
    pub group: String,
    pub tle1: String,
    pub tle2: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KiwiSdrNode {
    pub name: String,
    pub url: String,
    pub lat: f64,
    pub lon: f64,
    pub users: i64,
    pub users_max: i64,
    pub bands: String,
    pub antenna: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RainViewerFrame {
    pub time: i64,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RainViewerMeta {
    pub host: String,
    pub frames: Vec<RainViewerFrame>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyWeather {
    pub date: String,
    pub temp_max: f64,
    pub temp_min: f64,
    pub rain_prob: i64,
    pub weather_code: i64,
    pub uv_max: f64,
    pub sunrise: String,
    pub sunset: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HourlyWeather {
    pub time: String,
    pub temp_c: f64,
    pub rain_prob: i64,
    pub cloud_cover: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RichForecast {
    pub temp_c: f64,
    pub apparent_c: f64,
    pub wind_kmh: f64,
    pub wind_dir: f64,
    pub humidity: f64,
    pub cloud_cover: i64,
    pub weather_code: i64,
    pub pm25: f64,
    pub pm10: f64,
    pub dust: f64,
    pub pollen_grass: f64,
    pub pollen_olive: f64,
    pub us_aqi: i64,
    pub sea_temp_c: Option<f64>,
    pub wave_height_m: Option<f64>,
    pub river_discharge: Option<f64>,
    pub river_mean: Option<f64>,
    pub daily: Vec<DailyWeather>,
    pub hourly: Vec<HourlyWeather>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuroraPoint {
    pub lon: f64,
    pub lat: f64,
    pub prob: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceWeather {
    pub kp_index: f64,
    pub kp_time: String,
    pub storm_level: String,
    pub aurora_points: Vec<AuroraPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShipItem {
    pub mmsi: String,
    pub name: String,
    pub lat: f64,
    pub lon: f64,
    pub sog: f64,
    pub cog: f64,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FireHotspot {
    pub lat: f64,
    pub lon: f64,
    pub brightness: f64,
    pub frp: f64,
    pub acq_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RocketLaunch {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub pad_name: String,
    pub lat: f64,
    pub lon: f64,
    pub net: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FireballItem {
    pub date: String,
    pub lat: f64,
    pub lon: f64,
    pub alt_km: f64,
    pub energy_kt: f64,
    pub vel_kms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TorRelay {
    pub nickname: String,
    pub country: String,
    pub lat: f64,
    pub lon: f64,
    pub bandwidth_mbps: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WikiPlace {
    pub pageid: i64,
    pub title: String,
    pub lat: f64,
    pub lon: f64,
    pub dist_m: f64,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WildlifeObs {
    pub id: i64,
    pub species: String,
    pub common_name: String,
    pub observed_on: String,
    pub photo_url: String,
    pub lat: f64,
    pub lon: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OsmPoi {
    pub id: i64,
    pub name: String,
    pub kind: String,
    pub lat: f64,
    pub lon: f64,
    pub extra: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OoniAlert {
    pub domain: String,
    pub test_name: String,
    pub anomaly: bool,
    pub confirmed: bool,
    pub time_str: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CountryContext {
    pub usd_try: f64,
    pub eur_try: f64,
    pub gbp_try: f64,
    pub local_currency: String,
    pub local_to_try: Option<f64>,
    pub next_holiday: String,
    pub ooni_alerts: Vec<OoniAlert>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IstanbulDam {
    pub name: String,
    pub percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IstanbulData {
    pub total_dam_percent: f64,
    pub dams: Vec<IstanbulDam>,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RadioStation {
    pub id: String,
    pub name: String,
    pub country: String,
    pub tags: String,
    pub stream_url: String,
    pub bitrate: i64,
    pub favicon: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TvChannel {
    pub name: String,
    pub group: String,
    pub logo: String,
    pub stream_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsItem {
    pub title: String,
    pub url: String,
    pub domain: String,
    pub seendate: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutageItem {
    pub entity: String,
    pub datasource: String,
    pub level: String,
    pub time_str: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaceInfo {
    pub display_name: String,
    pub city: String,
    pub country: String,
    pub country_code: String,
    pub lat: f64,
    pub lon: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveCameraItem {
    pub id: String,
    pub name: String,
    pub city: String,
    pub country_code: String,
    pub lat: f64,
    pub lon: f64,
    pub kind: String,
    pub embed_url: String,
    pub refresh_sec: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindTempPoint {
    pub lat: f64,
    pub lon: f64,
    pub temp_c: f64,
    pub wind_kmh: f64,
    pub wind_dir: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CyberThreat {
    pub ip: String,
    pub malware: String,
    pub port: i64,
    pub country: String,
    pub lat: f64,
    pub lon: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEvent {
    pub year: i64,
    pub text: String,
    pub title: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaWork {
    pub title: String,
    pub kind: String,
    pub year: String,
    pub url: String,
}
