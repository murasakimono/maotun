import { useState } from 'react';
import { Download, KeyRound, Upload, Volume2, VolumeX, X } from 'lucide-react';
import type { ApiKeysConfig, LiveCamera } from '../types';
import { sound } from '../sound';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  config: ApiKeysConfig;
  onSaveConfig: (next: ApiKeysConfig) => void;
  cameras: LiveCamera[];
  onImportCameras: (cams: LiveCamera[]) => void;
}

export function SettingsModal({
  open,
  onClose,
  config,
  onSaveConfig,
  cameras,
  onImportCameras,
}: SettingsModalProps) {
  const [draft, setDraft] = useState<ApiKeysConfig>(config);
  const [importMsg, setImportMsg] = useState('');

  if (!open) return null;

  const handleSave = () => {
    sound.playClick();
    sound.enabled = draft.soundEnabled;
    onSaveConfig(draft);
    onClose();
  };

  const handleExportCams = () => {
    sound.playClick();
    const blob = new Blob([JSON.stringify(cameras, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maotun-cameras.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) {
          onImportCameras(parsed);
          setImportMsg(`${parsed.length} KAMERA İÇE AKTARILDI`);
          sound.playPing();
        } else {
          setImportMsg('GEÇERSİZ JSON DİZİSİ');
        }
      } catch {
        setImportMsg('JSON OKUMA HATASI');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-lg inst-panel reticle-corner overflow-hidden">
        <div className="px-4 py-3 border-b border-[#242830] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#FF4D00]" />
            <span className="font-semibold text-sm tracking-wide uppercase">
              SİSTEM & OPSİYONEL ANAHTAR AYARLARI
            </span>
          </div>
          <button onClick={onClose} className="inst-btn p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Mechanical Sound */}
          <div className="inst-plate p-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide">
                Mekanik Enstrüman Sesleri
              </div>
              <div className="font-mono-tech text-[10px] text-[#7C8492]">
                Şalter tıkırtısı, koordinat sonar pinging ve sismik alarm tonu
              </div>
            </div>
            <button
              onClick={() => {
                const next = !draft.soundEnabled;
                setDraft({ ...draft, soundEnabled: next });
                sound.enabled = next;
                if (next) sound.playToggle(true);
              }}
              className={`inst-btn px-3 py-1.5 ${draft.soundEnabled ? 'inst-btn-active' : ''}`}
            >
              {draft.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {draft.soundEnabled ? 'AÇIK' : 'KAPALI'}
            </button>
          </div>

          {/* Optional Free API Keys */}
          <div className="space-y-2.5">
            <div className="font-mono-tech text-[10px] uppercase tracking-widest text-[#FF4D00]">
              OPSİYONEL ÜCRETSİZ VERİ ANAHTARLARI (LOKALDE SAKLANIR)
            </div>

            <div className="space-y-1">
              <label className="block font-mono-tech text-[10px] text-[#9BA3B0]">
                NASA FIRMS MAP_KEY (Küresel VIIRS Canlı Termal Yangınlar)
              </label>
              <input
                value={draft.firmsKey}
                onChange={(e) => setDraft({ ...draft, firmsKey: e.target.value })}
                placeholder="firms.modaps.eosdis.nasa.gov/api/map_key (Opsiyonel)"
                className="w-full bg-[#08090B] border border-[#242830] px-2.5 py-2 font-mono-tech text-xs text-[#ECEEF2] focus:outline-none focus:border-[#FF4D00]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono-tech text-[10px] text-[#9BA3B0]">
                AISSTREAM.IO API KEY (Küresel Canlı Gemi WebSocket — Boğazlar/Süveyş)
              </label>
              <input
                value={draft.aisstreamKey}
                onChange={(e) => setDraft({ ...draft, aisstreamKey: e.target.value })}
                placeholder="aisstream.io (Boş bırakılırsa Baltık Digitraffic kullanılır)"
                className="w-full bg-[#08090B] border border-[#242830] px-2.5 py-2 font-mono-tech text-xs text-[#ECEEF2] focus:outline-none focus:border-[#FF4D00]"
              />
            </div>
          </div>

          {/* Local Ollama */}
          <div className="space-y-2.5 pt-2 border-t border-[#1D2129]">
            <div className="font-mono-tech text-[10px] uppercase tracking-widest text-[#00D4FF]">
              LOKAL OLLAMA BÖLGE BRİFİNGİ
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={draft.ollamaEndpoint}
                onChange={(e) => setDraft({ ...draft, ollamaEndpoint: e.target.value })}
                placeholder="http://127.0.0.1:11434"
                className="bg-[#08090B] border border-[#242830] px-2.5 py-1.5 font-mono-tech text-xs text-[#ECEEF2] focus:outline-none focus:border-[#00D4FF]"
              />
              <input
                value={draft.ollamaModel}
                onChange={(e) => setDraft({ ...draft, ollamaModel: e.target.value })}
                placeholder="qwen2.5:3b"
                className="bg-[#08090B] border border-[#242830] px-2.5 py-1.5 font-mono-tech text-xs text-[#ECEEF2] focus:outline-none focus:border-[#00D4FF]"
              />
            </div>
          </div>

          {/* Camera JSON Import / Export */}
          <div className="space-y-2 pt-2 border-t border-[#1D2129]">
            <div className="font-mono-tech text-[10px] uppercase tracking-widest text-[#00E58A]">
              KAMERA KOLEKSİYONU YEDEKLE / AKTAR ({cameras.length} KAYNAK)
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExportCams} className="inst-btn px-3 py-1.5 flex-1">
                <Download className="w-3.5 h-3.5" /> JSON DIŞA AKTAR
              </button>
              <label className="inst-btn px-3 py-1.5 flex-1 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> JSON İÇE AKTAR
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
            </div>
            {importMsg && (
              <div className="font-mono-tech text-[10px] text-[#00E58A]">{importMsg}</div>
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-[#242830] bg-[#090A0D] flex justify-end gap-2">
          <button onClick={onClose} className="inst-btn px-3 py-1.5">
            İPTAL
          </button>
          <button onClick={handleSave} className="inst-btn inst-btn-orange px-4 py-1.5">
            KAYDET & UYGULA
          </button>
        </div>
      </div>
    </div>
  );
}
