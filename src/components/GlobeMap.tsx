import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type {
  DisasterItem,
  EarthquakeItem,
  FlightItem,
  LayerState,
  LiveCamera,
  SatelliteItem,
} from '../types';

interface GlobeMapProps {
  earthquakes: EarthquakeItem[];
  disasters: DisasterItem[];
  flights: FlightItem[];
  satellites: SatelliteItem[];
  cameras: LiveCamera[];
  layers: LayerState;
  selectedCoords: { lat: number; lon: number } | null;
  flyTarget: { lat: number; lon: number; zoom: number; ts: number } | null;
  onMapClick: (lat: number, lon: number) => void;
  onSelectCamera: (cam: LiveCamera) => void;
}

export const GlobeMap: React.FC<GlobeMapProps> = ({
  earthquakes,
  disasters,
  flights,
  satellites,
  cameras,
  layers,
  selectedCoords,
  flyTarget,
  onMapClick,
  onSelectCamera,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const camMarkersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [32.5, 39.0], // Starts centered gracefully on Turkey & Europe
      zoom: 4.2,
      pitch: 12,
      attributionControl: false,
    });

    map.on('style.load', () => {
      try {
        map.setProjection({ type: 'globe' });
      } catch {}

      // Earthquakes source & pulsing rings
      map.addSource('quakes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'quakes-glow',
        type: 'circle',
        source: 'quakes',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 1, 8, 5, 24, 7, 40],
          'circle-color': ['case', ['>=', ['get', 'mag'], 4.0], '#ef4444', '#f59e0b'],
          'circle-opacity': 0.24,
        },
      });
      map.addLayer({
        id: 'quakes-core',
        type: 'circle',
        source: 'quakes',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 1, 3, 5, 7, 7, 11],
          'circle-color': ['case', ['>=', ['get', 'mag'], 4.0], '#f87171', '#fbbf24'],
          'circle-stroke-width': 1.2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Disasters (NASA EONET)
      map.addSource('disasters', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'disasters-layer',
        type: 'circle',
        source: 'disasters',
        paint: {
          'circle-radius': 7,
          'circle-color': '#fb923c',
          'circle-opacity': 0.85,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#fff7ed',
        },
      });

      // Flights (ADS-B)
      map.addSource('flights', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'flights-layer',
        type: 'circle',
        source: 'flights',
        paint: {
          'circle-radius': 4,
          'circle-color': '#38bdf8',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#0c4a6e',
        },
      });

      // Satellites (ISS + Orbitals)
      map.addSource('satellites', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'satellites-glow',
        type: 'circle',
        source: 'satellites',
        paint: {
          'circle-radius': 14,
          'circle-color': '#a78bfa',
          'circle-opacity': 0.26,
        },
      });
      map.addLayer({
        id: 'satellites-core',
        type: 'circle',
        source: 'satellites',
        paint: {
          'circle-radius': 5,
          'circle-color': '#c4b5fd',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
    });

    map.on('click', (e) => {
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly to searched/preset city smoothly
  useEffect(() => {
    if (!flyTarget || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyTarget.lon, flyTarget.lat],
      zoom: flyTarget.zoom,
      duration: 1600,
      essential: true,
    });
  }, [flyTarget]);

  // Selected target ring marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (!selectedCoords) return;

    const el = document.createElement('div');
    el.className = 'w-6 h-6 rounded-full border-2 border-sky-300 bg-sky-400/20 shadow-[0_0_24px_#38bdf8] animate-ping';
    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([selectedCoords.lon, selectedCoords.lat])
      .addTo(map);
  }, [selectedCoords]);

  // Update GeoJSON data layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const setSrc = (id: string, features: GeoJSON.Feature[]) => {
      const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData({ type: 'FeatureCollection', features });
    };

    setSrc(
      'quakes',
      layers.earthquakes
        ? earthquakes.map((q) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [q.lon, q.lat] },
            properties: { mag: q.mag, title: q.title },
          }))
        : []
    );

    setSrc(
      'disasters',
      layers.disasters
        ? disasters.map((d) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [d.lon, d.lat] },
            properties: { title: d.title },
          }))
        : []
    );

    setSrc(
      'flights',
      layers.flights
        ? flights.map((f) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [f.lon, f.lat] },
            properties: { callsign: f.callsign },
          }))
        : []
    );

    setSrc(
      'satellites',
      layers.satellites
        ? satellites.map((s) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
            properties: { name: s.name },
          }))
        : []
    );
  }, [earthquakes, disasters, flights, satellites, layers]);

  // Camera pins on globe
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    camMarkersRef.current.forEach((m) => m.remove());
    camMarkersRef.current = [];
    if (!layers.cameras) return;

    cameras
      .filter((c) => c.lat !== 0 || c.lon !== 0)
      .forEach((cam) => {
        const el = document.createElement('button');
        el.className =
          'px-1.5 py-0.5 text-[9px] font-mono-tech bg-black/80 border border-emerald-400/70 text-emerald-300 hover:bg-emerald-500 hover:text-black transition cursor-pointer';
        el.textContent = `● ${cam.city.toUpperCase()}`;
        el.onclick = (ev) => {
          ev.stopPropagation();
          onSelectCamera(cam);
        };
        const m = new maplibregl.Marker({ element: el }).setLngLat([cam.lon, cam.lat]).addTo(map);
        camMarkersRef.current.push(m);
      });
  }, [cameras, layers.cameras]);

  return <div ref={containerRef} className="w-full h-full" />;
};
