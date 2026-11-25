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
    pub source: String, // "KANDİLLİ" | "AFAD" | "USGS"
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
    pub category: String, // "CIVIL" | "MIL" | "LADD" | "PIA"
    pub squawk: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SatelliteTle {
    pub id: String,
    pub name: String,
    pub group: String, // "STATION" | "WEATHER" | "GPS" | "STARLINK"
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
pub struct WeatherAqi {
    pub temp_c: f64,
    pub wind_kmh: f64,
    pub wind_dir: f64,
    pub humidity: f64,
    pub pm25: f64,
    pub pm10: f64,
    pub co: f64,
    pub us_aqi: i64,
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
