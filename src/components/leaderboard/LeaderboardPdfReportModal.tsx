import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Trophy, 
  Award, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  Building2,
  Calendar,
  MapPin
} from 'lucide-react';
import { Team, EventItem } from '../../types';
import { exportLeaderboardToExcel, exportLeaderboardToCsv } from '../../utils/exportLeaderboard';

interface LeaderboardPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: EventItem;
  teams: Team[];
  categoryFilter?: string;
  onShowToast: (msg: string) => void;
}

export const LeaderboardPdfReportModal: React.FC<LeaderboardPdfReportModalProps> = ({
  isOpen,
  onClose,
  event,
  teams,
  categoryFilter = 'all',
  onShowToast,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Filter & Sort teams
  const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const filteredTeams = sortedTeams.filter((t) => 
    categoryFilter === 'all' || t.category === categoryFilter
  );

  const champion = filteredTeams[0];
  const runnerUp = filteredTeams[1];
  const thirdPlace = filteredTeams[2];

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentTimeStr = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  }) + ' WIB';

  // --- 1. Export Excel Handler ---
  const handleExportExcel = () => {
    try {
      const fileName = exportLeaderboardToExcel(filteredTeams, event, categoryFilter);
      onShowToast(`📊 File Excel (.XLSX) "${fileName}" berhasil diunduh!`);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      onShowToast('Gagal mengunduh Excel. Mengalihkan ke CSV...');
      handleExportCsv();
    }
  };

  // --- 2. Export CSV Handler ---
  const handleExportCsv = () => {
    const fileName = exportLeaderboardToCsv(filteredTeams, event, categoryFilter);
    onShowToast(`📑 File CSV "${fileName}" berhasil diunduh!`);
  };

  // --- 3. Print / Export to PDF Handler ---
  const handlePrintPdf = () => {
    window.print();
    onShowToast('🖨️ Menyiapkan dokumen laporan resmi untuk cetak / simpan ke PDF...');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {/* Container */}
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Modal Toolbar (Screen-Only) */}
        <div className="p-4 sm:p-5 bg-[#0b192c] text-white flex items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-slate-950 flex items-center justify-center font-extrabold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Pratinjau Laporan PDF, Excel & CSV Leaderboard</h3>
              <p className="text-xs text-slate-300">
                Laporan resmi hasil perlombaan siap cetak / simpan PDF dan ekspor Excel/CSV data lengkap.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
              title="Unduh file Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span className="hidden sm:inline">Ekspor Excel (.XLSX)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-700/20 flex items-center gap-1.5 cursor-pointer transition-all"
              title="Unduh file CSV"
            >
              <Download className="w-4 h-4 text-teal-200" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 text-slate-900 bg-white font-sans print:p-0 print:overflow-visible" ref={printRef}>
          {/* Printable Document CSS Rules */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-container, .print-container * {
                visibility: visible;
              }
              .print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 15mm;
                background: white;
                color: black;
              }
              .print:hidden {
                display: none !important;
              }
              page-break-inside-avoid {
                page-break-inside: avoid;
              }
            }
          `}</style>

          <div className="print-container space-y-6">
            {/* Kop Surat / Document Official Header */}
            <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-slate-900 text-white font-black text-xs uppercase tracking-widest">
                    RACEPOINT OFFICIAL REPORT
                  </span>
                  <span className="text-xs text-slate-500 font-bold font-mono">DOKUMEN RESMI PANITIA</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 tracking-tight">
                  {event?.title || 'LAPORAN HASIL AKHIR PERLOMBAAN'}
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  {event?.subtitle || 'Papan Peringkat Resmi & Klasemen Akhir Peserta'}
                </p>
              </div>

              <div className="text-left sm:text-right text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0">
                <div className="flex items-center sm:justify-end gap-1.5 text-slate-700 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-orange-600" />
                  <span>{currentDateStr}</span>
                </div>
                <div className="flex items-center sm:justify-end gap-1.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{event?.location || 'Lokasi Lomba'}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Penyelenggara: <strong>{event?.organizerName || 'Panitia Pelaksana'}</strong>
                </div>
              </div>
            </div>

            {/* Event Summary Stat Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Tim Terdata</span>
                <span className="text-lg font-black text-slate-900 font-mono">{filteredTeams.length} Tim</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] text-amber-800 font-bold uppercase block">Juara 1 (Skor Tertinggi)</span>
                <span className="text-lg font-black text-amber-900 font-mono">{champion ? `${champion.totalScore} Pts` : '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Kategori Terpilih</span>
                <span className="text-xs font-bold text-slate-900 truncate block mt-1">{categoryFilter === 'all' ? 'Semua Kategori' : categoryFilter}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Waktu Pencetakan</span>
                <span className="text-xs font-mono font-bold text-slate-800 block mt-1">{currentTimeStr}</span>
              </div>
            </div>

            {/* Top 3 Podium Winners Summary Card */}
            {filteredTeams.length >= 3 && (
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 page-break-inside-avoid">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>RINGKASAN PODIUM PEMENANG PERLOMBAAN</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Disahkan Panitia</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  {/* Runner Up */}
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <div className="text-base">🥈</div>
                    <div className="font-extrabold text-white text-xs mt-1">{runnerUp?.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">BIB {runnerUp?.bibNumber}</div>
                    <div className="font-mono font-bold text-slate-300 text-sm mt-1">{runnerUp?.totalScore} Pts</div>
                  </div>

                  {/* Champion */}
                  <div className="p-3 rounded-xl bg-gradient-to-b from-amber-500/20 to-slate-800 border border-amber-500/40">
                    <div className="text-lg">🥇</div>
                    <div className="font-black text-amber-300 text-xs sm:text-sm mt-1">{champion?.name}</div>
                    <div className="text-[10px] text-amber-200/80 font-mono">BIB {champion?.bibNumber}</div>
                    <div className="font-mono font-black text-amber-400 text-base mt-1">{champion?.totalScore} Pts</div>
                  </div>

                  {/* Third Place */}
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <div className="text-base">🥉</div>
                    <div className="font-extrabold text-white text-xs mt-1">{thirdPlace?.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">BIB {thirdPlace?.bibNumber}</div>
                    <div className="font-mono font-bold text-slate-300 text-sm mt-1">{thirdPlace?.totalScore} Pts</div>
                  </div>
                </div>
              </div>
            )}

            {/* Official Full Standings Table */}
            <div className="space-y-2">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
                TABEL KLASEMEN RESMI PERLOMBAAN
              </h3>

              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 text-center border-r border-slate-800 w-12">Rank</th>
                      <th className="p-2.5 border-r border-slate-800">BIB</th>
                      <th className="p-2.5 border-r border-slate-800">Nama Tim & Regu</th>
                      <th className="p-2.5 border-r border-slate-800">Kategori</th>
                      <th className="p-2.5 text-center border-r border-slate-800">Pos</th>
                      <th className="p-2.5 text-right border-r border-slate-800">Poin Pos</th>
                      <th className="p-2.5 text-right border-r border-slate-800">Bonus</th>
                      <th className="p-2.5 text-right border-r border-slate-800">Penalti</th>
                      <th className="p-2.5 text-right font-black border-r border-slate-800">Total Skor</th>
                      <th className="p-2.5 text-center">Durasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTeams.map((t, idx) => (
                      <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="p-2.5 text-center font-mono font-extrabold text-slate-900 border-r border-slate-200">
                          {idx === 0 ? '1 (Emas)' : idx === 1 ? '2 (Perak)' : idx === 2 ? '3 (Prg)' : `#${idx + 1}`}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-700 border-r border-slate-200">
                          {t.bibNumber}
                        </td>
                        <td className="p-2.5 border-r border-slate-200">
                          <div className="font-extrabold text-slate-900">{t.name}</div>
                          <div className="text-[10px] text-slate-500">Ketua: {t.members[0]?.name || '-'}</div>
                        </td>
                        <td className="p-2.5 text-slate-700 border-r border-slate-200 text-[11px]">
                          {t.category}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-800 border-r border-slate-200">
                          {t.checkpointsCompleted}/{t.totalCheckpoints}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700 border-r border-slate-200">
                          {t.points}
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-700 font-bold border-r border-slate-200">
                          +{t.bonusPoints}
                        </td>
                        <td className="p-2.5 text-right font-mono text-rose-600 font-bold border-r border-slate-200">
                          -{t.penaltyPoints} {t.penaltyMinutes ? `(+${t.penaltyMinutes}m)` : ''}
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-slate-900 text-sm border-r border-slate-200 bg-amber-50/30">
                          {t.totalScore}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-700">
                          {t.durationMinutes}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Formal Sign-off Signature Block */}
            <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-xs page-break-inside-avoid">
              <div className="space-y-12">
                <p className="text-slate-600 font-semibold">
                  Disahkan oleh,<br />
                  <strong>Direktur Perlombaan (Race Director)</strong>
                </p>
                <div className="space-y-1">
                  <p className="font-extrabold underline text-slate-900">
                    ({event?.organizerName || 'Panitia Utama Perlombaan'})
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">NIP / ID Panitia Pelaksana</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="text-slate-600 font-semibold">
                  Mengetahui,<br />
                  <strong>Ketua Dewan Juri & Evaluator Pos</strong>
                </p>
                <div className="space-y-1">
                  <p className="font-extrabold underline text-slate-900">
                    ( Dewan Juri Lapangan )
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">RacePoint Verification System</p>
                </div>
              </div>
            </div>

            {/* Footer Watermark */}
            <div className="pt-4 text-center text-[10px] text-slate-400 font-mono border-t border-slate-200 flex items-center justify-between">
              <span>Sistem Pencatatan Skor Otomatis RacePoint V2</span>
              <span>Dokumen ini dicetak otomatis pada {currentDateStr} {currentTimeStr}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
