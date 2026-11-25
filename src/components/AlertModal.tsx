import { useState } from 'react';
import { Bell, Plus, Trash2, X } from 'lucide-react';
import type { AlertRule } from '../types';
import { sound } from '../sound';

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  rules: AlertRule[];
  onSaveRules: (rules: AlertRule[]) => void;
}

export function AlertModal({ open, onClose, rules, onSaveRules }: AlertModalProps) {
  const [label, setLabel] = useState('');
  const [keyword, setKeyword] = useState('');
  const [minMag, setMinMag] = useState(4.0);

  if (!open) return null;

  const addRule = () => {
    if (!keyword.trim()) return;
    sound.playClick();
    onSaveRules([
      ...rules,
      {
        id: `rule-${Date.now()}`,
        label: label.trim() || `${keyword.trim()} M≥${minMag}`,
        keyword: keyword.trim(),
        minMag,
        enabled: true,
      },
    ]);
    setLabel('');
    setKeyword('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-md inst-panel reticle-corner overflow-hidden">
        <div className="px-4 py-3 border-b border-[#242830] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#FF4D00]" />
            <span className="font-semibold text-sm uppercase tracking-wide">
              BÖLGESEL SİSMİK ALARM KURALLARI
            </span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="inst-btn p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {rules.map((r) => (
              <div
                key={r.id}
                className="inst-plate px-3 py-2 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-medium text-[#ECEEF2]">{r.label}</div>
                  <div className="font-mono-tech text-[10px] text-[#7C8492]">
                    ANAHTAR: "{r.keyword}" • EŞİK: M≥{r.minMag.toFixed(1)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    onSaveRules(rules.filter((x) => x.id !== r.id));
                  }}
                  className="inst-btn p-1.5 hover:border-[#FF2A3B] hover:text-[#FF2A3B]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-[#242830] pt-3 space-y-2">
            <div className="font-mono-tech text-[10px] text-[#FF4D00]">YENİ ALARM KURALI</div>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Kural adı (ör. Marmara Sismik)"
              className="w-full bg-[#08090B] border border-[#242830] px-2.5 py-1.5 font-mono-tech text-xs text-[#ECEEF2] focus:outline-none focus:border-[#FF4D00]"
            />
            <div className="flex gap-2">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Bölge (Hatay, İstanbul, Ege)"
                className="flex-1 bg-[#08090B] border border-[#242830] px-2.5 py-1.5 font-mono-tech text-xs text-[#ECEEF2] focus:outline-none focus:border-[#FF4D00]"
              />
              <input
                type="number"
                step="0.5"
                min="1"
                max="9"
                value={minMag}
                onChange={(e) => setMinMag(parseFloat(e.target.value) || 3.5)}
                className="w-20 bg-[#08090B] border border-[#242830] px-2 py-1.5 font-mono-tech text-xs text-[#ECEEF2]"
              />
            </div>
            <button onClick={addRule} className="w-full inst-btn inst-btn-orange py-2">
              <Plus className="w-3.5 h-3.5" /> KURAL EKLE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
