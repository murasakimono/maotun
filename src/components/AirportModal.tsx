import { useEffect, useState } from 'react';
import { PlaneLanding, PlaneTakeoff, RefreshCw, X } from 'lucide-react';
import type { MajorAirport } from '../data/airports';
import type { FlightItem } from '../types';
import { api } from '../api';

interface AirportModalProps {
  airport: MajorAirport | null;
  onClose: () => void;
}

export function AirportModal({ airport, onClose }: AirportModalProps) {
  const [flights, setFlights] = useState<FlightItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!airport) return;
    setLoading(true);
    const list = await api.getFlights(airport.lat, airport.lon, 35).catch(() => []);
    setFlights(list);
    setLoading(false);
  };

  useEffect(() => {
    if (airport) load();
  }, [airport?.iata]);

  if (!airport) return null;

  const lowAlt = flights.filter((f) => f.alt_ft > 0 && f.alt_ft <= 12000).sort((a, b) => a.alt_ft - b.alt_ft);
  const cruising = flights.filter((f) => f.alt_ft > 12000).sort((a, b) => a.alt_ft - b.alt_ft);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl atlas-glass rounded-2xl overflow-hidden flex flex-col max-h-[82vh]">
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-tech text-xs font-bold px-2 py-0.5 rounded bg-[#E5A952] text-[#090B0E]">
                {airport.iata}
              </span>
              <span className="text-sm font-semibold text-white">{airport.name}</span>
            </div>
            <div className="text-xs text-[#8E95A3] mt-0.5">
              {airport.city} ({airport.country}) • 35 nm çevresinde {flights.length} canlı uçuş
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={load} className="atlas-btn p-1.5">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E5A952]' : ''}`} />
            </button>
            <button onClick={onClose} className="atlas-btn p-1.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-[#4ADE80] flex items-center gap-1.5">
              <PlaneLanding className="w-3.5 h-3.5" /> İniş / Alçak Yaklaşma (&lt;12.000 ft)
            </div>
            {lowAlt.length === 0 && <div className="text-xs text-[#5C6372]">Şu an alçak yaklaşmada uçak yok.</div>}
            {lowAlt.slice(0, 12).map((f) => (
              <div key={f.hex} className="rounded-lg bg-white/[0.03] px-3 py-2 flex justify-between text-xs">
                <div>
                  <div className="font-mono-tech font-semibold text-white">{f.callsign || f.hex}</div>
                  <div className="text-[10px] text-[#8E95A3]">{f.aircraft_type} • HDG {Math.round(f.heading)}°</div>
                </div>
                <div className="text-right font-mono-tech text-[11px]">
                  <div className="text-[#4ADE80]">{f.alt_ft} ft</div>
                  <div className="text-[#8E95A3]">{Math.round(f.speed_kt)} kt</div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-[#60A5FA] flex items-center gap-1.5">
              <PlaneTakeoff className="w-3.5 h-3.5" /> Tırmanış / Bölge Geçişi (&gt;12.000 ft)
            </div>
            {cruising.length === 0 && <div className="text-xs text-[#5C6372]">Şu an yüksek irtifada uçak yok.</div>}
            {cruising.slice(0, 12).map((f) => (
              <div key={f.hex} className="rounded-lg bg-white/[0.03] px-3 py-2 flex justify-between text-xs">
                <div>
                  <div className="font-mono-tech font-semibold text-white">{f.callsign || f.hex}</div>
                  <div className="text-[10px] text-[#8E95A3]">{f.aircraft_type} • Squawk {f.squawk}</div>
                </div>
                <div className="text-right font-mono-tech text-[11px]">
                  <div className="text-[#60A5FA]">{f.alt_ft} ft</div>
                  <div className="text-[#8E95A3]">{Math.round(f.speed_kt)} kt</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
