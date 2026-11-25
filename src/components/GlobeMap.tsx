import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type {
  AuroraPoint,
  DisasterItem,
  EarthquakeItem,
  FireHotspot,
  FlightItem,
  KiwiSdrNode,
  LayerState,
  LiveCamera,
  SatelliteLive,
  ShipItem,
} from '../types';
import {
  buildSolarTerminatorGeoJSON,
  computeOrbitPathGeoJSON,
  SUBMARINE_CABLES_GEOJSON,
  TURKEY_FAULTS_GEOJSON,
} from '../geo';
import { sound } from '../sound';

interface GlobeMapProps {
  earthquakes: EarthquakeItem[];
  disasters: DisasterItem[];
  flights: FlightItem[];
  militaryFlights: FlightItem[];
  satellites: SatelliteLive[];
  selectedSat: SatelliteLive | null;
  onSelectSat: (sat: SatelliteLive | null) => void;
  kiwisdr: KiwiSdrNode[];
  auroraPoints: AuroraPoint[];
  ships: ShipItem[];
  fires: FireHotspot[];
  cameras: LiveCamera[];
  layers: LayerState;
  radarTileUrl: string | null;
  flyTarget: { lat: number; lon: number; zoom?: number; ts: number } | null;
  onSelectCoord: (lat: number, lon: number) => void;
  onSelectCamera: (cam: LiveCamera) => void;
  onCursorMove: (lat: number, lon: number, zoom: number) => void;
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

export function GlobeMap({
  earthquakes,
  disasters,
  flights,
  militaryFlights,
  satellites,
  selectedSat,
  onSelectSat,
  kiwisdr,
  auroraPoints,
  ships,
  fires,
  cameras,
  layers,
  radarTileUrl,
  flyTarget,
  onSelectCoord,
  onSelectCamera,
  onCursorMove,
}: GlobeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const satsRef = useRef<SatelliteLive[]>(satellites);
  satsRef.current = satellites;
  const camsRef = useRef<LiveCamera[]>(cameras);
  camsRef.current = cameras;

  // Initialize MapLibre v5 3D Globe
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [32.5, 38.8],
      zoom: 3.1,
      pitch: 16,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    map.on('style.load', () => {
      try {
        map.setProjection({ type: 'globe' });
      } catch {
        // fallback if mercator
      }

      // 3D Terrain DEM Source (AWS Open Data Terrarium - zero key)
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
        paint: { 'fill-color': '#03050A', 'fill-opacity': 0.42 },
      });
      map.addLayer({
        id: 'terminator-line',
        type: 'line',
        source: 'terminator',
        paint: { 'line-color': '#FF4D00', 'line-width': 1, 'line-opacity': 0.45, 'line-dasharray': [4, 4] },
      });

      // Submarine Cables
      map.addSource('cables', { type: 'geojson', data: SUBMARINE_CABLES_GEOJSON });
      map.addLayer({
        id: 'cables-line',
        type: 'line',
        source: 'cables',
        paint: {
          'line-color': '#00D4FF',
          'line-width': 1.5,
          'line-opacity': 0.55,
          'line-dasharray': [3, 2],
        },
      });

      // Turkey Active Fault Lines
      map.addSource('faults', { type: 'geojson', data: TURKEY_FAULTS_GEOJSON });
      map.addLayer({
        id: 'faults-line',
        type: 'line',
        source: 'faults',
        paint: {
          'line-color': '#FF2A3B',
          'line-width': 2,
          'line-opacity': 0.72,
          'line-dasharray': [2, 2],
        },
      });

      // NOAA Aurora Oval
      map.addSource('aurora', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'aurora-glow',
        type: 'circle',
        source: 'aurora',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'prob'], 14, 7, 50, 14, 90, 22],
          'circle-color': '#00E58A',
          'circle-opacity': ['interpolate', ['linear'], ['get', 'prob'], 14, 0.08, 60, 0.28, 95, 0.48],
          'circle-blur': 1,
        },
      });

      // Satellite Selected Orbit Path
      map.addSource('orbit-path', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'orbit-path-line',
        type: 'line',
        source: 'orbit-path',
        paint: {
          'line-color': '#FF4D00',
          'line-width': 1.8,
          'line-opacity': 0.85,
          'line-dasharray': [4, 3],
        },
      });

      // Earthquakes
      map.addSource('earthquakes', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'eq-pulse',
        type: 'circle',
        source: 'earthquakes',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 1.5, 9, 4.0, 17, 6.5, 30],
          'circle-color': ['step', ['get', 'mag'], '#FFB800', 4.0, '#FF4D00', 5.5, '#FF2A3B'],
          'circle-opacity': 0.16,
        },
      });
      map.addLayer({
        id: 'eq-core',
        type: 'circle',
        source: 'earthquakes',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 1.5, 3.2, 4.0, 6.2, 6.5, 11],
          'circle-color': ['step', ['get', 'mag'], '#FFB800', 4.0, '#FF4D00', 5.5, '#FF2A3B'],
          'circle-stroke-color': '#08090B',
          'circle-stroke-width': 1.2,
        },
      });

      // NASA EONET Disasters
      map.addSource('disasters', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'disasters-pt',
        type: 'circle',
        source: 'disasters',
        paint: {
          'circle-radius': 6,
          'circle-color': '#FF7A00',
          'circle-stroke-color': '#ECEEF2',
          'circle-stroke-width': 1.2,
        },
      });

      // NASA FIRMS Fires
      map.addSource('fires', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'fires-pt',
        type: 'circle',
        source: 'fires',
        paint: {
          'circle-radius': 3.5,
          'circle-color': '#FF3B00',
          'circle-opacity': 0.85,
        },
      });

      // Ships (AIS)
      map.addSource('ships', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'ships-pt',
        type: 'circle',
        source: 'ships',
        paint: {
          'circle-radius': 3.2,
          'circle-color': '#38BDF8',
          'circle-stroke-color': '#08090B',
          'circle-stroke-width': 0.8,
        },
      });

      // KiwiSDR Shortwave Nodes
      map.addSource('kiwisdr', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'kiwisdr-pt',
        type: 'circle',
        source: 'kiwisdr',
        paint: {
          'circle-radius': 4.2,
          'circle-color': '#C084FC',
          'circle-stroke-color': '#08090B',
          'circle-stroke-width': 1,
        },
      });

      // Flights (Civil + Military)
      map.addSource('flights', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'flights-pt',
        type: 'circle',
        source: 'flights',
        paint: {
          'circle-radius': ['match', ['get', 'category'], 'MIL', 5.2, 'LADD', 4.6, 3.4],
          'circle-color': [
            'match',
            ['get', 'category'],
            'MIL',
            '#FFB800',
            'LADD',
            '#FF4D00',
            'PIA',
            '#FF4D00',
            '#00D4FF',
          ],
          'circle-stroke-color': '#08090B',
          'circle-stroke-width': 1,
        },
      });

      // Satellites (SGP4)
      map.addSource('satellites', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'satellites-pt',
        type: 'circle',
        source: 'satellites',
        paint: {
          'circle-radius': ['match', ['get', 'group'], 'STATION', 6.5, 'WEATHER', 4.5, 3.6],
          'circle-color': [
            'match',
            ['get', 'group'],
            'STATION',
            '#FF4D00',
            'WEATHER',
            '#00D4FF',
            'GPS',
            '#00E58A',
            '#CBD5E1',
          ],
          'circle-stroke-color': '#ECEEF2',
          'circle-stroke-width': 1.2,
        },
      });

      // Cameras
      map.addSource('cameras', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'cameras-pt',
        type: 'circle',
        source: 'cameras',
        paint: {
          'circle-radius': 6,
          'circle-color': '#00E58A',
          'circle-stroke-color': '#08090B',
          'circle-stroke-width': 1.8,
        },
      });

      readyRef.current = true;
    });

    // Cursor coordinate reporting
    map.on('mousemove', (e) => {
      onCursorMove(e.lngLat.lat, e.lngLat.lng, map.getZoom());
    });

    // Click Handlers
    const clickableLayers = [
      'cameras-pt',
      'eq-core',
      'satellites-pt',
      'flights-pt',
      'kiwisdr-pt',
      'disasters-pt',
      'cables-line',
      'faults-line',
      'ships-pt',
    ];

    map.on('click', (e) => {
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

        if (f.layer.id === 'satellites-pt') {
          const found = satsRef.current.find((s) => s.id === p.id);
          if (found) onSelectSat(found);
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#FF4D00;font-weight:600;margin-bottom:4px">SAT // ${p.name}</div>
               <div>GRUP: ${p.group} | NORAD: ${p.id}</div>
               <div>İRTİFA: ${Number(p.alt_km).toFixed(0)} KM | HIZ: ${Number(p.velocity_kmh).toFixed(0)} KM/S</div>
               <div style="color:#7C8492;margin-top:4px">90 DK SGP4 YÖRÜNGE YAYI ÇİZİLDİ</div>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'eq-core') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#FF4D00;font-weight:600;margin-bottom:4px">SİSMİK // M${Number(p.mag).toFixed(1)} (${p.source})</div>
               <div>${p.title}</div>
               <div style="color:#7C8492;margin-top:3px">DERİNLİK: ${Number(p.depth_km).toFixed(1)} KM • ${p.time_str}</div>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'flights-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:${p.category === 'MIL' ? '#FFB800' : '#00D4FF'};font-weight:600;margin-bottom:4px">${p.category} // ${p.callsign || p.hex}</div>
               <div>TİP: ${p.aircraft_type} | SQUAWK: ${p.squawk}</div>
               <div>İRTİFA: ${p.alt_ft} FT | HIZ: ${Number(p.speed_kt).toFixed(0)} KT | HDG: ${Number(p.heading).toFixed(0)}°</div>`
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
              `<div style="color:#C084FC;font-weight:600;margin-bottom:4px">KIWISDR // ${p.name}</div>
               <div>BANT: ${p.bands} | KULLANICI: ${p.users}/${p.users_max}</div>
               <div style="color:#7C8492">${p.antenna}</div>
               <a href="${safeUrl}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:6px;color:#FF4D00;text-decoration:underline">CANLI WATERFALL ALICIYI AÇ →</a>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'cables-line') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#00D4FF;font-weight:600">DENİZALTI FİBER OMURGA</div>
               <div>${p.name}</div>
               <div style="color:#7C8492">KAPASİTE: ${p.capacity}</div>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'faults-line') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#FF2A3B;font-weight:600">AKTİF FAY ZONU</div><div>${p.name}</div>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'disasters-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#FF7A00;font-weight:600">EONET // ${p.category}</div>
               <div>${p.title}</div>
               <div style="color:#7C8492">${p.date_str}</div>`
            )
            .addTo(map);
          return;
        }

        if (f.layer.id === 'ships-pt') {
          new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="color:#38BDF8;font-weight:600">AIS // ${p.name}</div>
               <div>SOG: ${Number(p.sog).toFixed(1)} KT | COG: ${Number(p.cog).toFixed(0)}°</div>
               <div style="color:#7C8492">KAYNAK: ${p.source}</div>`
            )
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

  // Refresh Solar Terminator every 60s
  useEffect(() => {
    const id = setInterval(() => {
      const m = mapRef.current;
      if (!m || !readyRef.current) return;
      const src = m.getSource('terminator') as maplibregl.GeoJSONSource | undefined;
      src?.setData(buildSolarTerminatorGeoJSON());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Toggle 3D Terrain DEM
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;
    try {
      if (layers.terrain) {
        m.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });
      } else {
        m.setTerrain(null);
      }
    } catch {
      // ignore if style not ready
    }
  }, [layers.terrain]);

  // RainViewer Live Radar Tile Layer
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;
    try {
      if (m.getLayer('rainviewer-layer')) m.removeLayer('rainviewer-layer');
      if (m.getSource('rainviewer-src')) m.removeSource('rainviewer-src');
      if (layers.radar && radarTileUrl) {
        m.addSource('rainviewer-src', {
          type: 'raster',
          tiles: [radarTileUrl],
          tileSize: 256,
          maxzoom: 7,
        });
        m.addLayer(
          {
            id: 'rainviewer-layer',
            type: 'raster',
            source: 'rainviewer-src',
            paint: { 'raster-opacity': 0.58 },
          },
          'cables-line'
        );
      }
    } catch {
      // ignore
    }
  }, [layers.radar, radarTileUrl]);

  // Sync GeoJSON Sources & Layer Visibilities
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current) return;

    const setData = (id: string, data: GeoJSON.FeatureCollection) => {
      const src = m.getSource(id) as maplibregl.GeoJSONSource | undefined;
      src?.setData(data);
    };
    const setVis = (id: string, on: boolean) => {
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    };

    setData('earthquakes', {
      type: 'FeatureCollection',
      features: earthquakes.map((e) => ({
        type: 'Feature',
        properties: { ...e },
        geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
      })),
    });

    setData('disasters', {
      type: 'FeatureCollection',
      features: disasters.map((d) => ({
        type: 'Feature',
        properties: { ...d },
        geometry: { type: 'Point', coordinates: [d.lon, d.lat] },
      })),
    });

    const mergedFlights = [
      ...(layers.flights ? flights : []),
      ...(layers.military ? militaryFlights : []),
    ];
    setData('flights', {
      type: 'FeatureCollection',
      features: mergedFlights.map((f) => ({
        type: 'Feature',
        properties: { ...f },
        geometry: { type: 'Point', coordinates: [f.lon, f.lat] },
      })),
    });

    setData('satellites', {
      type: 'FeatureCollection',
      features: satellites.map((s) => ({
        type: 'Feature',
        properties: { ...s },
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      })),
    });

    setData('orbit-path', selectedSat ? computeOrbitPathGeoJSON(selectedSat) : EMPTY_FC);

    setData('kiwisdr', {
      type: 'FeatureCollection',
      features: kiwisdr.map((k) => ({
        type: 'Feature',
        properties: { ...k },
        geometry: { type: 'Point', coordinates: [k.lon, k.lat] },
      })),
    });

    setData('aurora', {
      type: 'FeatureCollection',
      features: auroraPoints.map((a) => ({
        type: 'Feature',
        properties: { prob: a.prob },
        geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
      })),
    });

    setData('ships', {
      type: 'FeatureCollection',
      features: ships.map((s) => ({
        type: 'Feature',
        properties: { ...s },
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      })),
    });

    setData('fires', {
      type: 'FeatureCollection',
      features: fires.map((f) => ({
        type: 'Feature',
        properties: { ...f },
        geometry: { type: 'Point', coordinates: [f.lon, f.lat] },
      })),
    });

    setData('cameras', {
      type: 'FeatureCollection',
      features: cameras.map((c) => ({
        type: 'Feature',
        properties: { id: c.id, name: c.name, city: c.city },
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
      })),
    });

    setVis('eq-core', layers.earthquakes);
    setVis('eq-pulse', layers.earthquakes);
    setVis('faults-line', layers.faults);
    setVis('disasters-pt', layers.disasters);
    setVis('flights-pt', layers.flights || layers.military);
    setVis('satellites-pt', layers.satellites);
    setVis('orbit-path-line', layers.satellites && !!selectedSat);
    setVis('kiwisdr-pt', layers.kiwisdr);
    setVis('aurora-glow', layers.aurora);
    setVis('cables-line', layers.cables);
    setVis('ships-pt', layers.ships);
    setVis('fires-pt', layers.fires);
    setVis('cameras-pt', layers.cameras);
    setVis('terminator-fill', layers.terminator);
    setVis('terminator-line', layers.terminator);
  }, [
    earthquakes,
    disasters,
    flights,
    militaryFlights,
    satellites,
    selectedSat,
    kiwisdr,
    auroraPoints,
    ships,
    fires,
    cameras,
    layers,
  ]);

  // Smooth Fly-To Camera
  useEffect(() => {
    if (!flyTarget || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyTarget.lon, flyTarget.lat],
      zoom: flyTarget.zoom ?? 6.2,
      pitch: 34,
      speed: 1.35,
      essential: true,
    });
  }, [flyTarget]);

  return <div ref={containerRef} className="w-full h-full" />;
}
