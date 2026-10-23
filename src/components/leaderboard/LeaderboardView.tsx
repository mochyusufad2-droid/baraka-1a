import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Clock, 
  Users, 
  MapPin, 
  RefreshCw, 
  Filter, 
  Search, 
  Sparkles,
  Download,
  FileSpreadsheet,
  Printer,
  FileText
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { Team } from '../../types';
import { LeaderboardPdfReportModal } from './LeaderboardPdfReportModal';

import { exportLeaderboardToExcel, exportLeaderboardToCsv } from '../../utils/exportLeaderboard';

interface LeaderboardViewProps {
  onShowToast: (msg: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onShowToast }) => {
  const { teams, events, refreshDataFromStorage } = useRace();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Auto Polling State (30 seconds)
  const [isAutoPolling, setIsAutoPolling] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(30);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
  });

  const currentEvent = events[0];

  // Function to perform state refresh
  const triggerRefresh = (isManual = false) => {
    setIsRefreshing(true);
    if (refreshDataFromStorage) {
      refreshDataFromStorage();
    }
    const updatedTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
    setLastUpdatedTime(updatedTime);
    setCountdown(30);

    setTimeout(() => {
      setIsRefreshing(false);
      if (isManual) {
        onShowToast('Papan skor diperbarui dengan data terkini!');
      }
    }, 400);
  };

  // Automatic Polling Interval (every 30 seconds)
  useEffect(() => {
    if (!isAutoPolling) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerRefresh(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoPolling, refreshDataFromStorage]);

  const handleManualRefresh = () => {
    triggerRefresh(true);
  };

  // Toggle Auto Polling ON/OFF
  const toggleAutoPolling = () => {
    setIsAutoPolling((prev) => {
      const next = !prev;
      if (next) {
        setCountdown(30);
        onShowToast('🔄 Polling otomatis leaderboard setiap 30 detik DIATIFKAN.');
      } else {
        onShowToast('⏸️ Polling otomatis DIJEDA.');
      }
      return next;
    });
  };

  // Sort teams by totalScore descending, then by duration
  const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);

  const filteredTeams = sortedTeams.filter((t) => {
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.bibNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Direct Excel (.XLSX) Export
  const handleExportExcel = () => {
    try {
      const fileName = exportLeaderboardToExcel(filteredTeams, currentEvent, filterCategory);
      onShowToast(`📊 File Excel (.XLSX) "${fileName}" berhasil diunduh!`);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      onShowToast('Gagal mengunduh file Excel. Mencoba format CSV...');
      handleExportCsv();
    }
  };

  // Direct CSV Export
  const handleExportCsv = () => {
    const fileName = exportLeaderboardToCsv(filteredTeams, currentEvent, filterCategory);
    onShowToast(`📑 File CSV "${fileName}" berhasil diunduh!`);
  };

  // Top 3 Podium
  const top1 = filteredTeams[0];
  const top2 = filteredTeams[1];
  const top3 = filteredTeams[2];

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0b192c] via-slate-900 to-blue-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold uppercase tracking-wider">
            <span className={`w-2 h-2 rounded-full ${isAutoPolling ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
            <span>Live Stage Leaderboard • Real-Time Polling 30 Detik</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Papan Peringkat Balapan Terkini
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Perhitungan skor otomatis menggabungkan pos checkpoint, waktu tempuh, bonus juri, dan penalti pelanggaran.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
            <button
              onClick={handleManualRefresh}
              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sinkronkan Skor</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-600/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              title="Unduh rekapitulasi data lengkap ke spreadsheet Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Ekspor Excel (.XLSX)</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-700/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              title="Unduh data skor peringkat ke format CSV"
            >
              <Download className="w-4 h-4 text-teal-200" />
              <span>Ekspor CSV</span>
            </button>

            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span>Cetak / Ekspor PDF Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Polling Real-Time Status Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full ${isAutoPolling ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`} />
            <div className={`w-2.5 h-2.5 rounded-full absolute ${isAutoPolling ? 'bg-emerald-400' : 'bg-slate-400'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">
                {isAutoPolling ? 'SINKRONISASI REAL-TIME (POLLING 30d)' : 'POLLING OTOMATIS DIJEDA'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-orange-400 border border-slate-700">
                {isAutoPolling ? `${countdown}s` : 'OFF'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Terakhir diperbarui: <span className="font-mono text-slate-200 font-semibold">{lastUpdatedTime}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress Bar indicator for 30s countdown */}
          {isAutoPolling && (
            <div className="hidden md:flex items-center gap-2">
              <div className="w-28 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-orange-500 to-emerald-400 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 30) * 100}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={toggleAutoPolling}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isAutoPolling
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isAutoPolling ? 'Auto-Update: Aktif (30d)' : 'Aktifkan Auto-Update'}</span>
          </button>
        </div>
      </div>

      {/* Podium Stage for Top 3 */}
      {filteredTeams.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-6">
          {/* Rank 2 (Perak) */}
          {top2 && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md text-center space-y-2 order-2 md:order-1 relative">
              <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-700 font-black text-lg flex items-center justify-center mx-auto shadow-sm">
                🥈
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 tracking-wider">
                Peringkat 2
              </span>
              <h3 className="font-extrabold text-slate-900 text-base">{top2.name}</h3>
              <p className="text-xs text-slate-500">{top2.category}</p>
              <div className="text-2xl font-black text-slate-700 pt-1 font-mono">{top2.totalScore} Pts</div>
              <div className="text-[11px] text-slate-500">
                {top2.checkpointsCompleted}/{top2.totalCheckpoints} Pos • {top2.lastPosName}
              </div>
            </div>
          )}

          {/* Rank 1 (Emas - Highest) */}
          {top1 && (
            <div className="bg-gradient-to-b from-amber-50/90 to-white rounded-2xl p-6 border-2 border-amber-400 shadow-xl text-center space-y-2 order-1 md:order-2 md:-translate-y-4 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-white text-[11px] font-black uppercase tracking-wider shadow">
                👑 Pemimpin Lomba
              </div>
              <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-400 text-amber-600 font-black text-2xl flex items-center justify-center mx-auto shadow-md pt-1">
                🏆
              </div>
              <span className="text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 tracking-wider">
                Peringkat 1
              </span>
              <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">{top1.name}</h3>
              <p className="text-xs text-slate-600 font-medium">{top1.category}</p>
              <div className="text-3xl font-black text-amber-600 pt-1 font-mono">{top1.totalScore} Pts</div>
              <div className="text-xs font-semibold text-slate-600">
                {top1.checkpointsCompleted}/{top1.totalCheckpoints} Pos Selesai • {top1.lastPosName}
              </div>
            </div>
          )}

          {/* Rank 3 (Perunggu) */}
          {top3 && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md text-center space-y-2 order-3 relative">
              <div className="w-12 h-12 rounded-full bg-amber-50 border-2 border-amber-600 text-amber-800 font-black text-lg flex items-center justify-center mx-auto shadow-sm">
                🥉
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 tracking-wider">
                Peringkat 3
              </span>
              <h3 className="font-extrabold text-slate-900 text-base">{top3.name}</h3>
              <p className="text-xs text-slate-500">{top3.category}</p>
              <div className="text-2xl font-black text-amber-800 pt-1 font-mono">{top3.totalScore} Pts</div>
              <div className="text-[11px] text-slate-500">
                {top3.checkpointsCompleted}/{top3.totalCheckpoints} Pos • {top3.lastPosName}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama regu atau nomor BIB..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Kategori:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Semua Kategori</option>
              <option value="Korporat / Perusahaan">Korporat / Perusahaan</option>
              <option value="Divisi Komersial">Divisi Komersial</option>
              <option value="Divisi Operasional & IT">Divisi Operasional & IT</option>
              <option value="Divisi Keuangan & Risiko">Divisi Keuangan & Risiko</option>
              <option value="Divisi Human Capital">Divisi Human Capital</option>
              <option value="Umum & Komunitas">Umum & Komunitas</option>
              <option value="Pelajar & Mahasiswa">Pelajar & Mahasiswa</option>
            </select>
          </div>

          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Buka laporan pratinjau cetak PDF & ekspor CSV"
          >
            <Printer className="w-3.5 h-3.5 text-orange-400" />
            <span>Ekspor / Print Laporan</span>
          </button>
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0b192c] text-white uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-4 text-center w-16">Peringkat</th>
                <th className="p-4">Regu / Tim</th>
                <th className="p-4">BIB</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Pos Selesai</th>
                <th className="p-4">Pos Terakhir</th>
                <th className="p-4">Poin Dasar</th>
                <th className="p-4">Bonus Juri</th>
                <th className="p-4 font-bold text-orange-400 font-mono text-right">Total Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeams.map((t, idx) => (
                <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 text-center font-mono font-black text-slate-800 text-sm">
                    {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                    <div className="text-[11px] text-slate-500">Ketua: {t.members[0]?.name || '-'}</div>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-600">{t.bibNumber}</td>
                  <td className="p-4 text-slate-600">{t.category}</td>
                  <td className="p-4">
                    <span className="font-bold text-slate-800">{t.checkpointsCompleted}</span> / {t.totalCheckpoints}
                  </td>
                  <td className="p-4 text-slate-600">{t.lastPosName}</td>
                  <td className="p-4 font-mono text-slate-600">{t.points}</td>
                  <td className="p-4 text-emerald-600 font-bold">+{t.bonusPoints}</td>
                  <td className="p-4 font-black text-orange-600 text-base font-mono text-right">
                    {t.totalScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leaderboard PDF Report Modal */}
      <LeaderboardPdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        event={currentEvent}
        teams={teams}
        categoryFilter={filterCategory}
        onShowToast={onShowToast}
      />
    </div>
  );
};

