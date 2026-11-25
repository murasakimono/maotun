import * as satellite from 'satellite.js';
import type { SatelliteLive, SatelliteTle } from './types';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 1. Real-Time Solar Terminator (Night Hemisphere Polygon)
export function buildSolarTerminatorGeoJSON(date = new Date()): GeoJSON.FeatureCollection {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const epsilon = (23.439 - 0.0000004 * n) * RAD;
  const dec = Math.asin(Math.sin(epsilon) * Math.sin(lambda));

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
      Math.abs(tanDec) < 1e-6 ? 0 : Math.atan(-Math.cos(ha) / tanDec) * DEG;
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

// 2. Geodesic Circle Polygon (Earthquake Felt Radius Ring)
export function buildCircleGeoJSON(lat: number, lon: number, radiusKm: number): GeoJSON.FeatureCollection {
  const pts: [number, number][] = [];
  const steps = 64;
  const angDist = radiusKm / 6371;
  const latR = lat * RAD;
  const lonR = lon * RAD;

  for (let i = 0; i <= steps; i++) {
    const brng = (i / steps) * Math.PI * 2;
    const pLat = Math.asin(
      Math.sin(latR) * Math.cos(angDist) +
        Math.cos(latR) * Math.sin(angDist) * Math.cos(brng)
    );
    const pLon =
      lonR +
      Math.atan2(
        Math.sin(brng) * Math.sin(angDist) * Math.cos(latR),
        Math.cos(angDist) - Math.sin(latR) * Math.sin(pLat)
      );
    pts.push([pLon * DEG, pLat * DEG]);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { radiusKm },
        geometry: { type: 'Polygon', coordinates: [pts] },
      },
    ],
  };
}

// 3. 2-Point Great Circle Arc GeoJSON
export function buildGreatCircleArcGeoJSON(
  p1: { lat: number; lon: number },
  p2: { lat: number; lon: number }
): GeoJSON.FeatureCollection {
  const coords: [number, number][] = [];
  const lat1 = p1.lat * RAD;
  const lon1 = p1.lon * RAD;
  const lat2 = p2.lat * RAD;
  const lon2 = p2.lon * RAD;
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
      )
    );

  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    if (d < 1e-6) {
      coords.push([p1.lon, p1.lat]);
      continue;
    }
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * DEG;
    const lon = Math.atan2(y, x) * DEG;
    coords.push([lon, lat]);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      },
    ],
  };
}

// 4. Golden Hour, Moon Phase & Stargazing Score
export function computeAstroInfo(sunriseIso?: string, sunsetIso?: string, cloudCover = 30) {
  const synodic = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const days = (Date.now() - knownNewMoon) / 86400000;
  const phase = ((days % synodic) + synodic) % synodic;
  const illum = Math.round(((1 - Math.cos((phase / synodic) * 2 * Math.PI)) / 2) * 100);
  const phaseName =
    phase < 1.8
      ? 'Yeni Ay'
      : phase < 7.4
      ? 'Hilal (Büyüyen)'
      : phase < 11.1
      ? 'İlk Dördün'
      : phase < 14.8
      ? 'Şişkin Ay'
      : phase < 16.6
      ? 'Dolunay'
      : phase < 22.1
      ? 'Küçülen Ay'
      : 'Son Dördün';

  const shiftMin = (iso: string | undefined, deltaMin: number) => {
    if (!iso || iso.length < 16) return '--:--';
    const hh = Number(iso.slice(11, 13));
    const mm = Number(iso.slice(14, 16));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return '--:--';
    const total = (hh * 60 + mm + deltaMin + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const starScore = Math.max(0, Math.min(100, Math.round((100 - cloudCover) * 0.78 + (100 - illum) * 0.22)));
  return {
    sunrise: sunriseIso?.slice(11, 16) || '--:--',
    sunset: sunsetIso?.slice(11, 16) || '--:--',
    goldenEvening: `${shiftMin(sunsetIso, -45)}–${shiftMin(sunsetIso, 10)}`,
    blueEvening: `${shiftMin(sunsetIso, 10)}–${shiftMin(sunsetIso, 38)}`,
    moonPhase: phaseName,
    moonIllum: illum,
    starScore,
  };
}

// 5. Pure JS Binary JPEG EXIF GPS Extractor (for verified Discovery photo check-ins!)
export async function extractExifGps(file: File): Promise<{ lat: number; lon: number } | null> {
  try {
    const buf = await file.slice(0, 131072).arrayBuffer();
    const view = new DataView(buf);
    if (view.byteLength < 12 || view.getUint16(0, false) !== 0xffd8) return null;
    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xffe1) {
        if (view.getUint32(offset + 2, false) !== 0x45786966) return null; // "Exif"
        const tiff = offset + 8;
        const little = view.getUint16(tiff, false) === 0x4949;
        const firstIfd = view.getUint32(tiff + 4, little);
        const entries = view.getUint16(tiff + firstIfd, little);
        let gpsOffset = 0;
        for (let i = 0; i < entries; i++) {
          const ent = tiff + firstIfd + 2 + i * 12;
          if (view.getUint16(ent, little) === 0x8825) {
            gpsOffset = view.getUint32(ent + 8, little);
            break;
          }
        }
        if (!gpsOffset) return null;
        const gpsCount = view.getUint16(tiff + gpsOffset, little);
        let latRef = 'N';
        let lonRef = 'E';
        let latVal: number | null = null;
        let lonVal: number | null = null;
        const readDms = (valOff: number) => {
          const d = view.getUint32(tiff + valOff, little) / (view.getUint32(tiff + valOff + 4, little) || 1);
          const m = view.getUint32(tiff + valOff + 8, little) / (view.getUint32(tiff + valOff + 12, little) || 1);
          const s = view.getUint32(tiff + valOff + 16, little) / (view.getUint32(tiff + valOff + 20, little) || 1);
          return d + m / 60 + s / 3600;
        };
        for (let i = 0; i < gpsCount; i++) {
          const ent = tiff + gpsOffset + 2 + i * 12;
          const tag = view.getUint16(ent, little);
          if (tag === 1) latRef = String.fromCharCode(view.getUint8(ent + 8));
          if (tag === 2) latVal = readDms(view.getUint32(ent + 8, little));
          if (tag === 3) lonRef = String.fromCharCode(view.getUint8(ent + 8));
          if (tag === 4) lonVal = readDms(view.getUint32(ent + 8, little));
        }
        if (latVal !== null && lonVal !== null) {
          return {
            lat: latRef === 'S' ? -latVal : latVal,
            lon: lonRef === 'W' ? -lonVal : lonVal,
          };
        }
        return null;
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else {
        offset += view.getUint16(offset, false);
      }
    }
  } catch {
    return null;
  }
  return null;
}

// 6. SGP4 Satellite Propagation
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
      // skip
    }
  }
  return out;
}

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
      if (prevLon !== null && Math.abs(lon - prevLon) > 180) segments.push([]);
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

export const SUBMARINE_CABLES_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'SEA-ME-WE 5 (Avrupa–Orta Doğu–Asya)', capacity: '24 Tbps' },
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
        coordinates: [[-75.9, 36.8], [-58.0, 40.5], [-38.0, 43.2], [-18.0, 44.1], [-2.9, 43.3]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Grace Hopper (NY–Bude–Bilbao)', capacity: '350 Tbps' },
      geometry: {
        type: 'LineString',
        coordinates: [[-73.2, 40.7], [-50.0, 45.8], [-25.0, 49.5], [-4.5, 50.8]],
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
        coordinates: [[29.05, 41.2], [28.0, 43.2], [28.6, 44.2], [39.7, 43.5], [41.6, 41.6]],
      },
    },
  ],
};

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
        coordinates: [[36.2, 36.4], [36.35, 35.5], [35.9, 34.0], [35.5, 32.5], [35.2, 30.5]],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Batı Anadolu / Ege Graben Sistemi' },
      geometry: {
        type: 'LineString',
        coordinates: [[26.8, 38.45], [27.6, 38.4], [28.4, 38.2], [29.1, 37.85], [27.2, 37.85], [27.4, 37.05]],
      },
    },
  ],
};

export function weatherCodeText(code: number): string {
  if (code === 0) return 'Açık';
  if (code <= 2) return 'Az Bulutlu';
  if (code === 3) return 'Kapalı';
  if (code <= 48) return 'Sisli';
  if (code <= 57) return 'Çiseleme';
  if (code <= 67) return 'Yağmurlu';
  if (code <= 77) return 'Kar Yağışlı';
  if (code <= 82) return 'Sağanak';
  if (code >= 95) return 'Gök Gürültülü';
  return 'Değişken';
}
