import React, { useState, useRef } from 'react';
import { 
  UserCheck, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Award, 
  Search, 
  QrCode, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Send, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  X, 
  Check, 
  ChevronRight,
  Maximize2,
  Trash2,
  Flame,
  MinusCircle
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { Checkpoint, Team, ChallengeSubmission } from '../../types';
import { compressImageFile } from '../../utils/imageCompressor';

interface MobileJudgeViewProps {
  onShowToast: (msg: string) => void;
  onSwitchToParticipant?: () => void;
}

export const MobileJudgeView: React.FC<MobileJudgeViewProps> = ({ onShowToast, onSwitchToParticipant }) => {
  const { 
    checkpoints, 
    submissions, 
    reviewSubmission, 
    teams, 
    submitJudgeManualScore,
    selectedEventId,
    events
  } = useRace();

  // Selected Checkpoint for this field judge
  const [selectedCpId, setSelectedCpId] = useState<string>(checkpoints[1]?.id || checkpoints[0]?.id || 'cp-02');
  const activeCheckpoint = checkpoints.find(c => c.id === selectedCpId) || checkpoints[0];

  // Mobile Judge Sub-Tabs: 'score' | 'review' | 'radar' | 'log'
  const [activeTab, setActiveTab] = useState<'score' | 'review' | 'radar' | 'log'>('score');

  // Selected Team for scoring
  const [selectedBib, setSelectedBib] = useState<string>('001');
  const [customBibInput, setCustomBibInput] = useState<string>('');
  const [cameraScanOpen, setCameraScanOpen] = useState<boolean>(false);

  // Scoring form state
  const [scoreCategory, setScoreCategory] = useState<string>('Kekompakan & Formasi Regu');
  const [scorePoints, setScorePoints] = useState<number>(100);
  const [scoreNote, setScoreNote] = useState<string>('Semua anggota hadir serempak dan menyelesaikan tugas dengan baik.');
  
  // Penalty mode state
  const [isPenaltyMode, setIsPenaltyMode] = useState<boolean>(false);
  const [penaltyPoints, setPenaltyPoints] = useState<number>(25);
  const [penaltyMinutes, setPenaltyMinutes] = useState<number>(5);
  const [penaltyReason, setPenaltyReason] = useState<string>('Anggota Terpisah / Kurang Lengkap Saat Check-in');

  // Photo proof from judge
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Offline status
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Recent local submissions/log
  const [recentLogs, setRecentLogs] = useState<Array<{
    id: string;
    bib: string;
    teamName: string;
    points: number;
    type: 'score' | 'penalty';
    timestamp: string;
    note: string;
  }>>([]);

  // Find currently selected team
  const activeTeam: Team | undefined = teams.find(t => 
    t.bibNumber === selectedBib || t.bibNumber === customBibInput || t.id === selectedBib
  ) || teams[0];

  // Pending submissions for this pos
  const posSubmissions = submissions.filter(s => 
    s.checkpointId === activeCheckpoint?.id && s.status === 'pending'
  );

  // Helper function to check if a team completed this checkpoint
  const isTeamCompletedAtPos = (team: Team, cpId: string) => {
    return team.visitHistory?.some(v => v.checkpointId === cpId) || false;
  };

  // Teams arriving / checked-in status for this pos
  const checkedInCount = teams.filter(t => isTeamCompletedAtPos(t, activeCheckpoint?.id)).length;
  const remainingCount = Math.max(0, teams.length - checkedInCount);

  // Handle Score Preset
  const handleScorePreset = (pts: number) => {
    setScorePoints(pts);
    onShowToast(`Poin diset ke +${pts}`);
  };

  // Handle Photo Capture from Judge's phone camera
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      onShowToast('Mengompresi foto bukti juri...');
      const compressedDataUrl = await compressImageFile(file, 1024, 1024, 0.75);
      setProofPhoto(compressedDataUrl);
      onShowToast('Foto bukti berhasil diambil & siap dilampirkan!');
    } catch (err) {
      console.error(err);
      onShowToast('Gagal memproses foto. Silakan coba lagi.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Submit scoring or penalty
  const handleSubmitAssessment = () => {
    if (!activeTeam || !activeCheckpoint) {
      onShowToast('Pilih tim dan pos terlebih dahulu.');
      return;
    }

    if (isPenaltyMode) {
      // Submit penalty using positional parameters
      submitJudgeManualScore(
        activeTeam.bibNumber,
        activeCheckpoint.id,
        -Math.abs(penaltyPoints),
        `[SANKSI] ${penaltyReason}`,
        false,
        proofPhoto || undefined,
        true,
        penaltyMinutes
      );

      const newLog = {
        id: 'log-' + Date.now(),
        bib: activeTeam.bibNumber,
        teamName: activeTeam.name,
        points: -Math.abs(penaltyPoints),
        type: 'penalty' as const,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        note: penaltyReason
      };
      setRecentLogs([newLog, ...recentLogs]);
      onShowToast(`⚠️ Penalti berhasil dicatat untuk BIB #${activeTeam.bibNumber} (${activeTeam.name})!`);
    } else {
      // Submit regular score using positional parameters
      submitJudgeManualScore(
        activeTeam.bibNumber,
        activeCheckpoint.id,
        scorePoints,
        scoreNote || scoreCategory,
        true,
        proofPhoto || undefined,
        false,
        0
      );

      const newLog = {
        id: 'log-' + Date.now(),
        bib: activeTeam.bibNumber,
        teamName: activeTeam.name,
        points: scorePoints,
        type: 'score' as const,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        note: scoreCategory
      };
      setRecentLogs([newLog, ...recentLogs]);
      onShowToast(`✅ Nilai +${scorePoints} berhasil disimpan untuk BIB #${activeTeam.bibNumber} (${activeTeam.name})!`);
    }

    // Reset photo & note
    setProofPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full flex flex-col bg-slate-900 text-slate-100 min-h-screen">
      {/* Top Mobile App Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white tracking-tight">App Juri Pos</span>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Mobile
                </span>
              </div>
              <div className="text-[10px] text-slate-400">Petugas Penilaian Lapangan</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </span>
          </div>
        </div>

        {/* Checkpoint Station Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
            <select
              value={selectedCpId}
              onChange={(e) => setSelectedCpId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none w-full cursor-pointer truncate"
            >
              {checkpoints.map(cp => (
                <option key={cp.id} value={cp.id} className="bg-slate-900 text-white">
                  Pos {cp.number}: {cp.name} ({cp.points} Poin)
                </option>
              ))}
            </select>
          </div>
          <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-lg shrink-0">
            {checkedInCount}/{teams.length} Tim
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 p-3 pb-24 space-y-4 max-w-md mx-auto w-full">
        {/* TAB 1: INPUT SKOR & PENALTI */}
        {activeTab === 'score' && (
          <div className="space-y-4">
            {/* Mode Switcher: Nilai Prestasi vs Sanksi/Penalti */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setIsPenaltyMode(false)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  !isPenaltyMode 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Beri Nilai & Check-in</span>
              </button>
              <button
                onClick={() => setIsPenaltyMode(true)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isPenaltyMode 
                    ? 'bg-rose-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Sanksi / Penalti</span>
              </button>
            </div>

            {/* Quick BIB Selection */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Pilih Nomor BIB Tim yang Tiba:</span>
                </label>
                <button
                  onClick={() => setCameraScanOpen(true)}
                  className="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan QR BIB</span>
                </button>
              </div>

              {/* Quick BIB Number Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {teams.slice(0, 10).map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedBib(t.bibNumber);
                      setCustomBibInput('');
                    }}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all shrink-0 ${
                      (selectedBib === t.bibNumber && !customBibInput)
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    #{t.bibNumber}
                  </button>
                ))}
              </div>

              {/* Manual Input Search fallback */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Ketik BIB atau nama tim lainnya..."
                  value={customBibInput}
                  onChange={(e) => {
                    setCustomBibInput(e.target.value);
                    const found = teams.find(t => 
                      t.bibNumber.toLowerCase() === e.target.value.toLowerCase() ||
                      t.name.toLowerCase().includes(e.target.value.toLowerCase())
                    );
                    if (found) setSelectedBib(found.bibNumber);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Active Team Identity Badge */}
              {activeTeam && (
                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-inner"
                      style={{ backgroundColor: activeTeam.color || '#f97316' }}
                    >
                      {activeTeam.bibNumber}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                        <span>{activeTeam.name}</span>
                        {isTeamCompletedAtPos(activeTeam, activeCheckpoint?.id) && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                            Sudah Check-in
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>{activeTeam.organization || 'Komunitas'}</span>
                        <span>•</span>
                        <span>{activeTeam.members?.length || 3} Anggota</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Total Skor</div>
                    <div className="font-mono font-bold text-amber-400 text-xs">
                      {activeTeam.totalScore || 0} Pts
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* If NOT Penalty Mode: Regular Scoring Form */}
            {!isPenaltyMode ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Kategori Penilaian Pos:</span>
                  <span className="text-xs font-mono font-extrabold text-blue-400">
                    +{scorePoints} Poin
                  </span>
                </div>

                {/* Category Options */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    'Kekompakan & Formasi Regu',
                    'Ketepatan Waktu & Kecepatan',
                    'Penyelesaian Misi Khusus Pos',
                    'Yel-yel & Semangat Lomba'
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setScoreCategory(cat)}
                      className={`p-2 rounded-xl text-[11px] font-bold text-left transition-all ${
                        scoreCategory === cat
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Quick Score Buttons */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-medium">Beri Poin Instan:</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 75, 100].map(pts => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => handleScorePreset(pts)}
                        className={`py-2 rounded-xl font-mono text-xs font-extrabold transition-all active:scale-95 ${
                          scorePoints === pts
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400'
                            : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        +{pts}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes Input */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">Catatan / Evaluasi Juri:</label>
                  <input
                    type="text"
                    value={scoreNote}
                    onChange={(e) => setScoreNote(e.target.value)}
                    placeholder="Contoh: Sangat kompak, misi tali temali selesai dalam 3 menit..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Photo Evidence Capture from Camera */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Lampirkan Foto Bukti Pos (Opsional):</span>
                    {proofPhoto && (
                      <button 
                        onClick={() => setProofPhoto(null)}
                        className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3 h-3" /> Hapus Foto
                      </button>
                    )}
                  </div>

                  {proofPhoto ? (
                    <div className="relative rounded-xl overflow-hidden border border-blue-500/50 bg-black max-h-48 flex items-center justify-center">
                      <img src={proofPhoto} alt="Bukti Juri" className="w-full h-auto object-cover max-h-48" />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono text-emerald-400 font-bold border border-emerald-500/40">
                        Foto Tersimpan
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isCompressing}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 px-4 border border-dashed border-slate-700 hover:border-blue-500 rounded-xl bg-slate-900/60 flex items-center justify-center gap-2 text-xs text-slate-300 font-bold transition-all active:scale-98"
                    >
                      <Camera className="w-4 h-4 text-blue-400" />
                      <span>{isCompressing ? 'Memproses Foto...' : 'Ambil Foto dengan Kamera HP'}</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmitAssessment}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Nilai & Verifikasi Check-in</span>
                </button>
              </div>
            ) : (
              /* PENALTY FORM */
              <div className="bg-slate-950 border border-rose-900/40 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>Input Sanksi / Penalti Pos</span>
                  </span>
                  <span className="text-xs font-mono font-extrabold text-rose-400">
                    -{penaltyPoints} Pts | +{penaltyMinutes} Mnt
                  </span>
                </div>

                {/* Violation presets */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-medium">Bentuk Pelanggaran:</label>
                  <div className="space-y-1.5">
                    {[
                      { reason: 'Anggota Terpisah / Kurang Lengkap Saat Check-in', pts: 25, min: 5 },
                      { reason: 'Membuang Sampah Sembarangan di Jalur Lomba', pts: 50, min: 10 },
                      { reason: 'Melanggar Batas Rute Aman / Zona Bahaya', pts: 40, min: 10 },
                      { reason: 'Menggunakan Kendaraan / Bantuan Terlarang', pts: 100, min: 15 },
                    ].map((item) => (
                      <button
                        key={item.reason}
                        type="button"
                        onClick={() => {
                          setPenaltyReason(item.reason);
                          setPenaltyPoints(item.pts);
                          setPenaltyMinutes(item.min);
                        }}
                        className={`w-full p-2.5 rounded-xl text-[11px] font-bold text-left transition-all flex items-center justify-between ${
                          penaltyReason === item.reason
                            ? 'bg-rose-950/60 text-rose-200 border border-rose-600'
                            : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate pr-2">{item.reason}</span>
                        <span className="shrink-0 font-mono text-[10px] text-rose-400">-{item.pts} Pts</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Penalty Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Potong Skor (Poin):</label>
                    <input
                      type="number"
                      value={penaltyPoints}
                      onChange={(e) => setPenaltyPoints(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Tambah Waktu (Menit):</label>
                    <input
                      type="number"
                      value={penaltyMinutes}
                      onChange={(e) => setPenaltyMinutes(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Submit Penalty */}
                <button
                  type="button"
                  onClick={handleSubmitAssessment}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <MinusCircle className="w-4 h-4" />
                  <span>Jatuhkan Sanksi & Catat ke Sistem</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REVIEW MISI FOTO ANTREAN */}
        {activeTab === 'review' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Antrean Misi Foto di {activeCheckpoint?.name}:</span>
              <span className="text-xs font-mono text-blue-400 font-bold">{posSubmissions.length} Menunggu</span>
            </div>

            {posSubmissions.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-xs font-bold text-white">Tidak Ada Antrean Tertunda</div>
                <div className="text-[11px] text-slate-400">Semua bukti foto tim di pos ini telah selesai dinilai.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {posSubmissions.map((sub) => {
                  const subTeam = teams.find(t => t.id === sub.teamId);
                  return (
                    <div key={sub.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-mono font-bold">
                            BIB #{subTeam?.bibNumber || '001'}
                          </span>
                          <span className="font-extrabold text-xs text-white">{subTeam?.name || 'Tim Lomba'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{sub.submittedAt}</span>
                        </span>
                      </div>

                      {/* Photo preview */}
                      {sub.contentUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-800 bg-black max-h-56">
                          <img src={sub.contentUrl} alt="Bukti Misi" className="w-full h-auto object-cover max-h-56" />
                        </div>
                      )}

                      <div className="bg-slate-900 rounded-xl p-2.5 text-[11px] text-slate-300">
                        <span className="text-slate-400 font-medium">Catatan Tim: </span>
                        {sub.contentText || 'Tantangan foto kelompok berhasil diselesaikan.'}
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => {
                            reviewSubmission(sub.id, 'rejected', 0, 'Foto kurang jelas atau anggota kurang lengkap. Silakan foto ulang.');
                            onShowToast(`❌ Foto BIB #${subTeam?.bibNumber} ditolak.`);
                          }}
                          className="py-2.5 px-3 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Tolak / Ulang</span>
                        </button>
                        <button
                          onClick={() => {
                            reviewSubmission(sub.id, 'approved', activeCheckpoint?.points || 100, 'Misi disetujui juri pos.');
                            onShowToast(`✅ Foto BIB #${subTeam?.bibNumber} disetujui (+${activeCheckpoint?.points || 100} poin)!`);
                          }}
                          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-600/30"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Setujui (+Skor)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RADAR TIM DI LINTASAN */}
        {activeTab === 'radar' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Status Kedatangan Tim di Pos Ini:</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">{checkedInCount} / {teams.length} Selesai</span>
            </div>

            <div className="space-y-2">
              {teams.map((t) => {
                const isVisited = isTeamCompletedAtPos(t, activeCheckpoint?.id);
                return (
                  <div 
                    key={t.id}
                    onClick={() => {
                      setSelectedBib(t.bibNumber);
                      setActiveTab('score');
                      onShowToast(`Memilih Tim ${t.name} (BIB #${t.bibNumber})`);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isVisited 
                        ? 'bg-slate-950/80 border-emerald-900/40 text-slate-300' 
                        : 'bg-slate-950 border-slate-800 hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs"
                        style={{ backgroundColor: t.color || '#f97316' }}
                      >
                        {t.bibNumber}
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-white">{t.name}</div>
                        <div className="text-[10px] text-slate-400">{t.organization || 'Kategori Regu'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isVisited ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                          <Check className="w-3 h-3" />
                          <span>Tuntas</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center gap-1 border border-blue-500/30">
                          <span>Menuju Pos</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: RIWAYAT / LOG PENILAIAN */}
        {activeTab === 'log' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Riwayat Penilaian Terakhir Anda:</span>
              <span className="text-xs font-mono text-slate-400">{recentLogs.length} Entri</span>
            </div>

            {recentLogs.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-xs font-bold text-white">Belum Ada Penilaian Hari Ini</div>
                <div className="text-[11px] text-slate-400">Gunakan tab "Input Nilai" untuk mulai memasukkan poin tim.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-400">#{log.bib}</span>
                        <span className="font-bold text-xs text-white">{log.teamName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{log.note} • {log.timestamp}</div>
                    </div>
                    <div className={`font-mono font-extrabold text-xs ${
                      log.type === 'penalty' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {log.points > 0 ? `+${log.points}` : log.points} Pts
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera QR Scanner Simulation / Modal for BIB Card */}
      {cameraScanOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-orange-400" />
              <span className="font-bold text-sm">Scan Kartu BIB Tim</span>
            </div>
            <button
              onClick={() => setCameraScanOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scanner Viewfinder */}
          <div className="my-auto flex flex-col items-center justify-center space-y-4">
            <div className="relative w-64 h-64 border-2 border-dashed border-orange-500 rounded-3xl overflow-hidden flex items-center justify-center bg-slate-900/80">
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse top-1/2"></div>
              <div className="text-center p-4">
                <QrCode className="w-12 h-12 text-orange-400 mx-auto mb-2 opacity-60" />
                <p className="text-xs text-slate-300 font-medium">Arahkan kamera ke QR Code pada kartu nomor BIB tim</p>
              </div>
            </div>

            {/* Simulated Scan Buttons */}
            <div className="space-y-1.5 w-full max-w-xs text-center">
              <p className="text-[11px] text-slate-400">Pilih cepat simulasi kartu terdeteksi:</p>
              <div className="grid grid-cols-3 gap-2">
                {teams.slice(0, 6).map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedBib(t.bibNumber);
                      setCameraScanOpen(false);
                      onShowToast(`📷 QR BIB #${t.bibNumber} (${t.name}) berhasil ter-scan!`);
                    }}
                    className="p-2 rounded-xl bg-slate-800 text-white font-mono text-xs font-bold border border-slate-700 hover:border-orange-500"
                  >
                    #{t.bibNumber}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-500 pb-2">
            Sensor optik aktif dengan auto-focus & penerangan flash
          </div>
        </div>
      )}

      {/* Bottom Sticky Mobile Navigation Tabs */}
      <div className="fixed bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 z-40 max-w-md mx-auto">
        <div className="grid grid-cols-4 py-1.5 px-2">
          <button
            onClick={() => setActiveTab('score')}
            className={`flex flex-col items-center gap-1 py-1 transition-all ${
              activeTab === 'score' ? 'text-blue-400 font-extrabold' : 'text-slate-400 font-medium'
            }`}
          >
            <Award className="w-5 h-5" />
            <span className="text-[10px]">Input Nilai</span>
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={`flex flex-col items-center gap-1 py-1 transition-all relative ${
              activeTab === 'review' ? 'text-blue-400 font-extrabold' : 'text-slate-400 font-medium'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px]">Review Foto</span>
            {posSubmissions.length > 0 && (
              <span className="absolute top-0 right-5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                {posSubmissions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('radar')}
            className={`flex flex-col items-center gap-1 py-1 transition-all ${
              activeTab === 'radar' ? 'text-blue-400 font-extrabold' : 'text-slate-400 font-medium'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Radar Tim</span>
          </button>

          <button
            onClick={() => setActiveTab('log')}
            className={`flex flex-col items-center gap-1 py-1 transition-all ${
              activeTab === 'log' ? 'text-blue-400 font-extrabold' : 'text-slate-400 font-medium'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px]">Riwayat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
