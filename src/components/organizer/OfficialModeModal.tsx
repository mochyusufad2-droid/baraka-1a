import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  Clock, 
  Trophy,
  Trash2,
  Compass
} from 'lucide-react';

interface OfficialModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: {
    title: string;
    location: string;
    date: string;
    timeRange: string;
    description: string;
    preserveCheckpoints: boolean;
  }) => void;
  currentEventTitle?: string;
  currentLocation?: string;
}

export const OfficialModeModal: React.FC<OfficialModeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentEventTitle = 'Lomba Orienteering & Amazing Race 2026',
  currentLocation = 'Area Terbuka / Kawasan Perlombaan'
}) => {
  const [title, setTitle] = useState(
    currentEventTitle.includes('Demo') 
      ? 'Kejuaraan Orienteering & Amazing Race 2026' 
      : currentEventTitle
  );
  const [location, setLocation] = useState(
    currentLocation.includes('Kebun Raya') 
      ? currentLocation 
      : 'Area Terbuka / Kawasan Perlombaan'
  );
  const [date, setDate] = useState(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  });
  const [timeRange, setTimeRange] = useState('08:00 - 12:00 WIB');
  const [description, setDescription] = useState(
    'Event resmi perlombaan orienteering dan amazing race dengan navigasi peta, scan QR checkpoint, dan live scoring real-time.'
  );
  const [preserveCheckpoints, setPreserveCheckpoints] = useState(true);
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) return;
    onConfirm({
      title: title.trim(),
      location: location.trim(),
      date: date.trim() || 'Hari Ini',
      timeRange: timeRange.trim() || '08:00 - 12:00 WIB',
      description: description.trim(),
      preserveCheckpoints,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Header with Emerald Gradient */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 p-6 text-white relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  Konfigurasi Siap Hari-H
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Aktifkan Mode Resmi (Live Event)
                </h3>
                <p className="text-xs text-emerald-100/90 mt-0.5">
                  Beralih dari mode demo/simulasi ke sistem perlombaan nyata yang bersih dan terverifikasi.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Summary Box: What Will Happen */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Otomatis Dijalankan Saat Mode Resmi Aktif:</span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                <span><strong>Bersihkan Data Dummy:</strong> Seluruh tim simulasi & dummy dihapus dari leaderboard.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                <span><strong>Reset Timer & Status:</strong> Jam diatur ke 00:00:00 dan status menjadi SIAP (Ready).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                <span><strong>Bersihkan Log & Chat:</strong> Feed aktivitas dan siaran darurat di-reset bersih.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                <span><strong>Kunci Panel Simulasi:</strong> Generator dummy dinonaktifkan agar tidak tercampur saat lomba.</span>
              </li>
            </ul>
          </div>

          {/* Form Fields for the Official Event */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-orange-500" />
                Informasi Event Resmi
              </h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap Event Resmi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Kejuaraan Orienteering Nasional 2026 / Amazing Race Mandiri"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-slate-800 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lokasi Kawasan Lomba <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Contoh: Kawasan Hutan Lindung Sentul"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-slate-800 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal & Rentang Waktu
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="Contoh: 25 Oktober 2026"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-slate-800 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Checkpoint Option */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Pilihan Pos Kontrol (Checkpoints):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  preserveCheckpoints 
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="checkpointOption"
                    checked={preserveCheckpoints}
                    onChange={() => setPreserveCheckpoints(true)}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <span className="block font-bold">Gunakan Template Pos yang Ada</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Pos dan QR yang sudah ada dipertahankan (koordinat dan nama pos bisa Anda sesuaikan).
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  !preserveCheckpoints 
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="checkpointOption"
                    checked={!preserveCheckpoints}
                    onChange={() => setPreserveCheckpoints(false)}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <span className="block font-bold">Mulai dengan 0 Pos Bersih</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Daftar pos dikosongkan agar Anda dapat menginput pos baru dari awal.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Safety Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-emerald-600 w-4 h-4 rounded"
              />
              <span className="leading-relaxed">
                Saya mengonfirmasi untuk beralih ke <strong>Mode Resmi</strong>. Data tim dummy akan dibersihkan, dan sistem siap untuk pendaftaran tim resmi dan pelepasan lomba nyata.
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Batalkan
            </button>

            <button
              type="submit"
              disabled={!agreed || !title.trim()}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                agreed && title.trim()
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-500/25'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Konfirmasi & Mulai Mode Resmi</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
