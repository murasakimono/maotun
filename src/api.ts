import { invoke } from '@tauri-apps/api/core';
import type {
  DisasterItem,
  EarthquakeItem,
  FlightItem,
  NewsItem,
  OutageItem,
  PlaceInfo,
  RadioStation,
  SatelliteItem,
  TvChannel,
} from './types';

export const apiGetEarthquakes = () => invoke<EarthquakeItem[]>('get_earthquakes');
export const apiGetDisasters = () => invoke<DisasterItem[]>('get_disasters');
export const apiGetFlights = (lat: number, lon: number, radiusNm = 180) =>
  invoke<FlightItem[]>('get_flights', { lat, lon, radiusNm });
export const apiGetSatellites = () => invoke<SatelliteItem[]>('get_satellites');
export const apiGetRadios = (countryCode: string, city: string) =>
  invoke<RadioStation[]>('get_radios', { countryCode, city });
export const apiGetTvChannels = (countryCode: string) =>
  invoke<TvChannel[]>('get_tv_channels', { countryCode });
export const apiGetNews = (query: string) => invoke<NewsItem[]>('get_news', { query });
export const apiGetOutages = (countryCode: string) =>
  invoke<OutageItem[]>('get_outages', { countryCode });
export const apiReverseGeocode = (lat: number, lon: number) =>
  invoke<PlaceInfo>('reverse_geocode', { lat, lon });
export const apiSearchPlace = (query: string) => invoke<PlaceInfo[]>('search_place', { query });
export const apiAiRegionBrief = (
  region: string,
  summaryContext: string,
  endpoint: string,
  model: string
) => invoke<string>('ai_region_brief', { region, summaryContext, endpoint, model });
