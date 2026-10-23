import React, { useState } from 'react';
import { 
  Trophy, 
  Download, 
  Medal, 
  Clock, 
  CheckCircle, 
  FileSpreadsheet, 
  ExternalLink,
  Share2,
  FileText,
  Award,
  Printer
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { Team } from '../../types';
import { FinisherCertificateModal } from '../common/FinisherCertificateModal';
import { LeaderboardPdfReportModal } from '../leaderboard/LeaderboardPdfReportModal';

import { exportLeaderboardToExcel, exportLeaderboardToCsv } from '../../utils/exportLeaderboard';

interface ResultsViewProps {
  onOpenLeaderboard: () => void;
  onShowToast: (msg: string) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  onOpenLeaderboard,
  onShowToast,
}) => {
  const { teams, events } = useRace();
  const [selectedCertTeam, setSelectedCertTeam] = useState<Team | null>(null);
  const [selectedCertRank, setSelectedCertRank] = useState<number | undefined>(undefined);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Sort teams dynamically by totalScore descending
  const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const champion = sortedTeams[0];
  const runnerUp = sortedTeams[1];
  const thirdPlace = sortedTeams[2];

  const handleExportExcel = () => {
    try {
      const fileName = exportLeaderboardToExcel(sortedTeams, events[0], 'all');
      onShowToast(`📊 File Excel (.XLSX) "${fileName}" berhasil diunduh!`);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      onShowToast('Gagal mengunduh Excel. Mengalihkan ke CSV...');
      handleExportCsv();
    }
  };

  const handleExportCsv = () => {
    const fileName = exportLeaderboardToCsv(sortedTeams, events[0], 'all');
    onShowToast(`📑 File CSV "${fileName}" berhasil diunduh!`);
  };

  const handleOpenCertificate = (team: Team, rank?: number) => {
    setSelectedCertTeam(team);
    setSelectedCertRank(rank);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0b192c]">Hasil & Klasemen Akhir</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-600" />
              PODIUM FINAL
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekapitulasi resmi perolehan nilai pos, bonus juri lapangan, podium pemenang, dan e-sertifikat digital.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={onOpenLeaderboard}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Layar Penuh</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Ekspor rekap data ke spreadsheet Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
            <span>Ekspor Excel (.XLSX)</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-700/20 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Ekspor rekap data ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-teal-200" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-orange-400" />
            <span>Cetak PDF Report</span>
          </button>
        </div>
      </div>

      {/* Top 3 Podium Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
        {/* Juara 2 (Perak) */}
        {runnerUp && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative order-2 md:order-1 hover:border-slate-400 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-300 text-slate-800 text-[10px] font-extrabold uppercase tracking-wider">
              Juara 2 (Perak)
            </div>
            <div className="text-center pt-3 space-y-1">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-extrabold text-lg flex items-center justify-center mx-auto mb-2">
                🥈
              </div>
              <h3 className="font-bold text-slate-900 text-base">{runnerUp.name}</h3>
              <p className="text-xs text-slate-500">{runnerUp.category} • BIB {runnerUp.bibNumber}</p>
              <div className="text-xl font-bold text-slate-700 pt-2 font-mono">{runnerUp.totalScore} Poin</div>
              <p className="text-[11px] text-slate-500">
                {runnerUp.checkpointsCompleted}/{runnerUp.totalCheckpoints} Pos • {runnerUp.durationMinutes} Menit
              </p>
              <div className="pt-3">
                <button
                  onClick={() => handleOpenCertificate(runnerUp, 2)}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Award className="w-3.5 h-3.5 text-slate-600" />
                  <span>Lihat E-Sertifikat</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Juara 1 (Emas) */}
        {champion && (
          <div className="bg-gradient-to-b from-amber-50 to-orange-50/30 rounded-2xl p-6 border-2 border-amber-400 shadow-lg relative order-1 md:order-2 md:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Juara 1 (Emas)
            </div>
            <div className="text-center pt-3 space-y-1">
              <div className="w-12 h-12 rounded-full bg-amber-400 text-white font-extrabold text-2xl flex items-center justify-center mx-auto mb-2 shadow-md">
                🥇
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">{champion.name}</h3>
              <p className="text-xs text-slate-600">{champion.category} • BIB {champion.bibNumber}</p>
              <div className="text-3xl font-black text-amber-600 pt-2 font-mono">{champion.totalScore} Poin</div>
              <p className="text-[11px] text-slate-500 font-medium">
                {champion.checkpointsCompleted}/{champion.totalCheckpoints} Pos • {champion.durationMinutes} Menit
              </p>
              <div className="pt-3">
                <button
                  onClick={() => handleOpenCertificate(champion, 1)}
                  className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20 transition-all"
                >
                  <Award className="w-4 h-4" />
                  <span>Cetak Piagam Juara 1</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Juara 3 (Perunggu) */}
        {thirdPlace && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative order-3 hover:border-amber-400 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-700 text-white text-[10px] font-extrabold uppercase tracking-wider">
              Juara 3 (Perunggu)
            </div>
            <div className="text-center pt-3 space-y-1">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 font-extrabold text-lg flex items-center justify-center mx-auto mb-2">
                🥉
              </div>
              <h3 className="font-bold text-slate-900 text-base">{thirdPlace.name}</h3>
              <p className="text-xs text-slate-500">{thirdPlace.category} • BIB {thirdPlace.bibNumber}</p>
              <div className="text-xl font-bold text-amber-800 pt-2 font-mono">{thirdPlace.totalScore} Poin</div>
              <p className="text-[11px] text-slate-500">
                {thirdPlace.checkpointsCompleted}/{thirdPlace.totalCheckpoints} Pos • {thirdPlace.durationMinutes} Menit
              </p>
              <div className="pt-3">
                <button
                  onClick={() => handleOpenCertificate(thirdPlace, 3)}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Award className="w-3.5 h-3.5 text-amber-700" />
                  <span>Lihat E-Sertifikat</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-sm">Tabel Peringkat Lengkap ({sortedTeams.length} Tim)</h3>
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Data sinkron otomatis dengan pos lapangan
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3.5">Rank</th>
                <th className="p-3.5">BIB</th>
                <th className="p-3.5">Nama Tim</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5">Pos Tuntas</th>
                <th className="p-3.5">Poin Dasar</th>
                <th className="p-3.5">Bonus / Penalti</th>
                <th className="p-3.5 font-bold">Total Skor</th>
                <th className="p-3.5">Durasi</th>
                <th className="p-3.5 text-center">Piagam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTeams.map((t, idx) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-slate-900">
                    {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                  </td>
                  <td className="p-3.5 font-mono font-bold text-slate-600">{t.bibNumber}</td>
                  <td className="p-3.5 font-bold text-slate-900">{t.name}</td>
                  <td className="p-3.5 text-slate-600">{t.category}</td>
                  <td className="p-3.5 text-slate-700">{t.checkpointsCompleted}/{t.totalCheckpoints} Pos</td>
                  <td className="p-3.5 font-mono text-slate-700">{t.points}</td>
                  <td className="p-3.5 text-[11px]">
                    <span className="text-emerald-600 font-medium">+{t.bonusPoints}</span> / <span className="text-red-500 font-medium">-{t.penaltyPoints}</span>
                  </td>
                  <td className="p-3.5 font-extrabold text-orange-600 text-sm font-mono">{t.totalScore}</td>
                  <td className="p-3.5 font-mono text-slate-600">{t.durationMinutes}m</td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleOpenCertificate(t, idx + 1)}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer border border-amber-200 transition-colors"
                      title={`Lihat piagam penghargaan untuk ${t.name}`}
                    >
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      <span>Sertifikat</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Finisher Certificate Modal */}
      <FinisherCertificateModal
        isOpen={Boolean(selectedCertTeam)}
        team={selectedCertTeam}
        rank={selectedCertRank}
        event={events[0]}
        onClose={() => setSelectedCertTeam(null)}
        onShowToast={onShowToast}
      />

      {/* Leaderboard PDF Report Modal */}
      <LeaderboardPdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        event={events[0]}
        teams={teams}
        onShowToast={onShowToast}
      />
    </div>
  );
};
