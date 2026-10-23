import React from 'react';
import { 
  Trophy, 
  Award, 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  Calendar, 
  Users, 
  MapPin, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Team, EventItem } from '../../types';

interface FinisherCertificateModalProps {
  team: Team | null;
  event?: EventItem;
  rank?: number;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const FinisherCertificateModal: React.FC<FinisherCertificateModalProps> = ({
  team,
  event,
  rank,
  isOpen,
  onClose,
  onShowToast,
}) => {
  if (!isOpen || !team) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    onShowToast(`Menyiapkan sertifikat resmi untuk Tim "${team.name}"...`);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const eventName = event?.title || 'Amazing Race & Orienteering Championship';
  const eventDate = event?.date || 'Oktober 2026';
  const eventLocation = event?.location || 'Taman Nasional Gunung Gede Pangrango';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        {/* Modal Top Action Bar */}
        <div className="bg-[#0b192c] text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-400" />
            <h3 className="font-extrabold text-sm sm:text-base text-white">
              E-Sertifikat Finisher Resmi
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Canvas / Container */}
        <div className="p-4 sm:p-8 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
          <div className="border-8 border-double border-amber-600/30 p-6 sm:p-8 rounded-2xl bg-white shadow-xl relative overflow-hidden text-center">
            {/* Background watermark badge */}
            <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-amber-500/5 flex items-center justify-center pointer-events-none">
              <Trophy className="w-28 h-28 text-amber-500/10" />
            </div>

            {/* Certificate Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>OFFICIAL FINISHER CERTIFICATE OF ACHIEVEMENT</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight uppercase">
                Sertifikat Penghargaan Finisher
              </h1>
              <p className="text-xs text-slate-500 font-serif italic">
                Diberikan dengan bangga dan hormat kepada regu:
              </p>
            </div>

            {/* Team Name Hero */}
            <div className="my-5 py-3 border-y border-amber-200/80 bg-amber-50/30">
              <span className="text-[10px] font-mono text-orange-600 font-extrabold block uppercase tracking-wider">
                NOMOR BIB: {team.bibNumber}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0b192c] tracking-tight">
                {team.name}
              </h2>
              <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                Kategori: {team.category}
              </span>
            </div>

            {/* Achievement text */}
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-lg mx-auto">
              Telah berhasil menyelesaikan seluruh tantangan navigasi pos, teka-teki sandi, dan orientasi rute alam terbuka pada ajang resmi:
            </p>
            <p className="text-sm font-extrabold text-[#0b192c] mt-1">
              "{eventName}"
            </p>

            {/* Key Record Badges */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 my-5 max-w-md mx-auto text-center">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="block text-[10px] text-slate-500 font-medium">Total Skor</span>
                <span className="font-extrabold text-slate-900 text-base sm:text-lg text-emerald-600">
                  {team.totalScore} Pts
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="block text-[10px] text-slate-500 font-medium">Pos Tuntas</span>
                <span className="font-extrabold text-slate-900 text-base sm:text-lg">
                  {team.checkpointsCompleted}/{team.totalCheckpoints}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="block text-[10px] text-slate-500 font-medium">Peringkat</span>
                <span className="font-extrabold text-slate-900 text-base sm:text-lg text-orange-600">
                  {rank ? `Juara #${rank}` : 'Finisher'}
                </span>
              </div>
            </div>

            {/* Team Members */}
            <div className="text-xs text-slate-600 max-w-md mx-auto mb-6">
              <div className="font-semibold text-slate-800 text-[11px] mb-1">
                Susunan Anggota Regu:
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {team.members.map((m, i) => (
                  <span 
                    key={i} 
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200"
                  >
                    {m.name} ({m.role})
                  </span>
                ))}
              </div>
            </div>

            {/* Signatures & Seal */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 items-end gap-4 text-center">
              <div>
                <div className="h-10 flex items-center justify-center">
                  <span className="font-serif italic font-bold text-slate-700 text-sm">
                    Ir. Hendra Kusuma
                  </span>
                </div>
                <div className="w-24 h-0.5 bg-slate-300 mx-auto"></div>
                <span className="text-[10px] text-slate-500 block mt-1 font-medium">
                  Direktur Perlombaan
                </span>
              </div>

              <div className="hidden sm:flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full border-2 border-amber-600/60 bg-amber-500/10 flex flex-col items-center justify-center text-amber-800 p-1">
                  <ShieldCheck className="w-5 h-5 text-amber-700" />
                  <span className="text-[7px] font-extrabold uppercase leading-none mt-0.5">OFFICIAL SEAL</span>
                </div>
              </div>

              <div>
                <div className="h-10 flex items-center justify-center">
                  <span className="font-serif italic font-bold text-slate-700 text-sm">
                    Rian Pratama, M.Sc
                  </span>
                </div>
                <div className="w-24 h-0.5 bg-slate-300 mx-auto"></div>
                <span className="text-[10px] text-slate-500 block mt-1 font-medium">
                  Ketua Dewan Juri
                </span>
              </div>
            </div>

            {/* Location & Date Footer */}
            <div className="mt-4 pt-2 text-[10px] text-slate-400 flex items-center justify-center gap-2">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>{eventLocation}</span>
              <span>•</span>
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{eventDate}</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Sertifikat dapat disimpan sebagai PDF atau dicetak untuk piagam penghargaan resmi anggota tim.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#0b192c] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-orange-400" />
              <span>Cetak Piagam</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
