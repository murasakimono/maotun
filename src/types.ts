export interface EarthquakeItem {
  id: string;
  title: string;
  mag: number;
  depth_km: number;
  lat: number;
  lon: number;
  time_str: string;
  source: 'KANDİLLİ' | 'USGS' | string;
}

export interface DisasterItem {
  id: string;
  title: string;
  category: string;
  lat: number;
  lon: number;
  date_str: string;
}

export interface FlightItem {
  hex: string;
  callsign: string;
  lat: number;
  lon: number;
  alt_ft: number;
  speed_kt: number;
  heading: number;
  aircraft_type: string;
}

export interface SatelliteItem {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  alt_km: number;
  velocity_kmh: number;
}

export interface RadioStation {
  id: string;
  name: string;
  country: string;
  tags: string;
  stream_url: string;
  bitrate: number;
  favicon: string;
}

export interface TvChannel {
  name: string;
  group: string;
  logo: string;
  stream_url: string;
}

export interface NewsItem {
  title: string;
  url: string;
  domain: string;
  seendate: string;
}

export interface OutageItem {
  entity: string;
  datasource: string;
  level: string;
  time_str: string;
}

export interface PlaceInfo {
  display_name: string;
  city: string;
  country: string;
  country_code: string;
  lat: number;
  lon: number;
}

export interface LiveCamera {
  id: string;
  name: string;
  city: string;
  country_code: string;
  lat: number;
  lon: number;
  kind: 'youtube' | 'hls';
  embed_url: string;
}

export interface AlertRule {
  id: string;
  label: string;
  keyword: string;
  minMag: number;
  enabled: boolean;
}

export interface LayerState {
  earthquakes: boolean;
  disasters: boolean;
  flights: boolean;
  satellites: boolean;
  cameras: boolean;
}
