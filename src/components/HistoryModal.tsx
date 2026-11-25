import { useEffect, useState } from 'react';
import { Clock, ExternalLink, X } from 'lucide-react';
import type { HistoryEvent } from '../types';
import { api } from '../api';

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
}

export function HistoryModal({ open, onClose }: HistoryModalProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || events.length > 0) return;
    setLoading(true);
    api
      .getOnThisDay()
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const todayLabel = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl atlas-glass rounded-2xl overflow-hidden flex flex-col max-h-[84vh]">
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#E5A952]" />
            <span className="text-sm font-semibold">Tarihsel Zaman Makinesi — {todayLabel} Tarihte Bugün</span>
          </div>
          <button onClick={onClose} className="atlas-btn p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-2.5">
          {loading && <div className="text-xs text-[#E5A952] animate-pulse">Wikimedia tarih arşivi yükleniyor...</div>}
          {events.map((ev, i) => (
            <div key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 flex items-start gap-3">
              <span className="font-mono-tech text-xs font-semibold px-2 py-1 rounded-lg bg-[#E5A952]/15 text-[#E5A952] shrink-0">
                {ev.year}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#E6E8EC] leading-relaxed">{ev.text}</div>
                {ev.url && (
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#60A5FA] hover:underline mt-1"
                  >
                    {ev.title} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
