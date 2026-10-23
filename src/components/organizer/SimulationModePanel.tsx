import React, { useState } from 'react';
import { 
  Zap, 
  QrCode, 
  Award, 
  Play, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Sliders, 
  Shuffle, 
  Flame, 
  Check, 
  Activity,
  ChevronRight,
  Send
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';

interface SimulationModePanelProps {
  onShowToast: (msg: string) => void;
  onOpenLeaderboard?: () => void;
}

export const SimulationModePanel: React.FC<SimulationModePanelProps> = ({
  onShowToast,
  onOpenLeaderboard
}) => {
  const { 
    teams, 
    checkpoints, 
    checkInByQrCode, 
    checkInCheckpoint, 
    submitJudgeManualScore, 
    resetToDemoData,
    raceStatus,
    batchGenerateTeams,
    clearSimulatedTeams,
    simulateBulkRaceActivity
  } = useRace();

  // Mode tabs: 'participants' | 'qr' | 'judge' | 'auto'
  const [simTab, setSimTab] = useState<'participants' | 'qr' | 'judge' | 'auto'>('participants');

  // Form states for Participant Bulk Simulation
  const [bulkCount, setBulkCount] = useState<number>(20);
  const [bulkCategory, setBulkCategory] = useState<string>('all');
  const [bulkProgression, setBulkProgression] = useState<boolean>(true);
  const [isBulkGenerating, setIsBulkGenerating] = useState<boolean>(false);

  // Form states for QR Scan Simulation
  const [qrSelectedTeamId, setQrSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [qrSelectedCpId, setQrSelectedCpId] = useState<string>(checkpoints[0]?.id || '');
  const [qrManualCode, setQrManualCode] = useState<string>('');
  const [qrBypassCooldown, setQrBypassCooldown] = useState<boolean>(true);

  // Form states for Judge Scoring Simulation
  const [judgeSelectedTeamId, setJudgeSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [judgeSelectedCpId, setJudgeSelectedCpId] = useState<string>(checkpoints[0]?.id || '');
  const [judgeScoreMode, setJudgeScoreMode] = useState<'bonus' | 'penalty'>('bonus');
  const [judgeScoreValue, setJudgeScoreValue] = useState<number>(100);
  const [judgeNote, setJudgeNote] = useState<string>('Simulasi nilai juri pos: Penampilan formasi sangat baik');
  const [judgeMarkCompleted, setJudgeMarkCompleted] = useState<boolean>(true);

  // Feedback result state
  const [lastSimResult, setLastSimResult] = useState<{
    type: 'qr' | 'judge' | 'auto';
    success: boolean;
    title: string;
    message: string;
    teamName: string;
    scoreChange: string;
    newTotalScore: number;
    timestamp: string;
  } | null>(null);

  // Highlighted team ID for leaderboard flash
  const [highlightedTeamId, setHighlightedTeamId] = useState<string | null>(null);

  // Helper to trigger highlight
  const triggerHighlight = (teamId: string) => {
    setHighlightedTeamId(teamId);
    setTimeout(() => {
      setHighlightedTeamId(null);
    }, 4000);
  };

  // Handler: Simulate QR Scan
  const handleSimulateQrScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const team = teams.find((t) => t.id === qrSelectedTeamId);
    if (!team) {
      onShowToast('Harap pilih tim terlebih dahulu.');
      return;
    }

    let res;
    if (qrManualCode.trim()) {
      res = await checkInByQrCode(team.id, qrManualCode.trim(), qrBypassCooldown);
    } else {
      const cp = checkpoints.find((c) => c.id === qrSelectedCpId);
      if (!cp) {
        onShowToast('Pos checkpoint tidak ditemukan.');
        return;
      }
      res = await checkInCheckpoint(team.id, cp.id, qrBypassCooldown);
    }

    const updatedTeam = teams.find((t) => t.id === team.id);
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

    if (res.success) {
      setLastSimResult({
        type: 'qr',
        success: true,
        title: '✅ Simulasi Scan QR Berhasil',
        message: res.message || 'Scan berhasil diproses',
        teamName: team.name,
        scoreChange: `+${res.pointsAwarded} Poin`,
        newTotalScore: (updatedTeam?.totalScore || team.totalScore) + res.pointsAwarded,
        timestamp: timeNow,
      });
      triggerHighlight(team.id);
      onShowToast(`Simulasi QR: ${team.name} berhasil check-in (+${res.pointsAwarded} Poin)!`);
    } else {
      setLastSimResult({
        type: 'qr',
        success: false,
        title: '⚠️ Simulasi Scan QR Terhambat',
        message: res.message || 'Proses scan dibatalkan oleh aturan sistem.',
        teamName: team.name,
        scoreChange: '0 Poin',
        newTotalScore: team.totalScore,
        timestamp: timeNow,
      });
      onShowToast(`Simulasi QR Gagal: ${res.message}`);
    }
  };

  // Handler: Simulate Judge Scoring
  const handleSimulateJudgeScoring = (e: React.FormEvent) => {
    e.preventDefault();
    const team = teams.find((t) => t.id === judgeSelectedTeamId);
    const cp = checkpoints.find((c) => c.id === judgeSelectedCpId);

    if (!team) {
      onShowToast('Harap pilih tim terlebih dahulu.');
      return;
    }

    const isPenalty = judgeScoreMode === 'penalty';
    const finalScore = isPenalty ? Math.abs(judgeScoreValue) : Math.abs(judgeScoreValue);

    const res = submitJudgeManualScore(
      team.id,
      cp ? cp.id : 'cp-general',
      finalScore,
      judgeNote || (isPenalty ? 'Penalti simulasi panitia' : 'Bonus simulasi juri'),
      judgeMarkCompleted,
      undefined,
      isPenalty,
      isPenalty ? Math.ceil(finalScore / 10) : 0
    );

    const updatedTeam = teams.find((t) => t.id === team.id);
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

    if (res.success) {
      const scoreDeltaStr = isPenalty ? `-${res.penaltyDeducted || finalScore} Poin (Penalti)` : `+${res.scoreAwarded || finalScore} Poin (Bonus)`;
      setLastSimResult({
        type: 'judge',
        success: true,
        title: isPenalty ? '🛑 Simulasi Penalti Terinput' : '⭐ Simulasi Nilai Juri Terinput',
        message: res.message,
        teamName: team.name,
        scoreChange: scoreDeltaStr,
        newTotalScore: updatedTeam?.totalScore || team.totalScore,
        timestamp: timeNow,
      });
      triggerHighlight(team.id);
      onShowToast(`Simulasi Juri: ${team.name} menerima ${scoreDeltaStr}!`);
    } else {
      setLastSimResult({
        type: 'judge',
        success: false,
        title: '⚠️ Input Juri Gagal',
        message: res.message,
        teamName: team.name,
        scoreChange: '0 Poin',
        newTotalScore: team.totalScore,
        timestamp: timeNow,
      });
      onShowToast(`Simulasi Gagal: ${res.message}`);
    }
  };

  // Handler: Random 1 Scan QR
  const handleRandomScan = async () => {
    if (teams.length === 0 || checkpoints.length === 0) return;
    const randomTeam = teams[Math.floor(Math.random() * teams.length)];
    const randomCp = checkpoints[Math.floor(Math.random() * checkpoints.length)];

    const res = await checkInCheckpoint(randomTeam.id, randomCp.id, true);
    const updatedTeam = teams.find((t) => t.id === randomTeam.id);
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

    setLastSimResult({
      type: 'auto',
      success: res.success,
      title: '🎲 Simulasi Acak Scan QR',
      message: res.message || 'Scan acak berhasil diproses',
      teamName: randomTeam.name,
      scoreChange: `+${res.pointsAwarded} Poin`,
      newTotalScore: updatedTeam?.totalScore || randomTeam.totalScore,
      timestamp: timeNow,
    });
    triggerHighlight(randomTeam.id);
    onShowToast(`🎲 Simulasi: ${randomTeam.name} scan di ${randomCp.name} (+${res.pointsAwarded} Poin)`);
  };

  // Handler: Random 1 Judge Score
  const handleRandomJudgeScore = () => {
    if (teams.length === 0) return;
    const randomTeam = teams[Math.floor(Math.random() * teams.length)];
    const randomCp = checkpoints[Math.floor(Math.random() * checkpoints.length)];
    const randomScore = [50, 100, 150, 200][Math.floor(Math.random() * 4)];

    const res = submitJudgeManualScore(
      randomTeam.id,
      randomCp.id,
      randomScore,
      `Nilai simulasi acak juri di ${randomCp.name}`,
      true
    );

    const updatedTeam = teams.find((t) => t.id === randomTeam.id);
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

    setLastSimResult({
      type: 'auto',
      success: res.success,
      title: '⭐ Simulasi Acak Nilai Juri',
      message: res.message,
      teamName: randomTeam.name,
      scoreChange: `+${randomScore} Poin`,
      newTotalScore: updatedTeam?.totalScore || randomTeam.totalScore,
      timestamp: timeNow,
    });
    triggerHighlight(randomTeam.id);
    onShowToast(`⭐ Simulasi Juri: ${randomTeam.name} diberi +${randomScore} Poin oleh Juri!`);
  };

  // Handler: Bulk 5 Sequential Scans
  const handleBulkSimulateScans = () => {
    if (teams.length === 0 || checkpoints.length === 0) return;
    
    let simulatedCount = 0;
    const interval = setInterval(async () => {
      const team = teams[Math.floor(Math.random() * teams.length)];
      const cp = checkpoints[Math.floor(Math.random() * checkpoints.length)];
      await checkInCheckpoint(team.id, cp.id, true);
      triggerHighlight(team.id);

      simulatedCount++;
      if (simulatedCount >= 5) {
        clearInterval(interval);
        onShowToast('🚀 Simulasi massal 5 pergerakan tim selesai! Leaderboard otomatis bergeser.');
      }
    }, 600);
  };

  // Sorted teams for the embedded leaderboard
  const sortedLeaderboardTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-lg overflow-hidden space-y-0">
      {/* Simulation Header Bar */}
      <div className="bg-gradient-to-r from-purple-950 via-[#0b192c] to-slate-900 p-5 sm:p-6 text-white border-b border-purple-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                Mode Simulasi Aktif
              </span>
              <span className="text-xs text-amber-400 font-mono font-bold">LIVE SCORE TESTER</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              Panel Simulasi Input Scan QR & Juri Lapangan
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Uji coba jalannya lomba secara nyata: simulasikan scan barcode peserta atau pemberian poin oleh juri untuk melihat pergerakan skor di papan peringkat secara langsung.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenLeaderboard && (
              <button
                onClick={onOpenLeaderboard}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Papan Peringkat Penuh</span>
              </button>
            )}
            <button
              onClick={() => {
                resetToDemoData();
                onShowToast('Data perlombaan di-reset ke status awal demo.');
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Kembalikan data ke awal demo"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Control Panel (Left) + Live Leaderboard (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        
        {/* Left Column: Interactive Simulation Forms (7 Cols) */}
        <div className="lg:col-span-7 p-5 sm:p-6 space-y-5 bg-slate-50/50">
          
          {/* Sub Tab Switcher */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-xl text-xs font-bold">
            <button
              onClick={() => setSimTab('qr')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                simTab === 'qr'
                  ? 'bg-white text-orange-600 shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Simulasi Scan QR</span>
            </button>

            <button
              onClick={() => setSimTab('judge')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                simTab === 'judge'
                  ? 'bg-white text-purple-600 shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Input Manual Juri</span>
            </button>

            <button
              onClick={() => setSimTab('auto')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                simTab === 'auto'
                  ? 'bg-white text-emerald-600 shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Otomatis / Acak</span>
            </button>
          </div>

          {/* TAB 1: QR Scan Simulation */}
          {simTab === 'qr' && (
            <form onSubmit={handleSimulateQrScan} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Simulasi Pindai Barcode / QR Pos</h4>
                    <p className="text-[11px] text-slate-500">Kirim event check-in seolah-olah peserta memindai QR di lokasi pos</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 text-[10px] font-mono font-bold border border-orange-200">
                  SCAN SIMULATOR
                </span>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Pilih Regu / Tim Peserta:
                  </label>
                  <select
                    value={qrSelectedTeamId}
                    onChange={(e) => setQrSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (BIB #{t.bibNumber}) - Total: {t.totalScore} Pts
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Pilih Pos Checkpoint Target:
                  </label>
                  <select
                    value={qrSelectedCpId}
                    onChange={(e) => {
                      setQrSelectedCpId(e.target.value);
                      setQrManualCode('');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {checkpoints.map((cp, idx) => (
                      <option key={`${cp.id}-${idx}`} value={cp.id}>
                        {cp.name} ({cp.points} Poin) - Kode: {cp.qrCodeValue}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Manual Code Typing */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>Atau Ketik Manual Kode QR / Barcode:</span>
                  <span className="text-[10px] font-normal text-slate-400">Optional</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: CP-01-GARUDA, CP-02-YEL, dsb."
                  value={qrManualCode}
                  onChange={(e) => setQrManualCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Anti-Speedrun Cooldown Bypass Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bypassCooldown"
                  checked={qrBypassCooldown}
                  onChange={(e) => setQrBypassCooldown(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="bypassCooldown" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Bypass Jeda Minimum Anti-Speedrun (Izinkan scan berturut-turut tanpa menunggu waktu)
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Simulasikan Scan QR Sekarang</span>
              </button>
            </form>
          )}

          {/* TAB 2: Judge Manual Scoring Simulation */}
          {simTab === 'judge' && (
            <form onSubmit={handleSimulateJudgeScoring} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Simulasi Input Nilai / Penalti Juri</h4>
                    <p className="text-[11px] text-slate-500">Berikan poin tambahan tantangan atau penalti secara langsung</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-mono font-bold border border-purple-200">
                  JUDGE PANEL
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Pilih Regu / Tim Target:
                  </label>
                  <select
                    value={judgeSelectedTeamId}
                    onChange={(e) => setJudgeSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (BIB #{t.bibNumber}) - Total: {t.totalScore} Pts
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Pos / Jenis Tantangan:
                  </label>
                  <select
                    value={judgeSelectedCpId}
                    onChange={(e) => setJudgeSelectedCpId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {checkpoints.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.name} ({cp.challengeType || 'Tantangan Juri'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mode Bonus / Penalty Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setJudgeScoreMode('bonus');
                    setJudgeScoreValue(100);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    judgeScoreMode === 'bonus'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-500 font-extrabold shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>➕ Poin Bonus Juri</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setJudgeScoreMode('penalty');
                    setJudgeScoreValue(30);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    judgeScoreMode === 'penalty'
                      ? 'bg-rose-50 text-rose-700 border-rose-500 font-extrabold shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>➖ Penalti Pelanggaran</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Besar Poin ({judgeScoreMode === 'bonus' ? '+' : '-'}):
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={judgeScoreValue}
                    onChange={(e) => setJudgeScoreValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Catatan Penilaian Juri:
                  </label>
                  <input
                    type="text"
                    required
                    value={judgeNote}
                    onChange={(e) => setJudgeNote(e.target.value)}
                    placeholder="Contoh: Yel-yel sangat menarik & kompak..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="markCompleted"
                  checked={judgeMarkCompleted}
                  onChange={(e) => setJudgeMarkCompleted(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="markCompleted" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Tandai Pos ini Selesai (Completed) untuk tim target
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Award className="w-4 h-4" />
                <span>Kirim Penilaian Juri ke Leaderboard</span>
              </button>
            </form>
          )}

          {/* TAB 3: Fast Auto Simulation */}
          {simTab === 'auto' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Simulasi Otomatis & Massal</h4>
                    <p className="text-[11px] text-slate-500">Uji langsung pergerakan grafik & peringkat tanpa mengetik formulir</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold border border-emerald-200">
                  AUTO GENERATOR
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleRandomScan}
                  className="p-3 bg-slate-50 hover:bg-orange-50 text-slate-800 hover:text-orange-900 border border-slate-200 hover:border-orange-300 rounded-xl text-left space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <QrCode className="w-4 h-4 text-orange-500" />
                    <Shuffle className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500" />
                  </div>
                  <div className="font-bold text-xs text-slate-900">Acak 1 Scan QR</div>
                  <p className="text-[10px] text-slate-500">Pilih tim & pos acak lalu simulasikan check-in instant.</p>
                </button>

                <button
                  onClick={handleRandomJudgeScore}
                  className="p-3 bg-slate-50 hover:bg-purple-50 text-slate-800 hover:text-purple-900 border border-slate-200 hover:border-purple-300 rounded-xl text-left space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <Award className="w-4 h-4 text-purple-500" />
                    <Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500" />
                  </div>
                  <div className="font-bold text-xs text-slate-900">Acak Nilai Juri</div>
                  <p className="text-[10px] text-slate-500">Beri bonus poin acak ke tim pilihan sistem.</p>
                </button>

                <button
                  onClick={handleBulkSimulateScans}
                  className="p-3 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl text-left space-y-1 transition-all cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95 group"
                >
                  <div className="flex items-center justify-between">
                    <Play className="w-4 h-4 text-emerald-200 fill-emerald-200" />
                    <Flame className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <div className="font-bold text-xs text-white">Simulasi 5 Beruntun</div>
                  <p className="text-[10px] text-emerald-100">Proses 5 pergerakan balapan sekaligus untuk menggeser papan skor.</p>
                </button>
              </div>
            </div>
          )}

          {/* Last Simulation Result Feedback Card */}
          {lastSimResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in duration-200 ${
              lastSimResult.success 
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' 
                : 'bg-rose-50/80 border-rose-300 text-rose-950'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-xs">
                  {lastSimResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{lastSimResult.title}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">{lastSimResult.timestamp}</span>
              </div>

              <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block">Tim Target</span>
                  <span className="font-bold text-xs text-slate-900">{lastSimResult.teamName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Perubahan Poin</span>
                  <span className={`font-extrabold text-xs font-mono ${
                    lastSimResult.scoreChange.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {lastSimResult.scoreChange}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block">Skor Akhir Baru</span>
                  <span className="font-extrabold text-xs text-orange-600 font-mono">
                    {lastSimResult.newTotalScore} Pts
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 italic">
                "{lastSimResult.message}"
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Embedded Live Leaderboard Preview (5 Cols) */}
        <div className="lg:col-span-5 p-5 sm:p-6 space-y-4 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <h4 className="font-extrabold text-slate-900 text-sm">Pratinjau Leaderboard Langsung</h4>
              </div>
              <p className="text-[11px] text-slate-500">Terupdate otomatis setiap input simulasi dilakukan</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" title="Live sync" />
          </div>

          {/* Ranking Table */}
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {sortedLeaderboardTeams.map((t, idx) => {
              const isHighlighted = t.id === highlightedTeamId;
              const rank = idx + 1;

              return (
                <div
                  key={`${t.id}-${idx}`}
                  className={`p-3 rounded-xl border text-xs transition-all duration-300 flex items-center justify-between gap-3 ${
                    isHighlighted
                      ? 'bg-amber-100/90 border-amber-500 shadow-md ring-2 ring-amber-400 scale-[1.01]'
                      : rank === 1
                      ? 'bg-amber-50/50 border-amber-200'
                      : rank === 2
                      ? 'bg-slate-50 border-slate-200'
                      : rank === 3
                      ? 'bg-orange-50/30 border-orange-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Rank Badge */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs font-mono shrink-0 ${
                      rank === 1 
                        ? 'bg-amber-400 text-amber-950 shadow-xs' 
                        : rank === 2 
                        ? 'bg-slate-300 text-slate-800' 
                        : rank === 3 
                        ? 'bg-amber-700 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      #{rank}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs">{t.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded">
                          #{t.bibNumber}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span>Pos: {t.checkpointsCompleted}/{checkpoints.length || 6}</span>
                        <span>•</span>
                        <span className="text-slate-400">{t.lastUpdated || 'Aktif'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-sm font-mono text-orange-600 block">
                      {t.totalScore} <span className="text-[10px] text-slate-500 font-sans font-medium">Pts</span>
                    </span>
                    {isHighlighted && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-bounce inline-block">
                        BARU DIPERBARUI!
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-center border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              💡 Seluruh pergerakan nilai di papan peringkat ini disinkronkan secara realtime dengan aplikasi peserta.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
