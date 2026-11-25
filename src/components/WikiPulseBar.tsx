import { useEffect, useState } from 'react';
import { Globe, X } from 'lucide-react';

interface WikiEdit {
  id: number;
  wiki: string;
  title: string;
  user: string;
  url: string;
}

interface WikiPulseBarProps {
  open: boolean;
  onClose: () => void;
}

export function WikiPulseBar({ open, onClose }: WikiPulseBarProps) {
  const [edits, setEdits] = useState<WikiEdit[]>([]);
  const [onlyTr, setOnlyTr] = useState(false);

  useEffect(() => {
    if (!open) return;
    const es = new EventSource('https://stream.wikimedia.org/v2/stream/recentchange');
    es.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data);
        if (d.type !== 'edit' || d.bot) return;
        const srv: string = d.server_name || '';
        if (onlyTr && srv !== 'tr.wikipedia.org') return;
        if (!srv.endsWith('wikipedia.org')) return;
        const item: WikiEdit = {
          id: d.id || Date.now() + Math.random(),
          wiki: srv.split('.')[0].toUpperCase(),
          title: d.title || '',
          user: d.user || '',
          url: d.meta?.uri || `https://${srv}/wiki/${encodeURIComponent(d.title || '')}`,
        };
        setEdits((prev) => [item, ...prev].slice(0, 14));
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, [open, onlyTr]);

  if (!open) return null;

  return (
    <div className="fixed top-16 left-4 z-30 w-[310px] max-w-[85vw] atlas-glass rounded-2xl overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-[#E5A952]" />
          <span className="text-xs font-semibold">Canlı Vikipedi Nabzı</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setEdits([]);
              setOnlyTr((v) => !v);
            }}
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono-tech cursor-pointer ${
              onlyTr ? 'bg-[#E5A952] text-[#090B0E] font-semibold' : 'bg-white/10 text-[#C4C9D4]'
            }`}
          >
            {onlyTr ? 'SADECE TR' : 'TÜM DÜNYA'}
          </button>
          <button onClick={onClose} className="atlas-btn p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-h-[260px] overflow-y-auto divide-y divide-white/[0.06] p-1">
        {edits.length === 0 && (
          <div className="p-4 text-center text-xs text-[#8E95A3]">
            Canlı düzenleme akışı bekleniyor...
          </div>
        )}
        {edits.map((e) => (
          <a
            key={e.id}
            href={e.url}
            target="_blank"
            rel="noreferrer"
            className="block px-2.5 py-2 rounded-lg hover:bg-white/[0.05] transition"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono-tech text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-[#E5A952]">
                {e.wiki}
              </span>
              <span className="text-xs text-[#E6E8EC] truncate">{e.title}</span>
            </div>
            <div className="text-[10px] text-[#5C6372] mt-0.5 truncate">Düzenleyen: {e.user}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
