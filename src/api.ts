import { invoke } from '@tauri-apps/api/core';
import type {
  DisasterItem,
  EarthquakeItem,
  FireHotspot,
  FlightItem,
  KiwiSdrNode,
  LiveCamera,
  NewsItem,
  OutageItem,
  PlaceInfo,
  RadioStation,
  RainViewerMeta,
  SatelliteTle,
  ShipItem,
  SpaceWeather,
  TvChannel,
  WeatherAqi,
} from './types';

export const api = {
  getEarthquakes: () => invoke<EarthquakeItem[]>('get_earthquakes'),
  getDisasters: () => invoke<DisasterItem[]>('get_disasters'),
  getFlights: (lat: number, lon: number, radiusNm = 200) =>
    invoke<FlightItem[]>('get_flights', { lat, lon, radiusNm }),
  getMilitaryFlights: () => invoke<FlightItem[]>('get_military_flights'),
  getSatelliteTles: () => invoke<SatelliteTle[]>('get_satellite_tles'),
  getKiwiSdrNodes: () => invoke<KiwiSdrNode[]>('get_kiwisdr_nodes'),
  getRainViewerMeta: () => invoke<RainViewerMeta>('get_rainviewer_meta'),
  getWeatherAqi: (lat: number, lon: number) =>
    invoke<WeatherAqi>('get_weather_aqi', { lat, lon }),
  getSpaceWeather: () => invoke<SpaceWeather>('get_space_weather'),
  getShips: () => invoke<ShipItem[]>('get_ships'),
  getFirmsFires: (mapKey: string) =>
    invoke<FireHotspot[]>('get_firms_fires', { mapKey }),
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
