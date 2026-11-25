export interface EarthquakeItem {
  id: string;
  title: string;
  mag: number;
  depth_km: number;
  lat: number;
  lon: number;
  time_str: string;
  source: 'KANDİLLİ' | 'AFAD' | 'USGS' | string;
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
  category: 'CIVIL' | 'MIL' | 'LADD' | 'PIA' | string;
  squawk: string;
}

export interface SatelliteTle {
  id: string;
  name: string;
  group: 'STATION' | 'WEATHER' | 'GPS' | 'STARLINK' | string;
  tle1: string;
  tle2: string;
}

export interface SatelliteLive {
  id: string;
  name: string;
  group: string;
  lat: number;
  lon: number;
  alt_km: number;
  velocity_kmh: number;
  tle1: string;
  tle2: string;
}

export interface KiwiSdrNode {
  name: string;
  url: string;
  lat: number;
  lon: number;
  users: number;
  users_max: number;
  bands: string;
  antenna: string;
}

export interface RainViewerFrame {
  time: number;
  path: string;
}

export interface RainViewerMeta {
  host: string;
  frames: RainViewerFrame[];
}

export interface WeatherAqi {
  temp_c: number;
  wind_kmh: number;
  wind_dir: number;
  humidity: number;
  pm25: number;
  pm10: number;
  co: number;
  us_aqi: number;
}

export interface AuroraPoint {
  lon: number;
  lat: number;
  prob: number;
}

export interface SpaceWeather {
  kp_index: number;
  kp_time: string;
  storm_level: string;
  aurora_points: AuroraPoint[];
}

export interface ShipItem {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
  source: string;
}

export interface FireHotspot {
  lat: number;
  lon: number;
  brightness: number;
  frp: number;
  acq_date: string;
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
  kind: 'youtube' | 'hls' | 'snapshot';
  embed_url: string;
  refresh_sec?: number;
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
  faults: boolean;
  disasters: boolean;
  flights: boolean;
  military: boolean;
  satellites: boolean;
  kiwisdr: boolean;
  radar: boolean;
  aurora: boolean;
  cables: boolean;
  ships: boolean;
  fires: boolean;
  cameras: boolean;
  terminator: boolean;
  terrain: boolean;
}

export interface ApiKeysConfig {
  aisstreamKey: string;
  firmsKey: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  soundEnabled: boolean;
}
