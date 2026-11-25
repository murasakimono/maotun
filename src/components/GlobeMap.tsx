import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Compass, Minus, Mountain, Plus } from 'lucide-react';
import type {
  AuroraPoint,
  CyberThreat,
  DisasterItem,
  DiscoveryPin,
  EarthquakeItem,
  FireballItem,
  FireHotspot,
  FlightItem,
  KiwiSdrNode,
  LayerState,
  LiveCamera,
  OsmPoi,
  RocketLaunch,
  SatelliteLive,
  ShipItem,
  TorRelay,
  WindTempPoint,
} from '../types';
import {
  buildCircleGeoJSON,
  buildGreatCircleArcGeoJSON,
  buildSolarTerminatorGeoJSON,
  computeOrbitPathGeoJSON,
  SUBMARINE_CABLES_GEOJSON,
  TURKEY_FAULTS_GEOJSON,
} from '../geo';
import { MAJOR_AIRPORTS, type MajorAirport } from '../data/airports';
import { TURKEY_81 } from '../data/turkey81';
import { sound } from '../sound';

interface GlobeMapProps {
  earthquakes: EarthquakeItem[];
  selectedEq: EarthquakeItem | null;
  onSelectEq: (eq: EarthquakeItem | null) => void;
  disasters: DisasterItem[];
  flights: FlightItem[];
  militaryFlights: FlightItem[];
  satellites: SatelliteLive[];
  selectedSat: SatelliteLive | null;
  onSelectSat: (sat: SatelliteLive | null) => void;
  rockets: RocketLaunch[];
  fireballs: FireballItem[];
  torRelays: TorRelay[];
  cyberThreats: CyberThreat[];
  kiwisdr: KiwiSdrNode[];
  auroraPoints: AuroraPoint[];
  ships: ShipItem[];
  fires: FireHotspot[];
  cameras: LiveCamera[];
  osmPois: OsmPoi[];
  discoveries: DiscoveryPin[];
  windTempGrid: WindTempPoint[];
  visitedPlakas: string[];
  measurePts: { lat: number; lon: number }[];
  measureMode: boolean;
  layers: LayerState;
  radarTileUrl: string | null;
  nasaGibsDate: string;
  flyTarget: { lat: number; lon: number; zoom?: number; ts: number } | null;
  onSelectCoord: (lat: number, lon: number) => void;
  onSelectCamera: (cam: LiveCamera) => void;
  onSelectAirport: (ap: MajorAirport) => void;
  onCursorMove: (lat: number, lon: number, zoom: number) => void;
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

function createPlaneImage(): ImageData {
  const size = 32;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#FFFFFF';
  g.beginPath();
  g.moveTo(16, 2);
  g.lineTo(19, 11);
  g.lineTo(30, 17);
  g.lineTo(30, 20);
  g.lineTo(19, 17);
  g.lineTo(19, 25);
  g.lineTo(24, 28);
  g.lineTo(24, 30);
  g.lineTo(16, 28);
  g.lineTo(8, 30);
  g.lineTo(8, 28);
  g.lineTo(13, 25);
  g.lineTo(13, 17);
  g.lineTo(2, 20);
  g.lineTo(2, 17);
  g.lineTo(13, 11);
  g.closePath();
  g.fill();
  return g.getImageData(0, 0, size, size);
}

export function GlobeMap({
  earthquakes,
  selectedEq,
  onSelectEq,
  disasters,
  flights,
  militaryFlights,
  satellites,
  selectedSat,
  onSelectSat,
  rockets,
  fireballs,
  torRelays,
  cyberThreats,
  kiwisdr,
  auroraPoints,
  ships,
  fires,
  cameras,
  osmPois,
  discoveries,
  windTempGrid,
  visitedPlakas,
  measurePts,
  measureMode,
  layers,
  radarTileUrl,
  nasaGibsDate,
  flyTarget,
  onSelectCoord,
  onSelectCamera,
  onSelectAirport,
  onCursorMove,
}: GlobeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const windCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const trailsRef = useRef<Map<string, [number, number][]>>(new Map());

  const satsRef = useRef(satellites);
  satsRef.current = satellites;
  const camsRef = useRef(cameras);
  camsRef.current = cameras;
  const eqsRef = useRef(earthquakes);
  eqsRef.current = earthquakes;
  const measureModeRef = useRef(measureMode);
  measureModeRef.current = measureMode;

  // Fresh callback refs so map.on('click') / mousemove NEVER hit stale closures!
  const onSelectCoordRef = useRef(onSelectCoord);
  onSelectCoordRef.current = onSelectCoord;
  const onSelectCameraRef = useRef(onSelectCamera);
  onSelectCameraRef.current = onSelectCamera;
  const onSelectAirportRef = useRef(onSelectAirport);
  onSelectAirportRef.current = onSelectAirport;
  const onSelectEqRef = useRef(onSelectEq);
  onSelectEqRef.current = onSelectEq;
  const onSelectSatRef = useRef(onSelectSat);
  onSelectSatRef.current = onSelectSat;
  const onCursorMoveRef = useRef(onCursorMove);
  onCursorMoveRef.current = onCursorMove;
  const lastMoveTsRef = useRef(0);

  // Initialize MapLibre v5 3D Globe
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [32.5, 38.8],
      zoom: 3.15,
      pitch: 14,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('style.load', () => {
      try {
        map.setProjection({ type: 'globe' });
      } catch {
        // fallback
      }

      if (!map.hasImage('plane-sdf')) {
        map.addImage('plane-sdf', createPlaneImage(), { sdf: true });
      }

      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
      });

      // Temperature Heatmap
      map.addSource('temp-heat', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'temp-heat-layer',
        type: 'circle',
        source: 'temp-heat',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 34, 6, 70],
          'circle-blur': 1,
          'circle-opacity': 0.34,
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'temp_c'],
            -5, '#38BDF8',
            8, '#22D3EE',
            16, '#4ADE80',
            24, '#E5A952',
            34, '#EF4444',
          ],
        },
      });

      // Solar Terminator
      map.addSource('terminator', { type: 'geojson', data: buildSolarTerminatorGeoJSON() });
      map.addLayer({
        id: 'terminator-fill',
        type: 'fill',
        source: 'terminator',
        paint: { 'fill-color': '#030509', 'fill-opacity': 0.42 },
      });
      map.addLayer({
        id: 'terminator-line',
        type: 'line',
        source: 'terminator',
        paint: { 'line-color': '#E5A952', 'line-width': 1, 'line-opacity': 0.4, 'line-dasharray': [4, 4] },
      });

      // OpenRailwayMap
      map.addSource('railways-src', {
        type: 'raster',
        tiles: ['https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 16,
      });
      map.addLayer({
        id: 'railways-layer',
        type: 'raster',
        source: 'railways-src',
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 0.78 },
      });

      // Submarine Cables & TR Faults
      map.addSource('cables', { type: 'geojson', data: SUBMARINE_CABLES_GEOJSON });
      map.addLayer({
        id: 'cables-line',
        type: 'line',
        source: 'cables',
        paint: { 'line-color': '#60A5FA', 'line-width': 1.4, 'line-opacity': 0.48, 'line-dasharray': [3, 2] },
      });

      map.addSource('faults', { type: 'geojson', data: TURKEY_FAULTS_GEOJSON });
      map.addLayer({
        id: 'faults-line',
        type: 'line',
        source: 'faults',
        paint: { 'line-color': '#E85D4A', 'line-width': 1.8, 'line-opacity': 0.65, 'line-dasharray': [2, 2] },
      });

      // 81-Province Turkey Fog of War Layer
      map.addSource('turkey-fog', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'turkey-fog-glow',
        type: 'circle',
        source: 'turkey-fog',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['case', ['get', 'visited'], 18, 6],
          'circle-color': ['case', ['get', 'visited'], '#E5A952', '#374151'],
          'circle-opacity': ['case', ['get', 'visited'], 0.35, 0.3],
          'circle-blur': ['case', ['get', 'visited'], 0.6, 0],
        },
      });
      map.addLayer({
        id: 'turkey-fog-pt',
        type: 'circle',
        source: 'turkey-fog',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['case', ['get', 'visited'], 6, 3],
          'circle-color': ['case', ['get', 'visited'], '#FBBF24', '#6B7280'],
          'circle-stroke-color': '#090B0E',
          'circle-stroke-width': 1,
        },
      });

      // Felt Radius & Measure Arc & Orbit Path & Flight Trails
      map.addSource('eq-felt', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({ id: 'eq-felt-fill', type: 'fill', source: 'eq-felt', paint: { 'fill-color': '#E85D4A', 'fill-opacity': 0.12 } });
      map.addLayer({ id: 'eq-felt-line', type: 'line', source: 'eq-felt', paint: { 'line-color': '#E85D4A', 'line-width': 1.4, 'line-dasharray': [3, 3] } });

      map.addSource('measure-arc', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({ id: 'measure-arc-line', type: 'line', source: 'measure-arc', paint: { 'line-color': '#E5A952', 'line-width': 2.4, 'line-dasharray': [4, 2] } });
      map.addSource('measure-pts', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'measure-pts-circle',
        type: 'circle',
        source: 'measure-pts',
        paint: { 'circle-radius': 6.5, 'circle-color': '#E5A952', 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 },
      });

      map.addSource('orbit-path', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({ id: 'orbit-path-line', type: 'line', source: 'orbit-path', paint: { 'line-color': '#E5A952', 'line-width': 1.8, 'line-opacity': 0.85, 'line-dasharray': [4, 3] } });

      map.addSource('flight-trails', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'flight-trails-line',
        type: 'line',
        source: 'flight-trails',
        paint: { 'line-color': '#60A5FA', 'line-width': 1.4, 'line-opacity': 0.55 },
      });

      // Aurora
      map.addSource('aurora', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'aurora-glow',
        type: 'circle',
        source: 'aurora',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'prob'], 14, 7, 50, 14, 90, 22],
          'circle-color': '#4ADE80',
          'circle-opacity': ['interpolate', ['linear'], ['get', 'prob'], 14, 0.08, 60, 0.25, 95, 0.44],
          'circle-blur': 1,
        },
      });

      // Earthquakes
      map.addSource('earthquakes', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'eq-pulse',
        type: 'circle',
        source: 'earthquakes',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 1.5, 8, 4.0, 16, 6.5, 28],
          'circle-color': ['step', ['get', 'mag'], '#E5A952', 4.0, '#E85D4A', 5.5, '#EF4444'],
          'circle-opacity': 0.15,
        },
      });
      map.addLayer({
        id: 'eq-core',
        type: 'circle',
        source: 'earthquakes',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 1.5, 3, 4.0, 5.8, 6.5, 10],
          'circle-color': ['step', ['get', 'mag'], '#E5A952', 4.0, '#E85D4A', 5.5, '#EF4444'],
          'circle-stroke-color': '#090B0E',
          'circle-stroke-width': 1.2,
        },
      });

      const addPointLayer = (
        id: string,
        color: string | maplibregl.ExpressionSpecification,
        radius: number | maplibregl.ExpressionSpecification,
        stroke = '#090B0E'
      ) => {
        map.addSource(id, { type: 'geojson', data: EMPTY_FC });
        map.addLayer({
          id: `${id}-pt`,
          type: 'circle',
          source: id,
          paint: { 'circle-radius': radius, 'circle-color': color, 'circle-stroke-color': stroke, 'circle-stroke-width': 1.2 },
        });
      };

      addPointLayer('disasters', '#F97316', 5.5, '#E6E8EC');
      addPointLayer('fires', '#EF4444', 3.4);
      addPointLayer('ships', '#38BDF8', 3.2);
      addPointLayer('tor', '#A855F7', 3.6);
      addPointLayer('cyber', '#FF2A55', 5.0, '#FFFFFF');
      addPointLayer('kiwisdr', '#C084FC', 4.0);
      addPointLayer(
        'satellites',
        ['match', ['get', 'group'], 'STATION', '#E5A952', 'WEATHER', '#60A5FA', 'GPS', '#4ADE80', '#CBD5E1'],
        ['match', ['get', 'group'], 'STATION', 6.2, 3.8],
        '#E6E8EC'
      );
      addPointLayer('rockets', '#F59E0B', 6.4, '#FFFFFF');
      addPointLayer('fireballs', '#FB7185', 5.2, '#FFFFFF');
      addPointLayer('osm-pois', '#34D399', 6.4, '#FFFFFF');
      addPointLayer('cameras', '#4ADE80', 5.4, '#090B0E');
      addPointLayer('discoveries', '#FBBF24', 7.2, '#FFFFFF');

      // Major Airports Layer
      map.addSource('airports', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: MAJOR_AIRPORTS.map((ap) => ({
            type: 'Feature',
            properties: { ...ap },
            geometry: { type: 'Point', coordinates: [ap.lon, ap.lat] },
          })),
        },
      });
      map.addLayer({
        id: 'airports-pt',
        type: 'circle',
        source: 'airports',
        paint: { 'circle-radius': 6.5, 'circle-color': '#090B0E', 'circle-stroke-color': '#E5A952', 'circle-stroke-width': 2 },
      });

      // Directional Rotated Aircraft Symbol Layer!
      map.addSource('flights', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'flights-pt',
        type: 'symbol',
        source: 'flights',
        layout: {
          'icon-image': 'plane-sdf',
          'icon-size': ['match', ['get', 'category'], 'MIL', 0.62, 0.48],
          'icon-rotate': ['get', 'heading'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
        },
        paint: {
          'icon-color': [
            'match',
            ['get', 'category'],
            'MIL', '#E5A952',
            'LADD', '#E85D4A',
            'PIA', '#E85D4A',
            '#60A5FA',
          ],
        },
      });

      readyRef.current = true;
    });

    map.on('mousemove', (e) => {
      const now = performance.now();
      if (now - lastMoveTsRef.current < 120) return; // Throttle to ~8 FPS for silky-smooth 60 FPS globe!
      lastMoveTsRef.current = now;
      onCursorMoveRef.current(e.lngLat.lat, e.lngLat.lng, map.getZoom());
    });

    const clickableLayers = [
      'airports-pt',
      'discoveries-pt',
      'cameras-pt',
      'eq-core',
      'satellites-pt',
      'rockets-pt',
      'fireballs-pt',
      'flights-pt',
      'kiwisdr-pt',
      'tor-pt',
      'cyber-pt',
      'osm-pois-pt',
      'disasters-pt',
      'cables-line',
      'faults-line',
      'ships-pt',
    ];

    map.on('click', (e) => {
      if (measureModeRef.current) {
        sound.playClick();
        onSelectCoordRef.current(e.lngLat.lat, e.lngLat.lng);
        return;
      }

      const features = map.queryRenderedFeatures(e.point, {
        layers: clickableLayers.filter((id) => map.getLayer(id)),
      });

      if (features.length > 0) {
        const f = features[0];
        const p = f.properties || {};
        sound.playClick();

        if (f.layer.id === 'airports-pt') {
          const ap = MAJOR_AIRPORTS.find((a) => a.iata === p.iata);
          if (ap) onSelectAirportRef.current(ap);
          return;
        }
        if (f.layer.id === 'cameras-pt') {
          const found = camsRef.current.find((c) => c.id === p.id);
          if (found) onSelectCameraRef.current(found);
          return;
        }
        if (f.layer.id === 'eq-core') {
          const found = eqsRef.current.find((q) => q.id === p.id) || null;
          onSelectEqRef.current(found);
          const feltKm = Math.round(Math.pow(10, 0.45 * Number(p.mag || 3)));
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#E85D4A;font-weight:600;margin-bottom:4px">Deprem • M${Number(p.mag).toFixed(1)} (${p.source})</div>
               <div>${p.title}</div>
               <div style="color:#8E95A3;font-size:11px;margin-top:4px">Derinlik: ${Number(p.depth_km).toFixed(1)} km • Tahmini hissedilme: ~${feltKm} km</div>`
            )
            .addTo(map);
          return;
        }
        if (f.layer.id === 'satellites-pt') {
          const found = satsRef.current.find((s) => s.id === p.id);
          if (found) onSelectSatRef.current(found);
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#E5A952;font-weight:600">${p.name}</div>
               <div style="font-size:11px;color:#8E95A3">İrtifa: ${Number(p.alt_km).toFixed(0)} km • Hız: ${Number(p.velocity_kmh).toFixed(0)} km/s</div>`
            )
            .addTo(map);
          return;
        }
        if (f.layer.id === 'flights-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:${p.category === 'MIL' ? '#E5A952' : '#60A5FA'};font-weight:600">${p.category} • ${p.callsign || p.hex}</div>
               <div style="font-size:11px">${p.aircraft_type} • Squawk ${p.squawk}</div>
               <div style="font-size:11px;color:#8E95A3">${p.alt_ft} ft • ${Number(p.speed_kt).toFixed(0)} kt • HDG ${Number(p.heading).toFixed(0)}°</div>`
            )
            .addTo(map);
          return;
        }
        if (f.layer.id === 'cyber-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#FF2A55;font-weight:600">Siber Tehdit C2 • ${p.malware}</div>
               <div style="font-size:11px">IP: ${p.ip}:${p.port} (${p.country})</div>
               <div style="font-size:11px;color:#8E95A3">Durum: ${p.status} • Kaynak: Abuse.ch Feodo</div>`
            )
            .addTo(map);
          return;
        }
        if (f.layer.id === 'rockets-pt' || f.layer.id === 'fireballs-pt' || f.layer.id === 'kiwisdr-pt' || f.layer.id === 'tor-pt' || f.layer.id === 'osm-pois-pt' || f.layer.id === 'discoveries-pt' || f.layer.id === 'cables-line' || f.layer.id === 'faults-line' || f.layer.id === 'disasters-pt' || f.layer.id === 'ships-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(`<div style="font-weight:600;color:#E5A952">${p.name || p.title || p.nickname || 'Detay'}</div><div style="font-size:11px;color:#8E95A3">${p.provider || p.extra || p.capacity || p.category || p.country || p.date || ''}</div>`)
            .addTo(map);
          return;
        }
      }

      sound.playPing();
      onSelectEqRef.current(null); // Clear red felt-radius circle when clicking empty map
      onSelectCoordRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  // Animated 60 FPS Wind Flow Particle Canvas Overlay
  useEffect(() => {
    const canvas = windCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!layers.windFlow) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      age: Math.random() * 80,
    }));

    let raf = 0;
    const render = () => {
      ctx.fillStyle = 'rgba(9, 11, 14, 0.08)';
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      const m = mapRef.current;
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.55)';
      ctx.lineWidth = 1.25;

      for (const pt of particles) {
        let vx = 1.4;
        let vy = -0.35;
        if (m && windTempGrid.length > 0) {
          try {
            const ll = m.unproject([pt.x, pt.y]);
            let best = windTempGrid[0];
            let bestD = 1e9;
            for (const g of windTempGrid) {
              const d = (g.lat - ll.lat) ** 2 + (g.lon - ll.lng) ** 2;
              if (d < bestD) {
                bestD = d;
                best = g;
              }
            }
            const rad = ((best.wind_dir + 180) * Math.PI) / 180;
            const spd = Math.max(0.6, Math.min(3.5, best.wind_kmh / 12));
            vx = Math.sin(rad) * spd;
            vy = -Math.cos(rad) * spd;
          } catch {
            // ignore
          }
        }
        const nx = pt.x + vx;
        const ny = pt.y + vy;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        pt.x = nx;
        pt.y = ny;
        pt.age += 1;
        if (pt.age > 75 || pt.x < 0 || pt.x > canvas.width || pt.y < 0 || pt.y > canvas.height) {
          pt.x = Math.random() * canvas.width;
          pt.y = Math.random() * canvas.height;
          pt.age = 0;
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [layers.windFlow, windTempGrid]);

  // Terrain DEM
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;
    try {
      m.setTerrain(layers.terrain ? { source: 'terrain-dem', exaggeration: 1.5 } : null);
    } catch {
      // ignore
    }
  }, [layers.terrain]);

  // NASA GIBS
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;
    try {
      if (m.getLayer('nasa-gibs-layer')) m.removeLayer('nasa-gibs-layer');
      if (m.getSource('nasa-gibs-src')) m.removeSource('nasa-gibs-src');
      if (layers.nasaGibs && nasaGibsDate) {
        const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${nasaGibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
        m.addSource('nasa-gibs-src', { type: 'raster', tiles: [url], tileSize: 256, maxzoom: 9 });
        m.addLayer({ id: 'nasa-gibs-layer', type: 'raster', source: 'nasa-gibs-src', paint: { 'raster-opacity': 0.88 } }, 'terminator-fill');
      }
    } catch {
      // ignore
    }
  }, [layers.nasaGibs, nasaGibsDate]);

  // RainViewer Radar
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;
    try {
      if (m.getLayer('rainviewer-layer')) m.removeLayer('rainviewer-layer');
      if (m.getSource('rainviewer-src')) m.removeSource('rainviewer-src');
      if (layers.radar && radarTileUrl) {
        m.addSource('rainviewer-src', { type: 'raster', tiles: [radarTileUrl], tileSize: 256, maxzoom: 7 });
        m.addLayer({ id: 'rainviewer-layer', type: 'raster', source: 'rainviewer-src', paint: { 'raster-opacity': 0.58 } }, 'cables-line');
      }
    } catch {
      // ignore
    }
  }, [layers.radar, radarTileUrl]);

  // Sync GeoJSON Sources & Visibilities
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;
    const setData = (id: string, data: GeoJSON.FeatureCollection) => {
      (m.getSource(id) as maplibregl.GeoJSONSource | undefined)?.setData(data);
    };
    const setVis = (id: string, on: boolean) => {
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    };
    const pts = <T extends { lat: number; lon: number }>(arr: T[]): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: arr.map((item) => ({
        type: 'Feature',
        properties: { ...item },
        geometry: { type: 'Point', coordinates: [item.lon, item.lat] },
      })),
    });

    // Update live flight trails history (with jump guard so lines never crisscross the map!)
    const mergedFlights = [...(layers.flights ? flights : []), ...(layers.military ? militaryFlights : [])];
    const tMap = trailsRef.current;
    const activeHexes = new Set<string>();
    for (const f of mergedFlights) {
      activeHexes.add(f.hex);
      let prev = tMap.get(f.hex) || [];
      const last = prev[prev.length - 1];
      if (last && Math.hypot(last[0] - f.lon, last[1] - f.lat) > 1.2) {
        prev = [];
      }
      if (!last || prev.length === 0 || Math.hypot(last[0] - f.lon, last[1] - f.lat) > 0.008) {
        if (prev.length === 0) {
          const rad = ((f.heading + 180) * Math.PI) / 180;
          const tailLon = f.lon + Math.sin(rad) * 0.14;
          const tailLat = f.lat + Math.cos(rad) * 0.11;
          prev.push([tailLon, tailLat]);
        }
        prev.push([f.lon, f.lat]);
        if (prev.length > 8) prev.shift();
        tMap.set(f.hex, prev);
      }
    }
    // Prune stale hexes no longer in view
    for (const k of Array.from(tMap.keys())) {
      if (!activeHexes.has(k)) tMap.delete(k);
    }

    const trailFeatures: GeoJSON.Feature[] = [];
    tMap.forEach((coords, hex) => {
      if (coords.length >= 2) {
        trailFeatures.push({
          type: 'Feature',
          properties: { hex },
          geometry: { type: 'LineString', coordinates: coords },
        });
      }
    });

    setData('earthquakes', pts(earthquakes));
    setData(
      'eq-felt',
      selectedEq
        ? buildCircleGeoJSON(selectedEq.lat, selectedEq.lon, Math.max(25, Math.pow(10, 0.45 * selectedEq.mag)))
        : EMPTY_FC
    );
    setData('measure-arc', measurePts.length === 2 ? buildGreatCircleArcGeoJSON(measurePts[0], measurePts[1]) : EMPTY_FC);
    setData('measure-pts', pts(measurePts));
    setData('disasters', pts(disasters));
    setData('flights', pts(mergedFlights));
    setData('flight-trails', { type: 'FeatureCollection', features: trailFeatures });
    setData('rockets', pts(rockets));
    setData('fireballs', pts(fireballs));
    setData('tor', pts(torRelays));
    setData('cyber', pts(cyberThreats));
    setData('kiwisdr', pts(kiwisdr));
    setData('aurora', pts(auroraPoints));
    setData('ships', pts(ships));
    setData('fires', pts(fires));
    setData('cameras', pts(cameras));
    setData('osm-pois', pts(osmPois));
    setData('discoveries', pts(discoveries));
    setData('temp-heat', pts(windTempGrid));

    const vSet = new Set(visitedPlakas);
    setData('turkey-fog', {
      type: 'FeatureCollection',
      features: TURKEY_81.map((pr) => ({
        type: 'Feature',
        properties: { name: pr.name, plaka: pr.plaka, visited: vSet.has(pr.plaka) },
        geometry: { type: 'Point', coordinates: [pr.lon, pr.lat] },
      })),
    });

    setVis('eq-core', layers.earthquakes);
    setVis('eq-pulse', layers.earthquakes);
    setVis('faults-line', layers.faults);
    setVis('disasters-pt', layers.disasters);
    setVis('flights-pt', layers.flights || layers.military);
    setVis('flight-trails-line', layers.flightTrails && (layers.flights || layers.military));
    setVis('airports-pt', layers.airports);
    setVis('satellites-pt', layers.satellites);
    setVis('orbit-path-line', layers.satellites && !!selectedSat);
    setVis('rockets-pt', layers.rockets);
    setVis('fireballs-pt', layers.fireballs);
    setVis('tor-pt', layers.tor);
    setVis('cyber-pt', layers.cyberThreats);
    setVis('kiwisdr-pt', layers.kiwisdr);
    setVis('aurora-glow', layers.aurora);
    setVis('cables-line', layers.cables);
    setVis('railways-layer', layers.railways);
    setVis('ships-pt', layers.ships);
    setVis('fires-pt', layers.fires);
    setVis('cameras-pt', layers.cameras);
    setVis('discoveries-pt', layers.discoveries);
    setVis('temp-heat-layer', layers.tempHeat);
    setVis('turkey-fog-glow', layers.turkeyFog);
    setVis('turkey-fog-pt', layers.turkeyFog);
    setVis('terminator-fill', layers.terminator);
    setVis('terminator-line', layers.terminator);
  }, [
    earthquakes,
    selectedEq,
    measurePts,
    disasters,
    flights,
    militaryFlights,
    rockets,
    fireballs,
    torRelays,
    cyberThreats,
    kiwisdr,
    auroraPoints,
    ships,
    fires,
    cameras,
    osmPois,
    discoveries,
    windTempGrid,
    visitedPlakas,
    layers,
  ]);

  // Isolated lightweight satellite update (so 5s SGP4 ticks NEVER re-upload 15 other layers!)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;
    (m.getSource('satellites') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: satellites.map((s) => ({
        type: 'Feature',
        properties: { ...s },
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      })),
    });
    (m.getSource('orbit-path') as maplibregl.GeoJSONSource | undefined)?.setData(
      selectedSat ? computeOrbitPathGeoJSON(selectedSat) : EMPTY_FC
    );
    if (m.getLayer('orbit-path-line')) {
      m.setLayoutProperty('orbit-path-line', 'visibility', layers.satellites && !!selectedSat ? 'visible' : 'none');
    }
  }, [satellites, selectedSat, layers.satellites]);

  useEffect(() => {
    if (!flyTarget || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyTarget.lon, flyTarget.lat],
      zoom: flyTarget.zoom ?? 6.5,
      pitch: 34,
      speed: 1.35,
      essential: true,
    });
  }, [flyTarget]);

  const zoomIn = () => { sound.playClick(); mapRef.current?.zoomIn({ duration: 250 }); };
  const zoomOut = () => { sound.playClick(); mapRef.current?.zoomOut({ duration: 250 }); };
  const toggleTilt = () => {
    sound.playClick();
    const m = mapRef.current;
    if (!m) return;
    m.easeTo({ pitch: m.getPitch() > 25 ? 0 : 52, duration: 400 });
  };
  const resetNorth = () => { sound.playClick(); mapRef.current?.easeTo({ bearing: 0, pitch: 14, duration: 400 }); };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <canvas
        ref={windCanvasRef}
        className="fixed inset-0 pointer-events-none z-10"
      />
      <div className="fixed bottom-16 right-4 z-20 atlas-pill rounded-xl p-1 flex flex-col gap-0.5">
        <button onClick={zoomIn} className="atlas-btn w-8 h-8" title="Yakınlaş"><Plus className="w-4 h-4" /></button>
        <button onClick={zoomOut} className="atlas-btn w-8 h-8" title="Uzaklaş"><Minus className="w-4 h-4" /></button>
        <div className="h-px bg-white/10 my-0.5" />
        <button onClick={toggleTilt} className="atlas-btn w-8 h-8" title="3D Eğim"><Mountain className="w-3.5 h-3.5 text-[#E5A952]" /></button>
        <button onClick={resetNorth} className="atlas-btn w-8 h-8" title="Kuzeye Sıfırla"><Compass className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
