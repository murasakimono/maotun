import * as satellite from 'satellite.js';
import type { SatelliteLive, SatelliteTle } from './types';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// 1. Real-Time Solar Terminator (Night Hemisphere Polygon GeoJSON)
export function buildSolarTerminatorGeoJSON(date = new Date()): GeoJSON.FeatureCollection {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const epsilon = (23.439 - 0.0000004 * n) * RAD;
  const dec = Math.asin(Math.sin(epsilon) * Math.sin(lambda));

  // Subsolar longitude
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let subsolarLon = (12 - utcHours) * 15;
  if (subsolarLon > 180) subsolarLon -= 360;
  if (subsolarLon < -180) subsolarLon += 360;

  const coords: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += 3) {
    const ha = (lon - subsolarLon) * RAD;
    const tanDec = Math.tan(dec);
    const lat =
      Math.abs(tanDec) < 1e-6
        ? 0
        : Math.atan(-Math.cos(ha) / tanDec) * DEG;
    coords.push([lon, Math.max(-85, Math.min(85, lat))]);
  }

  const nightPoleLat = dec > 0 ? -89.5 : 89.5;
  const ring: [number, number][] = [
    ...coords,
    [180, nightPoleLat],
    [-180, nightPoleLat],
    coords[0],
  ];

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Night Terminator' },
        geometry: { type: 'Polygon', coordinates: [ring] },
      },
    ],
  };
}

// 2. Real SGP4 Satellite Propagation via satellite.js
export function propagateSatellites(tles: SatelliteTle[], date = new Date()): SatelliteLive[] {
  const gmst = satellite.gstime(date);
  const out: SatelliteLive[] = [];
  for (const t of tles) {
    try {
      const satrec = satellite.twoline2satrec(t.tle1, t.tle2);
      const pv = satellite.propagate(satrec, date);
      if (!pv || typeof pv.position === 'boolean' || !pv.position) continue;
      const gd = satellite.eciToGeodetic(pv.position, gmst);
      const lat = satellite.degreesLat(gd.latitude);
      const lon = satellite.degreesLong(gd.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      let velKmh = 27500;
      if (pv.velocity && typeof pv.velocity !== 'boolean') {
        const v = pv.velocity;
        velKmh = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) * 3600;
      }
      out.push({
        id: t.id,
        name: t.name,
        group: t.group,
        lat,
        lon,
        alt_km: gd.height,
        velocity_kmh: velKmh,
        tle1: t.tle1,
        tle2: t.tle2,
      });
    } catch {
      // skip malformed TLE
    }
  }
  return out;
}

// 3. 90-Minute Real Ground Track Orbit Path for a Selected Satellite
export function computeOrbitPathGeoJSON(sat: SatelliteLive): GeoJSON.FeatureCollection {
  const segments: [number, number][][] = [[]];
  try {
    const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);
    const now = Date.now();
    let prevLon: number | null = null;
    for (let m = -15; m <= 90; m += 2) {
      const d = new Date(now + m * 60_000);
      const pv = satellite.propagate(satrec, d);
      if (!pv || typeof pv.position === 'boolean' || !pv.position) continue;
      const gd = satellite.eciToGeodetic(pv.position, satellite.gstime(d));
      const lat = satellite.degreesLat(gd.latitude);
      const lon = satellite.degreesLong(gd.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      // Split line across antimeridian so it doesn't wrap across the entire map
      if (prevLon !== null && Math.abs(lon - prevLon) > 180) {
        segments.push([]);
      }
      segments[segments.length - 1].push([lon, lat]);
      prevLon = lon;
    }
  } catch {
    // ignore
  }

  return {
    type: 'FeatureCollection',
    features: segments
      .filter((s) => s.length >= 2)
      .map((coords) => ({
        type: 'Feature',
        properties: { name: sat.name },
        geometry: { type: 'LineString', coordinates: coords },
      })),
  };
}

// 4. Major Global Submarine Fiber Optic Cables (TeleGeography inspired backbone)
export const SUBMARINE_CABLES_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'SEA-ME-WE 5 (Avrupa-Orta Doğu-Asya)', capacity: '24 Tbps' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [5.37, 43.3], [15.1, 37.5], [27.1, 36.2], [32.3, 31.2], [35.0, 27.5],
          [39.1, 21.5], [43.3, 12.6], [58.5, 23.6], [72.8, 19.0], [79.8, 6.9],
          [100.3, 5.4], [103.8, 1.3],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'MedNautilus (İstanbul–Atina–Sicilya–İsrail)', capacity: '3.8 Tbps' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [28.97, 41.01], [26.2, 39.4], [23.7, 37.9], [15.2, 37.5], [24.0, 35.5], [34.7, 32.0],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'MAREA (Virginia–Bilbao Transatlantik)', capacity: '200 Tbps' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-75.9, 36.8], [-58.0, 40.5], [-38.0, 43.2], [-18.0, 44.1], [-2.9, 43.3],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Grace Hopper (NY–Bude–Bilbao)', capacity: '350 Tbps' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-73.2, 40.7], [-50.0, 45.8], [-25.0, 49.5], [-4.5, 50.8],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'FASTER (Oregon–Chikura Transpasifik)', capacity: '60 Tbps' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-124.5, 43.1], [-145.0, 46.5], [-170.0, 45.0], [-179.9, 43.0],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'FASTER-W (Pasifik Batı Kolu)', capacity: '60 Tbps' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [179.9, 43.0], [160.0, 39.5], [140.0, 35.0], [136.8, 34.4],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: '2Africa (Avrupa–Afrika–Körfez Çemberi)', capacity: '180 Tbps' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-5.4, 50.1], [-9.1, 38.7], [-17.4, 14.7], [3.3, 6.4], [18.4, -33.9],
          [32.5, -25.9], [39.6, -4.0], [45.3, 2.0], [43.1, 11.6], [32.5, 29.9], [14.2, 40.8],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'KAFOS (Karadeniz Fiber Hattı)', capacity: '1.2 Tbps' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [29.05, 41.2], [28.0, 43.2], [28.6, 44.2], [39.7, 43.5], [41.6, 41.6],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'SAm-1 (Güney Amerika Ring)', capacity: '32 Tbps' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-80.1, 25.8], [-66.1, 18.5], [-38.5, -3.7], [-43.2, -22.9], [-58.4, -34.6],
          [-71.6, -33.0], [-77.0, -12.0], [-79.5, 8.9],
        ],
      },
    },
  ],
};

// 5. Turkey Active Fault Lines (KAF / DAF / Ege / Ölü Deniz)
export const TURKEY_FAULTS_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Kuzey Anadolu Fay Hattı (KAF)' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [26.2, 40.55], [27.3, 40.75], [28.4, 40.82], [29.4, 40.72], [30.4, 40.75],
          [31.5, 40.78], [32.6, 40.85], [34.2, 40.98], [35.8, 40.82], [37.5, 40.42],
          [39.5, 39.75], [41.1, 39.2],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Doğu Anadolu Fay Hattı (DAF)' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [41.1, 39.2], [40.2, 38.85], [39.1, 38.48], [38.2, 38.05],
          [37.2, 37.55], [36.6, 37.1], [36.2, 36.4], [36.0, 36.1],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Ölü Deniz Fay Zonu' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [36.2, 36.4], [36.35, 35.5], [35.9, 34.0], [35.5, 32.5], [35.2, 30.5],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Batı Anadolu / Ege Graben Sistemi' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [26.8, 38.45], [27.6, 38.4], [28.4, 38.2], [29.1, 37.85], [27.2, 37.85], [27.4, 37.05],
        ],
      },
    },
  ],
};
