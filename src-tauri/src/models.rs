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
    pub source: String, // "KANDİLLİ" | "USGS"
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SatelliteItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub lat: f64,
    pub lon: f64,
    pub alt_km: f64,
    pub velocity_kmh: f64,
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
    pub country_code: String, // "TR", "JP", "US"
    pub lat: f64,
    pub lon: f64,
}
