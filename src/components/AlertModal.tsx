import React, { useState } from 'react';
import { Bell, Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import type { AlertRule, EarthquakeItem } from '../types';

interface AlertModalProps {
  rules: AlertRule[];
  earthquakes: EarthquakeItem[];
  onAddRule: (rule: AlertRule) => void;
  onDeleteRule: (id: string) => void;
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  rules,
  earthquakes,
  onAddRule,
  onDeleteRule,
  onClose,
}) => {
  const [label, setLabel] = useState('');
  const [keyword, setKeyword] = useState('');
  const [minMag, setMinMag] = useState(4.0);

  const triggered = earthquakes.filter((q) =>
    rules.some(
      (r) =>
        r.enabled &&
        q.mag >= r.minMag &&
        (r.keyword.trim() === '' || q.title.toLowerCase().includes(r.keyword.toLowerCase()))
    )
  );

  const handleAdd = () => {
    if (!label.trim()) return;
    onAddRule({
      id: `rule-${Date.now()}`,
      label: label.trim(),
      keyword: keyword.trim(),
      minMag,
      enabled: true,
    });
    setLabel('');
    setKeyword('');
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="glass-console w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] font-mono-tech text-amber-400 uppercase tracking-widest">
                BÖLGESEL AKILLI ALARM MOTORU
              </div>
              <div className="text-sm font-bold text-white">CANLI İZLEME KURALLARI</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Active Triggered Alerts */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono-tech text-red-400 uppercase">
              TETİKLENEN CANLI ALARMLAR ({triggered.length})
            </div>
            {triggered.length === 0 ? (
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/50 text-xs font-mono-tech text-emerald-300">
                Kurallarına uyan kritik bir sarsıntı şu an yok.
              </div>
            ) : (
              triggered.slice(0, 6).map((q) => (
                <div key={q.id} className="p-3 bg-red-950/30 border border-red-600/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">{q.title}</div>
                      <div className="text-[10px] font-mono-tech text-red-200">{q.source} • {q.time_str}</div>
                    </div>
                  </div>
                  <span className="font-mono-tech font-bold text-red-300">M{q.mag.toFixed(1)}</span>
                </div>
              ))
            )}
          </div>

          {/* Rules List */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono-tech text-slate-400 uppercase">KAYITLI KURALLAR</div>
            {rules.map((r) => (
              <div key={r.id} className="p-3 bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{r.label}</div>
                  <div className="text-[10px] font-mono-tech text-slate-400">
                    Bölge filtresi: {r.keyword || 'TÜM DÜNYA'} • Eşik: M ≥ {r.minMag.toFixed(1)}
                  </div>
                </div>
                <button onClick={() => onDeleteRule(r.id)} className="text-slate-500 hover:text-red-400 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Rule */}
          <div className="pt-3 border-t border-white/10 grid grid-cols-12 gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Alarm adı (örn: Marmara 4.0+)"
              className="col-span-5 bg-black/50 border border-white/15 px-2.5 py-2 text-xs text-white"
            />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Bölge (örn: Hatay, Marmara)"
              className="col-span-4 bg-black/50 border border-white/15 px-2.5 py-2 text-xs text-white"
            />
            <input
              type="number"
              step="0.5"
              min="1"
              max="8"
              value={minMag}
              onChange={(e) => setMinMag(Number(e.target.value))}
              className="col-span-1 bg-black/50 border border-white/15 px-2 py-2 text-xs font-mono-tech text-white"
            />
            <button
              onClick={handleAdd}
              className="col-span-2 bg-amber-500/25 border border-amber-400 text-amber-200 text-xs font-mono-tech uppercase flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> EKLE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
