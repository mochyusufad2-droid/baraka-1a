import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Sliders, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  Save,
  Sparkles,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { SimulationModePanel } from './SimulationModePanel';

interface ScoringViewProps {
  onShowToast: (msg: string) => void;
}

export const ScoringView: React.FC<ScoringViewProps> = ({ onShowToast }) => {
  const { events, selectedEventId, updateEvent, batchUpdateCheckpointPoints, checkpoints } = useRace();
  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];

  // Scoring matrix state
  const [standardPosPoints, setStandardPosPoints] = useState(100);
  const [photoBonusMax, setPhotoBonusMax] = useState(150);
  const [riddlePoints, setRiddlePoints] = useState(200);
  const [finishBonus, setFinishBonus] = useState(300);
  const [penaltyPerLateMin, setPenaltyPerLateMin] = useState(10);
  const [penaltySeparated, setPenaltySeparated] = useState(20);
  const [speedBonus, setSpeedBonus] = useState(50);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (currentEvent?.scoringRules) {
      setPenaltyPerLateMin(currentEvent.scoringRules.penaltyPerLateMin || 10);
      setPhotoBonusMax(currentEvent.scoringRules.judgeMaxScore || 150);
      setStandardPosPoints(checkpoints[0]?.points || 100);
    }
  }, [currentEvent, checkpoints]);

  const handleSaveScoringScheme = () => {
    if (currentEvent) {
      updateEvent(currentEvent.id, {
        scoringRules: {
          penaltyPerLateMin,
          maxLateMinutes: 30,
          mandatoryBonus: finishBonus,
          judgeMaxScore: photoBonusMax,
        }
      });
      setIsSaved(true);
      onShowToast('Skema bobot skor & aturan penalti berhasil disimpan ke event!');
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const handleApplyToAllCheckpoints = () => {
    batchUpdateCheckpointPoints(standardPosPoints);
    onShowToast(`Nilai seluruh ${checkpoints.length} pos checkpoint berhasil diseragamkan menjadi ${standardPosPoints} Poin!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0b192c]">Sistem & Matriks Penilaian</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
              KONFIGURASI AKTIF
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi rumus perhitungan poin, bobot tantangan juri, bonus kecepatan, dan penalti keterlambatan waktu untuk <strong>{currentEvent?.title}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSaveScoringScheme}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaved ? 'Tersimpan!' : 'Simpan Skema Skor'}</span>
          </button>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-white">Sinkronisasi Poin Seluruh Pos</h4>
            <p className="text-xs text-slate-300">
              Terapkan nilai dasar {standardPosPoints} Poin ke seluruh {checkpoints.length} pos checkpoint aktif sekaligus.
            </p>
          </div>
        </div>

        <button
          onClick={handleApplyToAllCheckpoints}
          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer shrink-0"
        >
          Terapkan ke {checkpoints.length} Pos
        </button>
      </div>

      {/* Scoring matrix cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Poin Checkpoint & Misi */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Poin Pos & Tugas</h3>
              <p className="text-xs text-slate-500">Nilai dasar saat berhasil check-in di pos</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {/* Field 1 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-700">Scan QR Pos Standar:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={standardPosPoints}
                  onChange={(e) => setStandardPosPoints(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-right"
                />
                <span className="text-slate-500 font-medium">Poin</span>
              </div>
            </div>

            {/* Field 2 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-700">Tantangan Foto Yel-Yel Maksimal:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={photoBonusMax}
                  onChange={(e) => setPhotoBonusMax(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-right"
                />
                <span className="text-slate-500 font-medium">Poin</span>
              </div>
            </div>

            {/* Field 3 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-700">Pecahkan Sandi Azimuth:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={riddlePoints}
                  onChange={(e) => setRiddlePoints(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-right"
                />
                <span className="text-slate-500 font-medium">Poin</span>
              </div>
            </div>

            {/* Field 4 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-700">Garis Finish Lengkap (Bonus):</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={finishBonus}
                  onChange={(e) => setFinishBonus(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-right"
                />
                <span className="text-slate-500 font-medium">Poin</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Bonus & Penalti */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Penalti Waktu & Pelanggaran</h3>
              <p className="text-xs text-slate-500">Pengurangan poin untuk keterlambatan & sanksi</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {/* Field 5 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-700">Penalti Waktu Melebihi Batas:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={penaltyPerLateMin}
                  onChange={(e) => setPenaltyPerLateMin(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-white border border-red-300 text-red-600 rounded-lg font-mono font-bold text-right"
                />
                <span className="text-red-700 font-medium">Poin / Menit</span>
              </div>
            </div>

            {/* Field 6 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-700">Anggota Terpisah di Pos:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={penaltySeparated}
                  onChange={(e) => setPenaltySeparated(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-white border border-red-300 text-red-600 rounded-lg font-mono font-bold text-right"
                />
                <span className="text-red-700 font-medium">Poin / Kasus</span>
              </div>
            </div>

            {/* Field 7 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="font-semibold text-emerald-900">Bonus Tim Tercepat Pos Terbuka:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={speedBonus}
                  onChange={(e) => setSpeedBonus(Number(e.target.value))}
                  className="w-20 px-2 py-1 bg-white border border-emerald-300 text-emerald-800 rounded-lg font-mono font-bold text-right"
                />
                <span className="text-emerald-800 font-medium">Poin</span>
              </div>
            </div>

            {/* Live Formula Note */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Rumus Total Skor Akhir Tim:</div>
              <div className="font-mono text-slate-700 bg-white p-2 rounded border border-slate-200">
                Skor = (Poin Pos Terverifikasi) + (Bonus Juri Lapangan) - (Penalti Keterlambatan & Sanksi)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Simulasi (Scan QR & Input Manual Juri) Panel */}
      <SimulationModePanel onShowToast={onShowToast} />
    </div>
  );
};
