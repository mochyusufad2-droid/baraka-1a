import React, { useState } from 'react';
import { Info, Sparkles, X, CheckCircle2, AlertTriangle, ArrowRight, Award, Megaphone } from 'lucide-react';

interface DemoNoticeBannerProps {
  onOpenRoadmapModal: () => void;
}

export const DemoNoticeBanner: React.FC<DemoNoticeBannerProps> = ({ onOpenRoadmapModal }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white text-xs sm:text-sm border-b border-orange-500/30 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-orange-500 text-white text-[10px] tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3 h-3" /> Anti-Speedrun: Jeda Minimum Antar-Pos & Cetak Massal QR/BIB
          </span>
          <span className="text-slate-300">
            Cegah kecurangan peserta dengan pelacakan jeda minimum antar-pos di pengaturan event, live countdown timer, serta cetak massal stiker QR pos & kartu nomor dada tim!
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenRoadmapModal}
            className="text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
          >
            Lihat Progres Tahap 5
          </button>
          <button
            onClick={() => setDismissed(true)}
            title="Sembunyikan pesan"
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoadmapModal: React.FC<RoadmapModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0b192c] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Progres Pengembangan Tahap 5</h3>
              <p className="text-xs text-slate-300">Cetak Massal BIB & QR, Kelola Tim Lengkap, Bank Misi & Matriks Skor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
          {/* Box 1: Peningkatan Tahap 5 */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Kemampuan Lengkap Tahap 5:</span>
            </div>
            <ul className="list-disc list-inside space-y-2 text-emerald-900 text-xs sm:text-sm pl-1">
              <li><strong>Pelacakan Waktu Jeda Minimum Antar-Pos (Anti-Speedrun):</strong> Konfigurasi jeda minimum (detik/menit) di Pengaturan Event & Platform untuk memblokir peserta menyelesaikan pos berturut-turut tanpa berpindah fisik. Dilengkapi hitung mundur real-time di antarmuka HP peserta, opsi kebijakan blokir/peringatan, dan Live Cooldown Monitor per tim.</li>
              <li><strong>Cetak Semua QR Pos Sekaligus (Batch QR Print):</strong> Dialog interaktif untuk mencetak stiker barcode semua pos ke kertas A4 dengan pilihan kolom (2, 3, 1, 4), style kontras tinggi atau warna, serta tombol cetak bersih dan unduh CSV.</li>
              <li><strong>Cetak Semua Nomor BIB Tim Sekaligus (Batch BIB Print):</strong> Dialog pencetakan tag dada/nomor BIB resmi peserta dengan barcode scan login cepat, nomor dada tebal, daftar personel, kontak medis, dan garis gunting A4.</li>
              <li><strong>Kelola & Edit Tim Penuh:</strong> Panitia dapat mengedit nama tim, kategori, nomor BIB, PIN login, susunan anggota, menyesuaikan bonus/penalti poin, serta menghapus tim dengan konfirmasi aman.</li>
              <li><strong>Bank Misi & Challenge Kustom:</strong> Formulir pembuatan tantangan baru (foto, sandi azimuth, ketangkasan fisik, kuis pengetahuan) yang langsung ditautkan ke pos checkpoint dengan pengaturan bobot nilai.</li>
              <li><strong>Matriks Skor & Penalti Interaktif:</strong> Pengaturan nilai scan pos standar, penalti keterlambatan per menit, bonus tim tercepat, dan sinkronisasi otomatis ke seluruh pos.</li>
            </ul>
          </div>

          {/* Box 2: Karakteristik Penyimpanan */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span>Penyimpanan Data Ramah Pemula</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Seluruh data event, pos, tim, pesan siaran, dan nilai tersimpan aman di penyimpanan lokal peramban (*browser storage*). Tersedia tombol reset di Pengaturan untuk mengembalikan data awal kapan saja tanpa risiko merusak sistem.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#0b192c] hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            Tutup & Lanjutkan Pengujian
          </button>
        </div>
      </div>
    </div>
  );
};
