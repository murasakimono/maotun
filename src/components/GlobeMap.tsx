import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Compass, Minus, Mountain, Plus } from 'lucide-react';
import type {
  AuroraPoint,
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
} from '../types';
import {
  buildCircleGeoJSON,
  buildGreatCircleArcGeoJSON,
  buildSolarTerminatorGeoJSON,
  computeOrbitPathGeoJSON,
  SUBMARINE_CABLES_GEOJSON,
  TURKEY_FAULTS_GEOJSON,
} from '../geo';
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
  kiwisdr: KiwiSdrNode[];
  auroraPoints: AuroraPoint[];
  ships: ShipItem[];
  fires: FireHotspot[];
  cameras: LiveCamera[];
  osmPois: OsmPoi[];
  discoveries: DiscoveryPin[];
  measurePts: { lat: number; lon: number; label?: string }[];
  measureMode: boolean;
  layers: LayerState;
  radarTileUrl: string | null;
  nasaGibsDate: string;
  flyTarget: { lat: number; lon: number; zoom?: number; ts: number } | null;
  onSelectCoord: (lat: number, lon: number) => void;
  onSelectCamera: (cam: LiveCamera) => void;
  onCursorMove: (lat: number, lon: number, zoom: number) => void;
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

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
  kiwisdr,
  auroraPoints,
  ships,
  fires,
  cameras,
  osmPois,
  discoveries,
  measurePts,
  measureMode,
  layers,
  radarTileUrl,
  nasaGibsDate,
  flyTarget,
  onSelectCoord,
  onSelectCamera,
  onCursorMove,
}: GlobeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);

  const satsRef = useRef(satellites);
  satsRef.current = satellites;
  const camsRef = useRef(cameras);
  camsRef.current = cameras;
  const eqsRef = useRef(earthquakes);
  eqsRef.current = earthquakes;
  const measureModeRef = useRef(measureMode);
  measureModeRef.current = measureMode;

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

      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
      });

      // Solar Terminator
      map.addSource('terminator', { type: 'geojson', data: buildSolarTerminatorGeoJSON() });
      map.addLayer({
        id: 'terminator-fill',
        type: 'fill',
        source: 'terminator',
        paint: { 'fill-color': '#030509', 'fill-opacity': 0.44 },
      });
      map.addLayer({
        id: 'terminator-line',
        type: 'line',
        source: 'terminator',
        paint: { 'line-color': '#E5A952', 'line-width': 1, 'line-opacity': 0.4, 'line-dasharray': [4, 4] },
      });

      // OpenRailwayMap Global Rail Overlay
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

      // Submarine Fiber Cables
      map.addSource('cables', { type: 'geojson', data: SUBMARINE_CABLES_GEOJSON });
      map.addLayer({
        id: 'cables-line',
        type: 'line',
        source: 'cables',
        paint: { 'line-color': '#60A5FA', 'line-width': 1.4, 'line-opacity': 0.48, 'line-dasharray': [3, 2] },
      });

      // Turkey Active Fault Lines
      map.addSource('faults', { type: 'geojson', data: TURKEY_FAULTS_GEOJSON });
      map.addLayer({
        id: 'faults-line',
        type: 'line',
        source: 'faults',
        paint: { 'line-color': '#E85D4A', 'line-width': 1.8, 'line-opacity': 0.65, 'line-dasharray': [2, 2] },
      });

      // Earthquake Felt Radius Ring
      map.addSource('eq-felt', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'eq-felt-fill',
        type: 'fill',
        source: 'eq-felt',
        paint: { 'fill-color': '#E85D4A', 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: 'eq-felt-line',
        type: 'line',
        source: 'eq-felt',
        paint: { 'line-color': '#E85D4A', 'line-width': 1.4, 'line-dasharray': [3, 3] },
      });

      // 2-Point Great Circle Measurement Arc
      map.addSource('measure-arc', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'measure-arc-line',
        type: 'line',
        source: 'measure-arc',
        paint: { 'line-color': '#E5A952', 'line-width': 2.2, 'line-dasharray': [4, 2] },
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

      // Orbit Path
      map.addSource('orbit-path', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'orbit-path-line',
        type: 'line',
        source: 'orbit-path',
        paint: { 'line-color': '#E5A952', 'line-width': 1.8, 'line-opacity': 0.85, 'line-dasharray': [4, 3] },
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

      // Disasters, Fires, Ships, Tor, KiwiSDR, Flights, Satellites, Rockets, Fireballs, OSM POIs, Cameras, Discoveries
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
          paint: {
            'circle-radius': radius,
            'circle-color': color,
            'circle-stroke-color': stroke,
            'circle-stroke-width': 1.2,
          },
        });
      };

      addPointLayer('disasters', '#F97316', 5.5, '#E6E8EC');
      addPointLayer('fires', '#EF4444', 3.4);
      addPointLayer('ships', '#38BDF8', 3.2);
      addPointLayer('tor', '#A855F7', 3.6);
      addPointLayer('kiwisdr', '#C084FC', 4.0);
      addPointLayer(
        'flights',
        ['match', ['get', 'category'], 'MIL', '#E5A952', 'LADD', '#E85D4A', 'PIA', '#E85D4A', '#60A5FA'],
        ['match', ['get', 'category'], 'MIL', 5.0, 3.4]
      );
      addPointLayer(
        'satellites',
        ['match', ['get', 'group'], 'STATION', '#E5A952', 'WEATHER', '#60A5FA', 'GPS', '#4ADE80', '#CBD5E1'],
        ['match', ['get', 'group'], 'STATION', 6.2, 3.8],
        '#E6E8EC'
      );
      addPointLayer('rockets', '#F59E0B', 6.4, '#FFFFFF');
      addPointLayer('fireballs', '#FB7185', 5.2, '#FFFFFF');
      addPointLayer('osm-pois', '#34D399', 5.2, '#090B0E');
      addPointLayer('cameras', '#4ADE80', 5.4, '#090B0E');
      addPointLayer('discoveries', '#FBBF24', 7.2, '#FFFFFF');

      readyRef.current = true;
    });

    map.on('mousemove', (e) => {
      onCursorMove(e.lngLat.lat, e.lngLat.lng, map.getZoom());
    });

    const clickableLayers = [
      'discoveries-pt',
      'cameras-pt',
      'eq-core',
      'satellites-pt',
      'rockets-pt',
      'fireballs-pt',
      'flights-pt',
      'kiwisdr-pt',
      'tor-pt',
      'osm-pois-pt',
      'disasters-pt',
      'cables-line',
      'faults-line',
      'ships-pt',
    ];

    map.on('click', (e) => {
      if (measureModeRef.current) {
        sound.playClick();
        onSelectCoord(e.lngLat.lat, e.lngLat.lng);
        return;
      }

      const features = map.queryRenderedFeatures(e.point, {
        layers: clickableLayers.filter((id) => map.getLayer(id)),
      });

      if (features.length > 0) {
        const f = features[0];
        const p = f.properties || {};
        sound.playClick();

        if (f.layer.id === 'cameras-pt') {
          const found = camsRef.current.find((c) => c.id === p.id);
          if (found) onSelectCamera(found);
          return;
        }

        if (f.layer.id === 'eq-core') {
          const found = eqsRef.current.find((q) => q.id === p.id) || null;
          onSelectEq(found);
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
          if (found) onSelectSat(found);
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#E5A952;font-weight:600;margin-bottom:4px">${p.name}</div>
               <div style="font-size:11px">Grup: ${p.group} • NORAD ${p.id}</div>
               <div style="font-size:11px;color:#8E95A3">İrtifa: ${Number(p.alt_km).toFixed(0)} km • Hız: ${Number(p.velocity_kmh).toFixed(0)} km/s</div>
               <div style="font-size:10px;color:#E5A952;margin-top:4px">90 dk SGP4 yörünge yayı çizildi</div>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'rockets-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#F59E0B;font-weight:600;margin-bottom:4px">Roket Fırlatma • ${p.status}</div>
               <div>${p.name}</div>
               <div style="font-size:11px;color:#8E95A3;margin-top:3px">${p.provider} — ${p.pad_name}</div>
               <div style="font-size:11px;color:#E5A952;margin-top:3px">Planlanan: ${String(p.net || '').replace('T', ' ').slice(0, 16)} UTC</div>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'fireballs-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#FB7185;font-weight:600;margin-bottom:4px">NASA JPL Meteor / Ateş Topu</div>
               <div style="font-size:11px">Tarih: ${p.date}</div>
               <div style="font-size:11px;color:#8E95A3">Enerji: ${p.energy_kt} kt • İrtifa: ${p.alt_km} km • Hız: ${p.vel_kms} km/s</div>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'discoveries-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#FBBF24;font-weight:600;margin-bottom:4px">Keşif Pinin • +${p.xp} XP</div>
               <div>${p.title} (${p.city})</div>
               ${p.photoDataUrl ? `<img src="${p.photoDataUrl}" style="width:180px;height:110px;object-fit:cover;border-radius:8px;margin-top:6px" />` : ''}`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'flights-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:${p.category === 'MIL' ? '#E5A952' : '#60A5FA'};font-weight:600">${p.category} • ${p.callsign || p.hex}</div>
               <div style="font-size:11px">Tip: ${p.aircraft_type} • Squawk: ${p.squawk}</div>
               <div style="font-size:11px;color:#8E95A3">${p.alt_ft} ft • ${Number(p.speed_kt).toFixed(0)} kt • ${Number(p.heading).toFixed(0)}°</div>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'kiwisdr-pt') {
          const url = String(p.url || '');
          const safeUrl = url.startsWith('http') ? url : `http://${url}`;
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#C084FC;font-weight:600">KiwiSDR • ${p.name}</div>
               <div style="font-size:11px;color:#8E95A3">${p.bands} • ${p.users}/${p.users_max} kullanıcı</div>
               <a href="${safeUrl}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:6px;color:#E5A952;text-decoration:underline">Canlı Alıcıyı Aç</a>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'tor-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#A855F7;font-weight:600">Tor Relay • ${p.nickname}</div>
               <div style="font-size:11px;color:#8E95A3">${p.country} • ${Number(p.bandwidth_mbps).toFixed(0)} Mbps</div>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'osm-pois-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#34D399;font-weight:600">${p.name}</div>
               <div style="font-size:11px;color:#8E95A3">${p.extra || p.kind}</div>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'cables-line' || f.layer.id === 'faults-line' || f.layer.id === 'disasters-pt' || f.layer.id === 'ships-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(`<div style="font-weight:600">${p.name || p.title}</div><div style="font-size:11px;color:#8E95A3">${p.capacity || p.category || p.source || ''}</div>`)
            .addTo(map);
          return;
        }
      }

      sound.playPing();
      onSelectCoord(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

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

  // NASA GIBS True Color Satellite Imagery Layer
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;
    try {
      if (m.getLayer('nasa-gibs-layer')) m.removeLayer('nasa-gibs-layer');
      if (m.getSource('nasa-gibs-src')) m.removeSource('nasa-gibs-src');
      if (layers.nasaGibs && nasaGibsDate) {
        const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${nasaGibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
        m.addSource('nasa-gibs-src', {
          type: 'raster',
          tiles: [url],
          tileSize: 256,
          maxzoom: 9,
        });
        m.addLayer(
          {
            id: 'nasa-gibs-layer',
            type: 'raster',
            source: 'nasa-gibs-src',
            paint: { 'raster-opacity': 0.88 },
          },
          'terminator-fill'
        );
      }
    } catch {
      // ignore
    }
  }, [layers.nasaGibs, nasaGibsDate]);

  // RainViewer Radar Layer
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

  // Sync Data & Visibilities
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

    setData('earthquakes', pts(earthquakes));
    setData(
      'eq-felt',
      selectedEq
        ? buildCircleGeoJSON(selectedEq.lat, selectedEq.lon, Math.max(25, Math.pow(10, 0.45 * selectedEq.mag)))
        : EMPTY_FC
    );
    setData(
      'measure-arc',
      measurePts.length === 2 ? buildGreatCircleArcGeoJSON(measurePts[0], measurePts[1]) : EMPTY_FC
    );
    setData('disasters', pts(disasters));
    setData('flights', pts([...(layers.flights ? flights : []), ...(layers.military ? militaryFlights : [])]));
    setData('satellites', pts(satellites));
    setData('orbit-path', selectedSat ? computeOrbitPathGeoJSON(selectedSat) : EMPTY_FC);
    setData('rockets', pts(rockets));
    setData('fireballs', pts(fireballs));
    setData('tor', pts(torRelays));
    setData('kiwisdr', pts(kiwisdr));
    setData('aurora', pts(auroraPoints));
    setData('ships', pts(ships));
    setData('fires', pts(fires));
    setData('cameras', pts(cameras));
    setData('osm-pois', pts(osmPois));
    setData('discoveries', pts(discoveries));

    setVis('eq-core', layers.earthquakes);
    setVis('eq-pulse', layers.earthquakes);
    setVis('faults-line', layers.faults);
    setVis('disasters-pt', layers.disasters);
    setVis('flights-pt', layers.flights || layers.military);
    setVis('satellites-pt', layers.satellites);
    setVis('orbit-path-line', layers.satellites && !!selectedSat);
    setVis('rockets-pt', layers.rockets);
    setVis('fireballs-pt', layers.fireballs);
    setVis('tor-pt', layers.tor);
    setVis('kiwisdr-pt', layers.kiwisdr);
    setVis('aurora-glow', layers.aurora);
    setVis('cables-line', layers.cables);
    setVis('railways-layer', layers.railways);
    setVis('ships-pt', layers.ships);
    setVis('fires-pt', layers.fires);
    setVis('cameras-pt', layers.cameras);
    setVis('discoveries-pt', layers.discoveries);
    setVis('terminator-fill', layers.terminator);
    setVis('terminator-line', layers.terminator);
  }, [
    earthquakes,
    selectedEq,
    measurePts,
    disasters,
    flights,
    militaryFlights,
    satellites,
    selectedSat,
    rockets,
    fireballs,
    torRelays,
    kiwisdr,
    auroraPoints,
    ships,
    fires,
    cameras,
    osmPois,
    discoveries,
    layers,
  ]);

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

  // Custom Obsidian Dark Map Controls (Replaces ugly default white MapLibre controls!)
  const zoomIn = () => { sound.playClick(); mapRef.current?.zoomIn({ duration: 250 }); };
  const zoomOut = () => { sound.playClick(); mapRef.current?.zoomOut({ duration: 250 }); };
  const toggleTilt = () => {
    sound.playClick();
    const m = mapRef.current;
    if (!m) return;
    m.easeTo({ pitch: m.getPitch() > 25 ? 0 : 52, duration: 400 });
  };
  const resetNorth = () => {
    sound.playClick();
    mapRef.current?.easeTo({ bearing: 0, pitch: 14, duration: 400 });
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Bespoke Dark Map Controls (Bottom Right) */}
      <div className="fixed bottom-16 right-4 z-20 atlas-pill rounded-xl p-1 flex flex-col gap-0.5">
        <button onClick={zoomIn} className="atlas-btn w-8 h-8" title="Yakınlaş">
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={zoomOut} className="atlas-btn w-8 h-8" title="Uzaklaş">
          <Minus className="w-4 h-4" />
        </button>
        <div className="h-px bg-white/10 my-0.5" />
        <button onClick={toggleTilt} className="atlas-btn w-8 h-8" title="3D Eğim (Tilt)">
          <Mountain className="w-3.5 h-3.5 text-[#E5A952]" />
        </button>
        <button onClick={resetNorth} className="atlas-btn w-8 h-8" title="Kuzeye Sıfırla">
          <Compass className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
