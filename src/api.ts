import { invoke } from '@tauri-apps/api/core';
import type {
  CountryContext,
  CyberThreat,
  DisasterItem,
  EarthquakeItem,
  FireballItem,
  FireHotspot,
  FlightItem,
  HistoryEvent,
  IstanbulData,
  KiwiSdrNode,
  LiveCamera,
  MediaWork,
  NewsItem,
  OsmPoi,
  OutageItem,
  PlaceInfo,
  RadioStation,
  RainViewerMeta,
  RichForecast,
  RocketLaunch,
  SatelliteTle,
  ShipItem,
  SpaceWeather,
  TorRelay,
  TvChannel,
  WikiPlace,
  WildlifeObs,
  WindTempPoint,
} from './types';

export const api = {
  getProxyPort: () => invoke<number>('get_proxy_port'),
  getWindTempGrid: () => invoke<WindTempPoint[]>('get_wind_temp_grid'),
  getCyberThreats: () => invoke<CyberThreat[]>('get_cyber_threats'),
  getOnThisDay: () => invoke<HistoryEvent[]>('get_on_this_day'),
  getCityMediaWorks: (city: string) => invoke<MediaWork[]>('get_city_media_works', { city }),
  getEarthquakes: () => invoke<EarthquakeItem[]>('get_earthquakes'),
  getDisasters: () => invoke<DisasterItem[]>('get_disasters'),
  getFlights: (lat: number, lon: number, radiusNm = 200) =>
    invoke<FlightItem[]>('get_flights', { lat, lon, radiusNm }),
  getMilitaryFlights: () => invoke<FlightItem[]>('get_military_flights'),
  getSatelliteTles: () => invoke<SatelliteTle[]>('get_satellite_tles'),
  getKiwiSdrNodes: () => invoke<KiwiSdrNode[]>('get_kiwisdr_nodes'),
  getRainViewerMeta: () => invoke<RainViewerMeta>('get_rainviewer_meta'),
  getForecastRich: (lat: number, lon: number) =>
    invoke<RichForecast>('get_forecast_rich', { lat, lon }),
  getSpaceWeather: () => invoke<SpaceWeather>('get_space_weather'),
  getShips: () => invoke<ShipItem[]>('get_ships'),
  getFirmsFires: (mapKey: string) =>
    invoke<FireHotspot[]>('get_firms_fires', { mapKey }),
  getRockets: () => invoke<RocketLaunch[]>('get_rockets'),
  getFireballs: () => invoke<FireballItem[]>('get_fireballs'),
  getTorRelays: () => invoke<TorRelay[]>('get_tor_relays'),
  getWikiNearby: (lat: number, lon: number, countryCode: string) =>
    invoke<WikiPlace[]>('get_wiki_nearby', { lat, lon, countryCode }),
  getInaturalist: (lat: number, lon: number) =>
    invoke<WildlifeObs[]>('get_inaturalist', { lat, lon }),
  getOsmNearby: (lat: number, lon: number, kind: string) =>
    invoke<OsmPoi[]>('get_osm_nearby', { lat, lon, kind }),
  getCountryContext: (countryCode: string) =>
    invoke<CountryContext>('get_country_context', { countryCode }),
  getIstanbulData: () => invoke<IstanbulData>('get_istanbul_data'),
  getRadios: (countryCode: string, city: string) =>
    invoke<RadioStation[]>('get_radios', { countryCode, city }),
  getTvChannels: (countryCode: string) =>
    invoke<TvChannel[]>('get_tv_channels', { countryCode }),
  getNews: (query: string) => invoke<NewsItem[]>('get_news', { query }),
  getOutages: (countryCode: string) =>
    invoke<OutageItem[]>('get_outages', { countryCode }),
  getLiveCameras: () => invoke<LiveCamera[]>('get_live_cameras'),
  reverseGeocode: (lat: number, lon: number) =>
    invoke<PlaceInfo>('reverse_geocode', { lat, lon }),
  searchPlace: (query: string) => invoke<PlaceInfo[]>('search_place', { query }),
  openExternal: (url: string) => invoke<void>('open_external', { url }),
  saveToDownloads: (filename: string, base64Data: string) =>
    invoke<string>('save_to_downloads', { filename, base64Data }),
  aiRegionBrief: (
    region: string,
    summaryContext: string,
    endpoint: string,
    model: string
  ) =>
    invoke<string>('ai_region_brief', {
      region,
      summaryContext,
      endpoint,
      model,
    }),
};
