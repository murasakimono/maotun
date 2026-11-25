import { useEffect, useState } from 'react';
import { ArrowLeftRight, Droplets, Wind, X } from 'lucide-react';
import type { CountryContext, NewsItem, RichForecast } from '../types';
import { api } from '../api';
import { QUICK_CITIES } from '../cameras';
import { COST_OF_LIVING } from '../data/worldCulture';
import { weatherCodeText } from '../geo';
import { sound } from '../sound';

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
}

interface CitySlotData {
  forecast: RichForecast | null;
  ctx: CountryContext | null;
  news: NewsItem[];
  loading: boolean;
}

export function CompareModal({ open, onClose }: CompareModalProps) {
  const [leftIdx, setLeftIdx] = useState(0); // İstanbul
  const [rightIdx, setRightIdx] = useState(4); // Tokyo
  const [leftData, setLeftData] = useState<CitySlotData>({ forecast: null, ctx: null, news: [], loading: false });
  const [rightData, setRightData] = useState<CitySlotData>({ forecast: null, ctx: null, news: [], loading: false });

  useEffect(() => {
    if (!open) return;
    const cL = QUICK_CITIES[leftIdx];
    const cR = QUICK_CITIES[rightIdx];

    setLeftData((p) => ({ ...p, loading: true }));
    Promise.all([
      api.getForecastRich(cL.lat, cL.lon).catch(() => null),
      api.getCountryContext(cL.country_code).catch(() => null),
      api.getNews(`${cL.name} ${cL.country}`).catch(() => []),
    ]).then(([forecast, ctx, news]) => setLeftData({ forecast, ctx, news, loading: false }));

    setRightData((p) => ({ ...p, loading: true }));
    Promise.all([
      api.getForecastRich(cR.lat, cR.lon).catch(() => null),
      api.getCountryContext(cR.country_code).catch(() => null),
      api.getNews(`${cR.name} ${cR.country}`).catch(() => []),
    ]).then(([forecast, ctx, news]) => setRightData({ forecast, ctx, news, loading: false }));
  }, [open, leftIdx, rightIdx]);

  if (!open) return null;

  const renderColumn = (
    idx: number,
    onChange: (n: number) => void,
    data: CitySlotData
  ) => {
    const c = QUICK_CITIES[idx];
    const fc = data.forecast;
    return (
      <div className="flex-1 rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-3.5">
        <select
          value={idx}
          onChange={(e) => { sound.playClick(); onChange(Number(e.target.value)); }}
          className="w-full bg-[#090B0E] border border-white/15 rounded-xl px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-[#E5A952]"
        >
          {QUICK_CITIES.map((city, i) => (
            <option key={city.name} value={i}>
              {city.name}, {city.country} ({city.country_code})
            </option>
          ))}
        </select>

        {data.loading && <div className="text-xs text-[#E5A952] animate-pulse">Veriler çekiliyor...</div>}

        {fc && (
          <>
            <div className="flex items-end justify-between">
              <div>
                <div className="font-mono-tech text-4xl font-semibold text-white">{Math.round(fc.temp_c)}°</div>
                <div className="text-xs text-[#8E95A3] mt-0.5">
                  {weatherCodeText(fc.weather_code)} • Hissedilen {Math.round(fc.apparent_c)}°
                </div>
              </div>
              <div className="text-right font-mono-tech text-xs text-[#8E95A3] space-y-0.5">
                <div className="flex items-center justify-end gap-1"><Wind className="w-3 h-3" /> {Math.round(fc.wind_kmh)} km/s</div>
                <div className="flex items-center justify-end gap-1"><Droplets className="w-3 h-3" /> %{Math.round(fc.humidity)}</div>
                <div>AQI <span className={fc.us_aqi > 100 ? 'text-[#E85D4A]' : 'text-[#4ADE80]'}>{fc.us_aqi || '--'}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/[0.07]">
              <div className="rounded-lg bg-white/[0.03] p-2">
                <div className="text-[10px] text-[#8E95A3]">PM2.5 / Toz</div>
                <div className="font-mono-tech text-white">{fc.pm25.toFixed(1)} / {fc.dust.toFixed(0)} µg</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-2">
                <div className="text-[10px] text-[#8E95A3]">Deniz Suyu</div>
                <div className="font-mono-tech text-white">
                  {fc.sea_temp_c !== null ? `${fc.sea_temp_c.toFixed(1)}°C` : 'İç Bölge'}
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-white/[0.07]">
              <div className="text-[11px] font-semibold text-[#8E95A3]">5 Günlük Özet</div>
              {fc.daily.slice(0, 5).map((d, i) => (
                <div key={d.date} className="flex justify-between text-xs">
                  <span className="text-[#C4C9D4]">
                    {i === 0 ? 'Bugün' : new Date(d.date).toLocaleDateString('tr-TR', { weekday: 'short' })}
                  </span>
                  <span className="text-[#8E95A3]">{weatherCodeText(d.weather_code)}</span>
                  <span className="font-mono-tech text-white">
                    {Math.round(d.temp_min)}° / {Math.round(d.temp_max)}°
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {COST_OF_LIVING[c.name] && (
          <div className="pt-2 border-t border-white/[0.07] space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#E5A952]">Yaşam Maliyeti & Alım Gücü</span>
              <span className="font-mono-tech text-[10px] text-[#8E95A3]">
                Endeks {COST_OF_LIVING[c.name].index}/100
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono-tech text-[11px]">
              <div className="rounded bg-white/[0.03] px-2 py-1">1+1 Kira: ${COST_OF_LIVING[c.name].rent1bUsd}</div>
              <div className="rounded bg-white/[0.03] px-2 py-1">Yemek: ${COST_OF_LIVING[c.name].mealUsd}</div>
              <div className="rounded bg-white/[0.03] px-2 py-1">Kahve: ${COST_OF_LIVING[c.name].coffeeUsd}</div>
              <div className="rounded bg-white/[0.03] px-2 py-1">Ulaşım: ${COST_OF_LIVING[c.name].transitUsd}</div>
            </div>
          </div>
        )}

        {data.ctx && (
          <div className="pt-2 border-t border-white/[0.07] text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[#8E95A3]">Kur ({data.ctx.local_currency})</span>
              <span className="font-mono-tech text-[#E5A952]">
                {data.ctx.local_to_try
                  ? `1 ${data.ctx.local_currency} = ${data.ctx.local_to_try.toFixed(2)} ₺`
                  : `USD ${data.ctx.usd_try.toFixed(2)} ₺`}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8E95A3] shrink-0">Sıradaki Tatil</span>
              <span className="text-[#C4C9D4] truncate">{data.ctx.next_holiday}</span>
            </div>
          </div>
        )}

        {data.news.length > 0 && (
          <div className="pt-2 border-t border-white/[0.07] space-y-1">
            <div className="text-[11px] font-semibold text-[#8E95A3]">Son Başlıklar</div>
            {data.news.slice(0, 2).map((n, i) => (
              <a
                key={i}
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="block text-[11px] text-[#C4C9D4] hover:text-[#E5A952] truncate"
              >
                • {n.title}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl atlas-glass rounded-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ArrowLeftRight className="w-4 h-4 text-[#E5A952]" />
            <span className="text-sm font-semibold">Canlı Çoklu Bölge Karşılaştırma</span>
          </div>
          <button onClick={onClose} className="atlas-btn p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          {renderColumn(leftIdx, setLeftIdx, leftData)}
          {renderColumn(rightIdx, setRightIdx, rightData)}
        </div>
      </div>
    </div>
  );
}
