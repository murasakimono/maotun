import { useEffect, useMemo, useRef, useState } from 'react';
import { Command, CornerDownLeft, Search } from 'lucide-react';
import { sound } from '../sound';

export interface PaletteAction {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: PaletteAction[];
}

export function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions.slice(0, 14);
    return actions
      .filter(
        (a) =>
          a.label.toLowerCase().includes(q) ||
          a.group.toLowerCase().includes(q) ||
          (a.hint && a.hint.toLowerCase().includes(q))
      )
      .slice(0, 14);
  }, [actions, query]);

  useEffect(() => {
    setIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' && filtered[idx]) {
        e.preventDefault();
        sound.playClick();
        filtered[idx].run();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, idx, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-start justify-center pt-[14vh] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl inst-panel reticle-corner"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[#242830]">
          <Search className="w-4 h-4 text-[#FF4D00]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="KOMUT, ŞEHİR, KATMAN VEYA UYDU ARA... (ÖR: ISS, TOKYO, RADAR, OTOPİLOT)"
            className="flex-1 bg-transparent font-mono-tech text-xs text-[#ECEEF2] placeholder-[#5A6270] focus:outline-none"
          />
          <span className="font-mono-tech text-[10px] px-1.5 py-0.5 border border-[#242830] text-[#7C8492]">
            ESC
          </span>
        </div>

        <div className="max-h-[340px] overflow-y-auto divide-y divide-[#1A1D24]">
          {filtered.length === 0 && (
            <div className="p-4 font-mono-tech text-xs text-[#6B7280] text-center">
              EŞLEŞEN KOMUT BULUNAMADI
            </div>
          )}
          {filtered.map((a, i) => (
            <button
              key={a.id}
              onClick={() => {
                sound.playClick();
                a.run();
                onClose();
              }}
              onMouseEnter={() => setIdx(i)}
              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition ${
                i === idx
                  ? 'bg-[#FF4D00]/15 border-l-2 border-l-[#FF4D00] text-white'
                  : 'text-[#C8CDD6] hover:bg-[#15181F]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono-tech text-[9px] px-1.5 py-0.5 bg-[#15181F] border border-[#242830] text-[#7C8492] shrink-0">
                  {a.group}
                </span>
                <span className="text-xs font-medium truncate">{a.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.hint && (
                  <span className="font-mono-tech text-[10px] text-[#7C8492]">{a.hint}</span>
                )}
                {i === idx && <CornerDownLeft className="w-3.5 h-3.5 text-[#FF4D00]" />}
              </div>
            </button>
          ))}
        </div>

        <div className="px-3.5 py-1.5 border-t border-[#242830] bg-[#090A0D] flex items-center justify-between font-mono-tech text-[10px] text-[#5E6673]">
          <span className="flex items-center gap-1.5">
            <Command className="w-3 h-3 text-[#FF4D00]" /> MAOTUN KOMUT PALETİ
          </span>
          <span>↑↓ SEÇ • ENTER UYGULA</span>
        </div>
      </div>
    </div>
  );
}
