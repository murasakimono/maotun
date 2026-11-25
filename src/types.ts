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

export interface DailyWeather {
  date: string;
  temp_max: number;
  temp_min: number;
  rain_prob: number;
  weather_code: number;
  uv_max: number;
  sunrise: string;
  sunset: string;
}

export interface HourlyWeather {
  time: string;
  temp_c: number;
  rain_prob: number;
  cloud_cover: number;
}

export interface RichForecast {
  temp_c: number;
  apparent_c: number;
  wind_kmh: number;
  wind_dir: number;
  humidity: number;
  cloud_cover: number;
  weather_code: number;
  pm25: number;
  pm10: number;
  dust: number;
  pollen_grass: number;
  pollen_olive: number;
  us_aqi: number;
  sea_temp_c: number | null;
  wave_height_m: number | null;
  river_discharge: number | null;
  river_mean: number | null;
  daily: DailyWeather[];
  hourly: HourlyWeather[];
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

export interface RocketLaunch {
  id: string;
  name: string;
  provider: string;
  pad_name: string;
  lat: number;
  lon: number;
  net: string;
  status: string;
}

export interface FireballItem {
  date: string;
  lat: number;
  lon: number;
  alt_km: number;
  energy_kt: number;
  vel_kms: number;
}

export interface TorRelay {
  nickname: string;
  country: string;
  lat: number;
  lon: number;
  bandwidth_mbps: number;
}

export interface WikiPlace {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist_m: number;
  url: string;
}

export interface WildlifeObs {
  id: number;
  species: string;
  common_name: string;
  observed_on: string;
  photo_url: string;
  lat: number;
  lon: number;
}

export interface OsmPoi {
  id: number;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  extra: string;
}

export interface OoniAlert {
  domain: string;
  test_name: string;
  anomaly: boolean;
  confirmed: boolean;
  time_str: string;
}

export interface CountryContext {
  usd_try: number;
  eur_try: number;
  gbp_try: number;
  local_currency: string;
  local_to_try: number | null;
  next_holiday: string;
  ooni_alerts: OoniAlert[];
}

export interface IstanbulDam {
  name: string;
  percent: number;
}

export interface IstanbulData {
  total_dam_percent: number;
  dams: IstanbulDam[];
  note: string;
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
  kind: 'youtube' | 'hls' | 'mp4' | 'snapshot';
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

export interface DiscoveryPin {
  id: string;
  title: string;
  city: string;
  country_code: string;
  lat: number;
  lon: number;
  photoDataUrl: string;
  note: string;
  xp: number;
  gpsVerified: boolean;
  createdAt: string;
}

export interface DiscoveryQuest {
  id: string;
  title: string;
  city: string;
  country_code: string;
  lat: number;
  lon: number;
  rarity: 'Sıradan' | 'Nadir' | 'Gizli Hazine';
  baseXp: number;
  hint: string;
}

export interface LayerState {
  earthquakes: boolean;
  faults: boolean;
  disasters: boolean;
  flights: boolean;
  military: boolean;
  satellites: boolean;
  rockets: boolean;
  fireballs: boolean;
  kiwisdr: boolean;
  radar: boolean;
  aurora: boolean;
  cables: boolean;
  tor: boolean;
  railways: boolean;
  ships: boolean;
  fires: boolean;
  cameras: boolean;
  terminator: boolean;
  terrain: boolean;
  nasaGibs: boolean;
  discoveries: boolean;
}

export interface ApiKeysConfig {
  aisstreamKey: string;
  firmsKey: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  soundEnabled: boolean;
}
