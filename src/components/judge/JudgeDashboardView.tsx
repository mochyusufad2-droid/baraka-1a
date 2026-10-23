import React, { useState, useId } from 'react';
import { compressImageFile } from '../../utils/imageCompressor';
import { JudgeLeafletMap } from './JudgeLeafletMap';
import { 
  UserCheck, 
  Users,
  MapPin, 
  Navigation,
  Camera, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Award, 
  ChevronRight, 
  Search,
  Filter,
  Check,
  Sparkles,
  RefreshCw,
  Sliders,
  AlertCircle,
  HelpCircle,
  Hash,
  Send,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Info,
  Eye,
  Maximize2,
  ZoomIn,
  Image as ImageIcon,
  Upload,
  X
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { ChallengeSubmission, Team, Checkpoint } from '../../types';

interface JudgeDashboardViewProps {
  onShowToast: (msg: string) => void;
}

interface ManualScoreHistoryItem {
  id: string;
  timestamp: string;
  teamId: string;
  teamName: string;
  bibNumber: string;
  checkpointId: string;
  checkpointName: string;
  score: number;
  penaltyMinutes?: number;
  isPenalty?: boolean;
  category: string;
  note: string;
  photoUrl?: string;
}

export const JudgeDashboardView: React.FC<JudgeDashboardViewProps> = ({ onShowToast }) => {
  const { 
    checkpoints, 
    submissions, 
    reviewSubmission, 
    teams,
    submitJudgeManualScore,
    sosAlerts = []
  } = useRace();

  // Tab View: 'map_radar' | 'manual_input' | 'submissions_queue'
  const [activeTab, setActiveTab] = useState<'map_radar' | 'manual_input' | 'submissions_queue'>('map_radar');

  // Pos selector for the stationed judge
  const [selectedPosId, setSelectedPosId] = useState<string>(checkpoints[1]?.id || checkpoints[0]?.id || 'cp-02');
  const currentPos = checkpoints.find((c) => c.id === selectedPosId) || checkpoints[0];

  // --- Mode Penilaian: 'score_bonus' | 'penalty' ---
  const [evaluationMode, setEvaluationMode] = useState<'score_bonus' | 'penalty'>('score_bonus');

  // --- State for Simulasi Penginputan Skor Manual & Penalti ---
  const [manualTeamInput, setManualTeamInput] = useState<string>('team-01');
  const [manualPosCodeInput, setManualPosCodeInput] = useState<string>(currentPos?.id || 'cp-02');
  const [manualScore, setManualScore] = useState<number>(100);
  const [manualCategory, setManualCategory] = useState<string>('Kekompakan & Formasi Regu');
  const [manualNote, setManualNote] = useState<string>('Seluruh anggota hadir serempak dan menyelesaikan tugas dengan baik.');
  
  // State khusus Sanksi / Penalti Waktu & Skor
  const [penaltyPointsInput, setPenaltyPointsInput] = useState<number>(30);
  const [penaltyMinutesInput, setPenaltyMinutesInput] = useState<number>(5);
  const [penaltyViolationCategory, setPenaltyViolationCategory] = useState<string>('Anggota Terpisah / Tidak Lengkap Saat Checkin');

  const [manualPhotoUrl, setManualPhotoUrl] = useState<string>('');
  const [markCheckpointDone, setMarkCheckpointDone] = useState<boolean>(true);
  const [manualHistory, setManualHistory] = useState<ManualScoreHistoryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // --- Lightbox / Photo Zoom Modal State ---
  const [lightboxSub, setLightboxSub] = useState<ChallengeSubmission | null>(null);

  // Helper validation lookup for live preview
  const validatedTeam = teams.find((t) => {
    const val = (manualTeamInput || '').trim().toLowerCase();
    return t.id.toLowerCase() === val || t.bibNumber.toLowerCase() === val || t.name.toLowerCase() === val;
  });

  const validatedCheckpoint = checkpoints.find((c) => {
    const val = (manualPosCodeInput || '').trim().toUpperCase();
    const cpId = c.id.toUpperCase();
    const qrVal = c.qrCodeValue.toUpperCase();
    const cpName = c.name.toUpperCase();
    const cpCode = (c as any).code ? String((c as any).code).toUpperCase() : '';
    return (
      cpId === val ||
      qrVal === val ||
      qrVal.replace(/-/g, '') === val.replace(/-/g, '') ||
      cpName === val ||
      (cpCode && cpCode === val)
    );
  });

  // Handle Manual Score & Penalty Submission with validation and instant toast feedback
  const handleManualScoreSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    const teamInputClean = manualTeamInput.trim();
    const posCodeClean = manualPosCodeInput.trim();

    // 1. Validasi Input Kosong
    if (!teamInputClean) {
      onShowToast('⚠️ Validasi Gagal: Harap masukkan ID Tim atau nomor BIB terlebih dahulu!');
      setIsSubmitting(false);
      return;
    }

    if (!posCodeClean) {
      onShowToast('⚠️ Validasi Gagal: Harap masukkan Kode Pos atau ID Checkpoint!');
      setIsSubmitting(false);
      return;
    }

    // 2. Validasi Keberadaan Tim
    if (!validatedTeam) {
      onShowToast(`⚠️ Validasi Gagal: ID Tim atau nomor BIB "${manualTeamInput}" tidak ditemukan dalam daftar peserta lomba!`);
      setIsSubmitting(false);
      return;
    }

    // 3. Validasi Keberadaan Kode Pos
    if (!validatedCheckpoint) {
      onShowToast(`⚠️ Validasi Gagal: Kode Pos "${manualPosCodeInput}" tidak valid atau tidak cocok dengan rute lomba!`);
      setIsSubmitting(false);
      return;
    }

    if (evaluationMode === 'score_bonus') {
      // 4a. Validasi Skor Bonus
      if (isNaN(manualScore) || manualScore < 0) {
        onShowToast('⚠️ Validasi Gagal: Nilai skor harus berupa angka valid lebih dari atau sama dengan 0!');
        setIsSubmitting(false);
        return;
      }

      // 5a. Eksekusi penginputan skor bonus ke RaceContext
      const fullNote = `[${manualCategory}] ${manualNote}`.trim();
      const result = submitJudgeManualScore(
        manualTeamInput,
        manualPosCodeInput,
        manualScore,
        fullNote,
        markCheckpointDone,
        manualPhotoUrl,
        false,
        0
      );

      if (result.success) {
        onShowToast(
          `✅ Sukses Input Manual! +${result.scoreAwarded} Poin berhasil dicatat untuk Tim ${result.teamName} di ${result.checkpointName}.`
        );

        const historyItem: ManualScoreHistoryItem = {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          teamId: validatedTeam.id,
          teamName: validatedTeam.name,
          bibNumber: validatedTeam.bibNumber,
          checkpointId: validatedCheckpoint.id,
          checkpointName: validatedCheckpoint.name,
          score: manualScore,
          isPenalty: false,
          category: manualCategory,
          note: manualNote,
          photoUrl: manualPhotoUrl || undefined,
        };
        setManualHistory((prev) => [historyItem, ...prev]);
        setManualPhotoUrl('');
      } else {
        onShowToast(`❌ Input Gagal: ${result.message}`);
      }
    } else {
      // 4b. Validasi Sanksi / Penalti
      const ptsToDeduct = Math.max(0, Number(penaltyPointsInput) || 0);
      const minsToAdd = Math.max(0, Number(penaltyMinutesInput) || 0);

      if (ptsToDeduct === 0 && minsToAdd === 0) {
        onShowToast('⚠️ Validasi Gagal: Tentukan nilai potongan poin atau penambahan menit waktu penalti!');
        setIsSubmitting(false);
        return;
      }

      // 5b. Eksekusi penginputan penalti ke RaceContext
      const penaltyNote = `[Penalti: ${penaltyViolationCategory}] ${manualNote}`.trim();
      const result = submitJudgeManualScore(
        manualTeamInput,
        manualPosCodeInput,
        -ptsToDeduct,
        penaltyNote,
        false,
        manualPhotoUrl,
        true,
        minsToAdd
      );

      if (result.success) {
        onShowToast(
          `🔴 Penalti Diterbitkan! Tim ${result.teamName} dikenakan -${result.penaltyDeducted} Poin & +${result.penaltyMinutesAdded}m Waktu di ${result.checkpointName}.`
        );

        const historyItem: ManualScoreHistoryItem = {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          teamId: validatedTeam.id,
          teamName: validatedTeam.name,
          bibNumber: validatedTeam.bibNumber,
          checkpointId: validatedCheckpoint.id,
          checkpointName: validatedCheckpoint.name,
          score: -ptsToDeduct,
          penaltyMinutes: minsToAdd,
          isPenalty: true,
          category: `Penalti: ${penaltyViolationCategory}`,
          note: manualNote,
          photoUrl: manualPhotoUrl || undefined,
        };
        setManualHistory((prev) => [historyItem, ...prev]);
        setManualPhotoUrl('');
      } else {
        onShowToast(`❌ Penerbitan Penalti Gagal: ${result.message}`);
      }
    }

    setIsSubmitting(false);
  };

  // Preset button helpers for quick test simulation
  const handleFillValidSample = () => {
    setEvaluationMode('score_bonus');
    const sampleTeam = teams[0] || { id: 'team-01', bibNumber: '101' };
    const sampleCp = checkpoints[1] || checkpoints[0] || { id: 'cp-02' };
    setManualTeamInput(sampleTeam.id);
    setManualPosCodeInput(sampleCp.id);
    setManualScore(120);
    setManualCategory('Kekompakan & Formasi Regu');
    setManualNote('Formasi lengkap dan disiplin tinggi saat tiba di pos.');
    setManualPhotoUrl('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=600&q=80');
    onShowToast(`📋 Contoh data valid dimuat: Tim ${sampleTeam.name || sampleTeam.id} & ${sampleCp.name || sampleCp.id}.`);
  };

  const handleFillPenaltySample = (category: string, pts: number, mins: number, noteText: string) => {
    setEvaluationMode('penalty');
    const sampleTeam = teams[0] || { id: 'team-01', bibNumber: '101' };
    const sampleCp = checkpoints[1] || checkpoints[0] || { id: 'cp-02' };
    setManualTeamInput(sampleTeam.id);
    setManualPosCodeInput(sampleCp.id);
    setPenaltyViolationCategory(category);
    setPenaltyPointsInput(pts);
    setPenaltyMinutesInput(mins);
    setManualNote(noteText);
    setManualPhotoUrl('https://images.unsplash.com/photo-1517649763962-0c6232660102?auto=format&fit=crop&w=600&q=80');
    onShowToast(`⚠️ Preset Penalti Diberlakukan: -${pts} Pts & +${mins}m Waktu [${category}]`);
  };

  const handleFillInvalidTeamSample = () => {
    setManualTeamInput('team-999-invalid');
    onShowToast('⚠️ Contoh ID Tim tidak valid (team-999-invalid) dimasukkan untuk uji validasi!');
  };

  const handleFillInvalidPosSample = () => {
    setManualPosCodeInput('pos-palsu-99');
    onShowToast('⚠️ Contoh Kode Pos tidak valid (pos-palsu-99) dimasukkan untuk uji validasi!');
  };

  // --- Submissions Queue State ---
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [queueScoreInput, setQueueScoreInput] = useState<number>(140);
  const [queueJudgeFeedback, setQueueJudgeFeedback] = useState<string>('Formasi lengkap dan seluruh anggota hadir.');

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');
  const approvedSubmissions = submissions.filter((s) => s.status === 'approved');
  const selectedReview = submissions.find((s) => s.id === activeReviewId) || pendingSubmissions[0];

  const handleApproveQueue = () => {
    if (!selectedReview) return;
    reviewSubmission(selectedReview.id, 'approved', queueScoreInput, queueJudgeFeedback);
    onShowToast(`Nilai disetujui! +${queueScoreInput} Poin bonus berhasil ditambahkan ke ${selectedReview.teamName}.`);
  };

  const handleRejectQueue = () => {
    if (!selectedReview) return;
    reviewSubmission(selectedReview.id, 'rejected', 0, queueJudgeFeedback);
    onShowToast(`Tugas ${selectedReview.teamName} ditolak. Diminta mengulang.`);
  };

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-[#0b192c] text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase">
              ● Pos Jaga Aktif
            </span>
            <span className="text-xs text-orange-400 font-mono font-bold tracking-wider">LIVE EVALUATOR & SCORING</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">Dashboard Juri & Fasilitator Pos</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Simulasi penginputan skor manual dengan validasi instan ID tim dan kode pos, serta verifikasi antrean foto & tugas digital peserta.
          </p>
        </div>

        {/* Pos Selector Dropdown */}
        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 w-full md:w-auto">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Pos Tempat Anda Bertugas:
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedPosId}
              onChange={(e) => {
                setSelectedPosId(e.target.value);
                setManualPosCodeInput(e.target.value);
              }}
              className="w-full bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {checkpoints.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name} ({cp.locationName})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setManualPosCodeInput(selectedPosId);
                onShowToast(`📍 Kode pos disetel ke pos jaga aktif: ${currentPos?.name}`);
              }}
              title="Gunakan untuk form input skor manual"
              className="px-2.5 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold rounded-lg text-xs shrink-0 cursor-pointer transition-colors"
            >
              Pakai
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('map_radar')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'map_radar'
                ? 'bg-orange-500 text-slate-950 shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Navigation className="w-4 h-4 text-orange-950" />
            <span>Peta Live GPS & Pos Leaflet</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
              activeTab === 'map_radar' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {checkpoints.length} Pos
            </span>
          </button>

          <button
            onClick={() => setActiveTab('manual_input')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'manual_input'
                ? 'bg-orange-500 text-slate-950 shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Simulasi Input Skor Manual Juri</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
              activeTab === 'manual_input' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              Form Validasi
            </span>
          </button>

          <button
            onClick={() => setActiveTab('submissions_queue')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'submissions_queue'
                ? 'bg-[#0b192c] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Antrean Tugas Digital Peserta</span>
            {pendingSubmissions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 animate-pulse">
                {pendingSubmissions.length}
              </span>
            )}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Feedback notifikasi toast instan & Leaflet GPS aktif</span>
        </div>
      </div>

      {/* ========================================================
          TAB 0: PETA LIVE GPS & RADAR POS LEAFLET
          ======================================================== */}
      {activeTab === 'map_radar' && (
        <div className="space-y-6">
          {/* Main Leaflet Map Component */}
          <JudgeLeafletMap
            checkpoints={checkpoints}
            teams={teams}
            sosAlerts={sosAlerts}
            selectedPosId={selectedPosId}
            onSelectPos={(posId) => {
              setSelectedPosId(posId);
              setManualPosCodeInput(posId);
            }}
            onSelectTeam={(teamId) => {
              setManualTeamInput(teamId);
              setActiveTab('manual_input');
            }}
            onShowToast={onShowToast}
          />

          {/* Grid Overview: Checkpoint GPS Coordinates & Realtime Participant GPS Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Card: Daftar Koordinat GPS Pos Lomba */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Titik Lokasi Pos Lomba (Checkpoints)</h3>
                    <p className="text-[11px] text-slate-500">Koordinat GPS resmi tiap pos kontrol untuk acuan navigasi.</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  {checkpoints.length} POS KOORDINAT
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {checkpoints.map((cp, idx) => {
                  const isSelected = cp.id === selectedPosId;
                  const teamsAtPos = teams.filter((t) => t.currentCheckpointId === cp.id).length;

                  return (
                    <div
                      key={`${cp.id}-${idx}`}
                      onClick={() => {
                        setSelectedPosId(cp.id);
                        setManualPosCodeInput(cp.id);
                        onShowToast(`📍 Selected ${cp.name} as active Pos Jaga`);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50/80 border-orange-400 ring-2 ring-orange-400/30'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-lg text-[11px] font-extrabold flex items-center justify-center ${
                            isSelected ? 'bg-orange-500 text-slate-950' : 'bg-slate-900 text-white'
                          }`}>
                            P{cp.number}
                          </span>
                          <div>
                            <div className="text-xs font-extrabold text-slate-900 line-clamp-1">{cp.name}</div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">{cp.locationName}</div>
                          </div>
                        </div>
                        {cp.isMandatory && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 shrink-0">
                            Wajib
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                        <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                          🌐 {cp.coordinates.lat.toFixed(4)}, {cp.coordinates.lng.toFixed(4)}
                        </span>
                        <span className="font-bold text-orange-600 bg-orange-100/80 px-2 py-0.5 rounded">
                          {teamsAtPos} Tim Aktif
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Card: GPS Live Status Peserta Real-Time */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Status GPS Live Peserta Terkini</h3>
                    <p className="text-[11px] text-slate-500">Posisi koordinat realtime peserta di lintasan balap.</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                  ● LIVE TRACKING
                </span>
              </div>

              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {teams.map((team, idx) => {
                  const targetCp = checkpoints.find((c) => c.id === team.currentCheckpointId);
                  const coords = team.currentCoordinates || (targetCp ? targetCp.coordinates : { lat: -6.6350, lng: 106.8830 });

                  return (
                    <div
                      key={`${team.id}-${idx}`}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2 py-1 rounded-lg bg-emerald-500 text-white font-black text-xs shrink-0">
                          {team.bibNumber}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900 truncate">{team.name}</span>
                            <span className="text-[10px] font-bold text-slate-500 truncate">({team.category})</span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                            <span>Pos Terakhir: <strong>{team.lastPosName || 'Start'}</strong></span>
                            <span>•</span>
                            <span className="font-mono text-emerald-700 font-bold">
                              📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setManualTeamInput(team.id);
                          setActiveTab('manual_input');
                          onShowToast(`🎯 Tim ${team.name} (${team.bibNumber}) dipilih untuk penginputan nilai.`);
                        }}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold rounded-lg text-xs shrink-0 transition-colors cursor-pointer"
                      >
                        Input Skor
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 1: SIMULASI PENGINPUTAN SKOR MANUAL & PENALTI JURI
          ======================================================== */}
      {activeTab === 'manual_input' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Formulir Simulasi Penginputan Skor & Penalti (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
              {/* Header Panel */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    evaluationMode === 'penalty' ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {evaluationMode === 'penalty' ? <AlertCircle className="w-5 h-5" /> : <Award className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {evaluationMode === 'penalty' ? 'Pengaturan Penalti & Sanksi Juri' : 'Formulir Input Skor Manual Juri'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {evaluationMode === 'penalty' 
                        ? 'Pengurangan skor poin & penambahan waktu tempuh jika tim melanggar aturan pos.'
                        : 'Pemberian poin bonus & evaluasi tugas pos secara manual dengan validasi instan.'}
                    </p>
                  </div>
                </div>

                {/* Mode Selector Toggle */}
                <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEvaluationMode('score_bonus');
                      onShowToast('🟢 Mode Penilaian: Bonus & Skor Tambahan.');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      evaluationMode === 'score_bonus'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🟢 Skor Bonus
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEvaluationMode('penalty');
                      onShowToast('🔴 Mode Penalti: Potong Skor & Tambah Waktu.');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      evaluationMode === 'penalty'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔴 Penalti Waktu / Skor
                  </button>
                </div>
              </div>

              {/* Quick Preset Helpers */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    Simulasi & Preset Sanksi Cepat Juri:
                  </span>
                  <span className="text-[10px] text-slate-400">Pilih 1-klik</span>
                </div>

                {evaluationMode === 'score_bonus' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleFillValidSample}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Isi Contoh Valid (+120 Pts)
                    </button>
                    <button
                      type="button"
                      onClick={handleFillInvalidTeamSample}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Uji ID Tim Salah
                    </button>
                    <button
                      type="button"
                      onClick={handleFillInvalidPosSample}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Uji Kode Pos Salah
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleFillPenaltySample('Anggota Terpisah / Tidak Lengkap Saat Checkin', 20, 5, 'Dua anggota tertinggal di belakang saat scan QR pos.')}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>🚫 Anggota Terpisah (-20 Pts, +5m)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillPenaltySample('Melanggar Rute & Melintasi Area Terlarang', 50, 10, 'Tim melintasi zona berbahaya tanpa izin fasilitator.')}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>⚠️ Melanggar Rute (-50 Pts, +10m)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillPenaltySample('Atribut & Perlengkapan Wajib Kurang', 30, 5, 'Tidak membawa rompi keselamatan dan peluit pos.')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>🎒 Atribut Kurang (-30 Pts, +5m)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillPenaltySample('Pelanggaran Keselamatan / Safety (K3)', 100, 15, 'Sanksi berat: Berlari ceroboh di lereng curam.')}
                      className="px-2.5 py-1.5 rounded-lg bg-red-200 hover:bg-red-300 text-red-950 text-[11px] font-black transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>🚨 Pelanggaran Safety (-100 Pts, +15m)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Form Input */}
              <form onSubmit={handleManualScoreSubmit} className="space-y-4">
                {/* 1. Field ID Tim */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <span>ID Tim atau Nomor BIB:</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {/* Live Validation Indicator */}
                    {manualTeamInput.trim() ? (
                      validatedTeam ? (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Valid: {validatedTeam.name} (BIB {validatedTeam.bibNumber})
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" />
                          Tidak Terdaftar
                        </span>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-400">Wajib diisi</span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={manualTeamInput}
                      onChange={(e) => setManualTeamInput(e.target.value)}
                      placeholder="Masukkan ID Tim (misal: team-01) atau BIB (misal: 101)..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-mono transition-all focus:outline-none focus:ring-2 ${
                        validatedTeam 
                          ? 'border-emerald-300 bg-emerald-50/20 focus:ring-emerald-400' 
                          : manualTeamInput.trim()
                            ? 'border-rose-300 bg-rose-50/20 focus:ring-rose-400'
                            : 'border-slate-300 bg-white focus:ring-orange-400'
                      }`}
                    />
                  </div>

                  {/* Quick Select Team Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Pilih Tim:</span>
                    {teams.slice(0, 6).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setManualTeamInput(t.id);
                          onShowToast(`🎯 Tim ${t.name} (BIB ${t.bibNumber}) dipilih.`);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                          manualTeamInput === t.id || manualTeamInput === t.bibNumber
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {t.name} ({t.bibNumber})
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Field Kode Pos */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <span>Kode Pos atau ID Checkpoint:</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {/* Live Validation Indicator */}
                    {manualPosCodeInput.trim() ? (
                      validatedCheckpoint ? (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Valid: {validatedCheckpoint.name}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" />
                          Kode Pos Salah
                        </span>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-400">Wajib diisi</span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={manualPosCodeInput}
                      onChange={(e) => setManualPosCodeInput(e.target.value)}
                      placeholder="Masukkan kode pos (misal: cp-01 atau RP-BOGOR-01)..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-mono uppercase transition-all focus:outline-none focus:ring-2 ${
                        validatedCheckpoint 
                          ? 'border-emerald-300 bg-emerald-50/20 focus:ring-emerald-400' 
                          : manualPosCodeInput.trim()
                            ? 'border-rose-300 bg-rose-50/20 focus:ring-rose-400'
                            : 'border-slate-300 bg-white focus:ring-orange-400'
                      }`}
                    />
                  </div>

                  {/* Quick Select Pos Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Pilih Pos:</span>
                    {checkpoints.map((cp) => (
                      <button
                        key={cp.id}
                        type="button"
                        onClick={() => {
                          setManualPosCodeInput(cp.id);
                          onShowToast(`📍 ${cp.name} (${cp.id}) dipilih.`);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                          manualPosCodeInput.toUpperCase() === cp.id.toUpperCase() ||
                          manualPosCodeInput.toUpperCase() === cp.qrCodeValue.toUpperCase()
                            ? 'bg-orange-500 text-slate-950 border-orange-500'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {cp.name.split(':')[0]} ({cp.id})
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. DYNAMIC SCORING / PENALTY INPUT SECTION */}
                {evaluationMode === 'score_bonus' ? (
                  /* --- MODE 1: SKOR BONUS --- */
                  <div className="space-y-2 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Nilai Skor Manual Tambahan yang Diberikan:
                      </label>
                      <div className="flex items-center gap-1 font-mono font-extrabold text-emerald-600 text-lg">
                        <span>+{manualScore}</span>
                        <span className="text-xs text-slate-500 font-sans font-medium">Poin</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={150}
                        step={5}
                        value={manualScore}
                        onChange={(e) => setManualScore(Number(e.target.value))}
                        className="flex-1 accent-emerald-500 cursor-pointer"
                      />
                      <input
                        type="number"
                        min={0}
                        max={300}
                        value={manualScore}
                        onChange={(e) => setManualScore(Math.max(0, Number(e.target.value)))}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold mr-1">Preset Bonus:</span>
                      {[25, 50, 75, 100, 125, 150].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setManualScore(pts)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            manualScore === pts
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          +{pts} Pts
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* --- MODE 2: PENALTY WAKTU & SKOR --- */
                  <div className="space-y-4 p-4 bg-rose-50/70 border border-rose-200 rounded-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-200/60">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-900">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Pengaturan Besaran Sanksi Pelanggaran:</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                        MODE PENALTI LAPANGAN
                      </span>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-rose-900">
                        Jenis Pelanggaran Aturan Pos:
                      </label>
                      <select
                        value={penaltyViolationCategory}
                        onChange={(e) => setPenaltyViolationCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="Anggota Terpisah / Tidak Lengkap Saat Checkin">Anggota Terpisah / Tidak Lengkap Saat Checkin (-20 Pts, +5m Waktu)</option>
                        <option value="Melanggar Rute & Melintasi Area Terlarang">Melanggar Rute & Melintasi Area Terlarang (-50 Pts, +10m Waktu)</option>
                        <option value="Atribut & Perlengkapan Wajib Kurang">Atribut & Perlengkapan Wajib Kurang (-30 Pts, +5m Waktu)</option>
                        <option value="Mengabaikan Instruksi Fasilitator Pos">Mengabaikan Instruksi Fasilitator Pos (-50 Pts, +10m Waktu)</option>
                        <option value="Pelanggaran Keselamatan / Safety (K3)">Pelanggaran Keselamatan / Safety (K3) (-100 Pts, +15m Waktu)</option>
                        <option value="Keterlambatan / Overdue Pos">Keterlambatan / Overdue Pos (-10 Pts per menit)</option>
                        <option value="Pelanggaran Aturan Pos Lainnya">Pelanggaran Aturan Pos Lainnya (Manual)</option>
                      </select>
                    </div>

                    {/* Dual Sliders: Deduct Score & Add Penalty Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Potongan Skor Poin */}
                      <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>Potong Skor Poin:</span>
                          <span className="font-mono text-rose-600 font-extrabold text-sm">
                            -{penaltyPointsInput} Pts
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          step={5}
                          value={penaltyPointsInput}
                          onChange={(e) => setPenaltyPointsInput(Number(e.target.value))}
                          className="w-full accent-rose-600 cursor-pointer"
                        />
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>0 Pts</span>
                          <span>100 Pts</span>
                          <span>200 Pts</span>
                        </div>
                      </div>

                      {/* Penambahan Menit Waktu Penalti */}
                      <div className="p-3 bg-white rounded-xl border border-rose-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>Tambah Menit Waktu:</span>
                          <span className="font-mono text-amber-600 font-extrabold text-sm">
                            +{penaltyMinutesInput}m Waktu
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={60}
                          step={1}
                          value={penaltyMinutesInput}
                          onChange={(e) => setPenaltyMinutesInput(Number(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>0 Menit</span>
                          <span>30 Menit</span>
                          <span>60 Menit</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Unggah Foto Bukti Pelanggaran / Misi */}
                <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-orange-500" />
                      <span>Lampiran Foto Bukti {evaluationMode === 'penalty' ? 'Pelanggaran Aturan' : 'Evaluasi Lapangan'} (Opsional):</span>
                    </label>
                    {manualPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setManualPhotoUrl('')}
                        className="text-[10px] text-rose-600 hover:underline font-bold"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>

                  {manualPhotoUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-900 max-h-36 group">
                      <img 
                        src={manualPhotoUrl} 
                        alt="Bukti Foto Evaluasi" 
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLightboxSub({
                            id: 'temp-manual',
                            teamId: validatedTeam?.id || 'team',
                            teamName: validatedTeam?.name || 'Tim Peserta',
                            checkpointId: validatedCheckpoint?.id || 'cp',
                            checkpointName: validatedCheckpoint?.name || 'Pos Checkpoint',
                            submittedAt: 'Baru saja',
                            type: 'photo',
                            contentText: manualNote,
                            contentUrl: manualPhotoUrl,
                            status: 'approved',
                            scoreGiven: evaluationMode === 'penalty' ? -penaltyPointsInput : manualScore,
                            judgeNote: evaluationMode === 'penalty' ? `Penalti: ${penaltyViolationCategory}` : manualCategory
                          })}
                          className="p-2 bg-white/90 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-white cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <label className="flex-1 w-full py-2 px-3 border border-dashed border-slate-300 rounded-xl bg-white hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                        <Upload className="w-3.5 h-3.5 text-orange-500" />
                        <span>Unggah Foto Bukti Lapangan</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImageFile(file, 800, 800, 0.7);
                              if (compressed) {
                                setManualPhotoUrl(compressed);
                                onShowToast('Foto bukti evaluasi lapangan berhasil dilampirkan.');
                              }
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const samples = [
                            'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=600&q=80',
                            'https://images.unsplash.com/photo-1517649763962-0c6232660102?auto=format&fit=crop&w=600&q=80',
                            'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80'
                          ];
                          const randomUrl = samples[Math.floor(Math.random() * samples.length)];
                          setManualPhotoUrl(randomUrl);
                          onShowToast('Foto sampel bukti lapangan dimuat.');
                        }}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer shrink-0 transition-colors"
                      >
                        Pakai Sampel
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. Field Kategori & Opsi Rute */}
                {evaluationMode === 'score_bonus' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">
                        Kategori Penilaian:
                      </label>
                      <select
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="Kekompakan & Formasi Regu">Kekompakan & Formasi Regu</option>
                        <option value="Ketepatan Waktu & Kedisiplinan">Ketepatan Waktu & Kedisiplinan</option>
                        <option value="Penyelesaian Kuis & Sandi">Penyelesaian Kuis & Sandi</option>
                        <option value="Tantangan Fisik & Rintangan">Tantangan Fisik & Rintangan</option>
                        <option value="Bonus Fair Play & Kerjasama">Bonus Fair Play & Kerjasama</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">
                        Opsi Rute & Progres:
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={markCheckpointDone}
                          onChange={(e) => setMarkCheckpointDone(e.target.checked)}
                          className="rounded accent-orange-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Tandai pos selesai dalam progres tim</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* 6. Catatan Evaluasi / Alasan Penalti */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    {evaluationMode === 'penalty' ? 'Alasan Penerbitan Penalti / Catatan Pelanggaran:' : 'Catatan Evaluasi / Alasan Penilaian:'}
                  </label>
                  <textarea
                    rows={2}
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    placeholder={
                      evaluationMode === 'penalty'
                        ? 'Contoh: Anggota tim terpisah 200 meter dari titik checkin pos dan tidak memakai helm keselamatan...'
                        : 'Contoh: Seluruh regu hadir lengkap, yel-yel lantang, dan berhasil memecahkan kode pos...'
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Tombol Eksekusi Penilaian / Penalti */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 px-4 font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 ${
                      evaluationMode === 'penalty'
                        ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-rose-600/20'
                        : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 shadow-orange-500/20'
                    }`}
                  >
                    {evaluationMode === 'penalty' ? (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>Terbitkan Sanksi Penalti (-{penaltyPointsInput} Pts, +{penaltyMinutesInput}m Waktu)</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Simpan & Kirim Skor Manual (+{manualScore} Poin)</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400 mt-2">
                    Hasil {evaluationMode === 'penalty' ? 'penalti' : 'skor'} langsung terhubung ke Leaderboard dan tersimpan di RaceContext secara realtime.
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Kolom Kanan: Live Verifikasi Preview & Riwayat Sesi Ini (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Card Live Verifikasi Ringkasan */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-500" />
                <span>Pratinjau Validasi & Simulasi Hasil</span>
              </h3>

              {/* Status Tim yang Divalidasi */}
              <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                validatedTeam 
                  ? evaluationMode === 'penalty' ? 'bg-rose-50/70 border-rose-200' : 'bg-emerald-50/60 border-emerald-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                    Status Tim Target
                  </span>
                  {validatedTeam ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      evaluationMode === 'penalty' ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-800'
                    }`}>
                      TERDAFTAR
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">
                      BELUM DITEMUKAN
                    </span>
                  )}
                </div>

                {validatedTeam ? (
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">{validatedTeam.name}</div>
                    <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span>BIB: <strong>{validatedTeam.bibNumber}</strong></span>
                      <span>Skor: <strong className="text-slate-900">{validatedTeam.totalScore} Pts</strong></span>
                      <span>Durasi: <strong>{validatedTeam.durationMinutes}m</strong></span>
                    </div>

                    {/* Simulation After Applied */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[11px] space-y-1">
                      <div className="font-bold text-slate-700">Simulasi Setelah Tindakan Juri:</div>
                      {evaluationMode === 'penalty' ? (
                        <div className="p-2 rounded bg-white border border-rose-200 font-mono text-rose-900 space-y-0.5">
                          <div>• Potongan Skor: <strong className="text-rose-600">-{penaltyPointsInput} Pts</strong> (Total: {Math.max(0, validatedTeam.totalScore - penaltyPointsInput)} Pts)</div>
                          <div>• Penalti Waktu: <strong className="text-amber-600">+{penaltyMinutesInput}m</strong> (Durasi: {validatedTeam.durationMinutes + penaltyMinutesInput}m)</div>
                        </div>
                      ) : (
                        <div className="p-2 rounded bg-white border border-emerald-200 font-mono text-emerald-900">
                          • Tambahan Skor: <strong className="text-emerald-600">+{manualScore} Pts</strong> (Total Baru: {validatedTeam.totalScore + manualScore} Pts)
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-[11px]">
                    Masukkan ID tim atau BIB yang valid untuk melihat simulasi skor & penalti.
                  </p>
                )}
              </div>

              {/* Status Pos yang Divalidasi */}
              <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                validatedCheckpoint 
                  ? 'bg-blue-50/60 border-blue-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                    Status Checkpoint
                  </span>
                  {validatedCheckpoint ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-200 text-blue-800">
                      KODE VALID
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">
                      BELUM DITEMUKAN
                    </span>
                  )}
                </div>

                {validatedCheckpoint ? (
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">{validatedCheckpoint.name}</div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      Lokasi: {validatedCheckpoint.locationName} • Maks. {validatedCheckpoint.points} Poin
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      QR: {validatedCheckpoint.qrCodeValue}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-[11px]">
                    Masukkan kode pos atau ID pos yang cocok dengan rute event.
                  </p>
                )}
              </div>
            </div>

            {/* Riwayat Penginputan Skor Manual & Penalti Sesi Ini */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Riwayat Input Skor & Penalti Sesi Ini
                  </h3>
                  <p className="text-[11px] text-slate-400">Total {manualHistory.length} tindakan juri tercatat</p>
                </div>
                {manualHistory.length > 0 && (
                  <button
                    onClick={() => {
                      setManualHistory([]);
                      onShowToast('Riwayat input manual & penalti sesi ini telah dibersihkan.');
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                  >
                    Bersihkan
                  </button>
                )}
              </div>

              {manualHistory.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FileText className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                  Belum ada catatan input skor atau penalti. Isi formulir di sebelah kiri dan klik simpan untuk mencatat tindakan di sini.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {manualHistory.map((item, idx) => (
                    <div 
                      key={`${item.id}-${idx}`} 
                      className={`p-3 rounded-xl border text-xs space-y-1 transition-colors ${
                        item.isPenalty ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900">
                          {item.teamName} <span className="font-normal text-slate-500 font-mono">(BIB {item.bibNumber})</span>
                        </span>
                        {item.isPenalty ? (
                          <span className="font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200 shrink-0 font-mono">
                            {item.score} Pts {item.penaltyMinutes ? `| +${item.penaltyMinutes}m` : ''}
                          </span>
                        ) : (
                          <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 font-mono">
                            +{item.score} Pts
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span>{item.checkpointName} • <span className={`font-semibold ${item.isPenalty ? 'text-rose-600' : 'text-orange-600'}`}>{item.category}</span></span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                      </div>
                      {item.photoUrl && (
                        <div className="flex items-center gap-2 pt-1">
                          <img 
                            src={item.photoUrl} 
                            alt="Bukti" 
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" 
                          />
                          <button
                            type="button"
                            onClick={() => setLightboxSub({
                              id: item.id,
                              teamId: item.teamId,
                              teamName: item.teamName,
                              checkpointId: item.checkpointId,
                              checkpointName: item.checkpointName,
                              submittedAt: item.timestamp,
                              type: item.isPenalty ? 'penalty' : 'photo',
                              contentText: item.note,
                              contentUrl: item.photoUrl,
                              status: 'approved',
                              scoreGiven: item.score,
                              penaltyMinutesAdded: item.penaltyMinutes,
                              judgeNote: item.category
                            })}
                            className="text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Lihat Foto Bukti
                          </button>
                        </div>
                      )}
                      {item.note && (
                        <p className="text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-100 italic">
                          "{item.note}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: ANTREAN TUGAS DIGITAL PESERTA (PHOTO / QUIZ REVIEW)
          ======================================================== */}
      {activeTab === 'submissions_queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom 1: Daftar Tim Tiba & Tugas Menunggu (2 Cols) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Card Pos Aktif Info */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-bold">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base">{currentPos?.name}</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Maks: {currentPos?.points} Poin
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{currentPos?.locationName}</p>
                <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                  <strong>Instruksi Juri:</strong> {currentPos?.challengeDescription}
                </div>
              </div>
            </div>

            {/* Antrean Tugas yang Menunggu Penilaian */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Antrean Menunggu Penilaian ({pendingSubmissions.length})
                  </h3>
                  <p className="text-xs text-slate-500">Klik tugas tim untuk membuka foto & formulir penilaian</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  {pendingSubmissions.length} Perlu Dinilai
                </span>
              </div>

              {pendingSubmissions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Camera className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-600">Belum ada tugas menunggu di antrean pos ini.</p>
                  <p>Semua kiriman tugas dari HP peserta atau simulasi akan langsung muncul secara realtime di sini.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingSubmissions.map((sub, idx) => {
                    const isSelected = selectedReview?.id === sub.id;
                    const hasPhoto = Boolean(sub.contentUrl || sub.type === 'photo');
                    const displayPhoto = sub.contentUrl || 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=600&q=80';

                    return (
                      <div 
                        key={`${sub.id}-${idx}`}
                        onClick={() => setActiveReviewId(sub.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-orange-500 bg-orange-50/40 shadow-sm ring-1 ring-orange-400' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          {/* Left: Thumbnail & Info */}
                          <div className="flex items-start gap-3 flex-1">
                            {/* Photo Thumbnail */}
                            {hasPhoto && (
                              <div className="relative group shrink-0">
                                <img 
                                  src={displayPhoto} 
                                  alt="Bukti Misi" 
                                  className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-xs"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxSub(sub);
                                  }}
                                  className="absolute inset-0 bg-slate-900/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1"
                                >
                                  <ZoomIn className="w-3.5 h-3.5" />
                                  <span>Zoom</span>
                                </button>
                              </div>
                            )}

                            <div className="space-y-1 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-sm">{sub.teamName}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  sub.type === 'photo' 
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}>
                                  {sub.type === 'photo' ? '📷 Foto Misi' : '📝 Kuis Jawaban'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                  {sub.checkpointName}
                                </span>
                              </div>

                              <p className="text-xs text-slate-700 font-medium bg-slate-50 p-2 rounded-lg border border-slate-200 italic">
                                "{sub.contentText}"
                              </p>

                              <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-slate-400" /> Dikirim {sub.submittedAt}
                              </p>
                            </div>
                          </div>

                          {/* Right: Select Action */}
                          <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                            <button className={`w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-orange-500 text-slate-950 shadow-sm' 
                                : 'bg-[#0b192c] text-white hover:bg-slate-800'
                            }`}>
                              {isSelected ? '✓ Sedang Dinilai' : 'Pilih Nilai'}
                            </button>
                            {hasPhoto && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxSub(sub);
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Maximize2 className="w-3 h-3" /> Look Full
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Riwayat yang Telah Diverifikasi */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  Riwayat Penilaian yang Telah Selesai ({approvedSubmissions.length})
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  TERSIMPAM DI RACECONTEXT
                </span>
              </div>

              {approvedSubmissions.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4 italic">Belum ada riwayat penilaian yang disetujui.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {approvedSubmissions.map((sub) => {
                    const hasPhoto = Boolean(sub.contentUrl || sub.type === 'photo');
                    const displayPhoto = sub.contentUrl || 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=600&q=80';

                    return (
                      <div key={sub.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs hover:border-slate-300 transition-colors">
                        <div className="flex items-center gap-3">
                          {hasPhoto && (
                            <img 
                              src={displayPhoto} 
                              alt="Foto Bukti" 
                              onClick={() => setLightboxSub(sub)}
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 shrink-0" 
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{sub.teamName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">({sub.checkpointName})</span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5 italic">"{sub.judgeNote}"</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Dikirim: {sub.submittedAt}</div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-mono">
                            +{sub.scoreGiven} Pts
                          </span>
                          {hasPhoto && (
                            <button
                              type="button"
                              onClick={() => setLightboxSub(sub)}
                              className="text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> Foto
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Kolom 2: Panel Input Nilai Langsung (1 Col) */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 sticky top-20">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-orange-500" />
                  <span>Panel Nilai Bukti Misi</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  REALTIME EVALUATOR
                </span>
              </div>

              {selectedReview ? (
                <div className="space-y-3 text-xs">
                  {/* Selected Team Header Info */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tim yang Evaluasi:</span>
                    <div className="font-extrabold text-slate-900 text-sm flex items-center justify-between">
                      <span>{selectedReview.teamName}</span>
                      <span className="text-xs font-mono font-bold text-orange-600">{selectedReview.checkpointName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tipe Tugas: <strong>{selectedReview.type === 'photo' ? 'Foto Misi Regu' : 'Kuis / Jawaban Text'}</strong>
                    </div>
                  </div>

                  {/* DISPLAY FOTO BUKTI MISI (REALTIME PHOTO DISPLAY) */}
                  <div className="space-y-1.5 p-3 bg-purple-50/60 border border-purple-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-purple-950 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-purple-600" />
                        <span>Pratinjau Foto Bukti Peserta:</span>
                      </label>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                        LAMPIRAN SINKRON
                      </span>
                    </div>

                    {selectedReview.contentUrl ? (
                      <div className="relative group rounded-xl overflow-hidden border border-purple-300 bg-slate-950">
                        <img 
                          src={selectedReview.contentUrl} 
                          alt="Bukti Misi Peserta" 
                          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setLightboxSub(selectedReview)}
                            className="px-3 py-2 bg-white text-slate-900 rounded-xl font-extrabold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer hover:bg-slate-100"
                          >
                            <ZoomIn className="w-4 h-4 text-orange-500" />
                            <span>Perbesar & Review Penuh</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-white rounded-xl border border-dashed border-purple-300 text-center space-y-2">
                        <ImageIcon className="w-8 h-8 mx-auto text-purple-300" />
                        <p className="text-slate-600 font-bold text-[11px]">Foto belum dilampirkan secara langsung.</p>
                        <button
                          type="button"
                          onClick={() => {
                            const samples = [
                              'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=600&q=80',
                              'https://images.unsplash.com/photo-1517649763962-0c6232660102?auto=format&fit=crop&w=600&q=80',
                              'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80'
                            ];
                            const sampleUrl = samples[Math.floor(Math.random() * samples.length)];
                            selectedReview.contentUrl = sampleUrl;
                            setActiveReviewId(selectedReview.id);
                            onShowToast('📸 Sampel foto bukti dimasukkan untuk penilaian.');
                          }}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                        >
                          + Muat Foto Sampel Evaluasi
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Catatan Deskripsi Peserta */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Keterangan / Deskripsi Peserta:</span>
                    <p className="text-slate-800 font-medium text-xs italic">
                      "{selectedReview.contentText || 'Tidak ada deskripsi tertulis'}"
                    </p>
                  </div>

                  {/* Skor Slider Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">
                        Skor yang Diberikan (0 - 150 Poin):
                      </label>
                      <span className="font-mono font-extrabold text-orange-600 text-base">
                        +{queueScoreInput} Pts
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min={0} 
                        max={150} 
                        step={10}
                        value={queueScoreInput} 
                        onChange={(e) => setQueueScoreInput(Number(e.target.value))}
                        className="flex-1 accent-orange-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1 pt-1">
                      {[0, 50, 100, 150].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setQueueScoreInput(pts)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            queueScoreInput === pts ? 'bg-orange-500 text-slate-950 border-orange-500' : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {pts} Pts
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Catatan Evaluasi Juri:</label>
                    <textarea 
                      rows={2}
                      value={queueJudgeFeedback}
                      onChange={(e) => setQueueJudgeFeedback(e.target.value)}
                      placeholder="Komentar kekompakan tim atau alasan persetujuan..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={handleApproveQueue}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Setujui & Tambahkan (+{queueScoreInput} Pts)</span>
                    </button>

                    <button
                      onClick={handleRejectQueue}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <XCircle className="w-4 h-4 text-slate-500" />
                      <span>Tolak / Minta Ulangi Tugas</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Pilih salah satu tugas di antrean sebelah kiri untuk mulai menilai.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          FULL-SCREEN LIGHTBOX / PHOTO ZOOM MODAL
          ======================================================== */}
      {lightboxSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-0 relative">
            {/* Modal Header */}
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-slate-950 flex items-center justify-center font-extrabold">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {lightboxSub.teamName} <span className="text-orange-400 font-mono text-xs">({lightboxSub.checkpointName})</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inspeksi Foto Bukti Tugas Misi • Dikirim: {lightboxSub.submittedAt}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLightboxSub(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Body */}
            <div className="p-4 bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-auto">
              {lightboxSub.contentUrl ? (
                <img 
                  src={lightboxSub.contentUrl} 
                  alt="Foto Penuh Bukti Misi" 
                  className="max-h-[55vh] w-auto object-contain rounded-2xl shadow-2xl border border-slate-800"
                />
              ) : (
                <div className="text-center p-8 space-y-2 text-slate-400">
                  <ImageIcon className="w-12 h-12 mx-auto text-slate-600" />
                  <p>Tidak ada URL gambar yang dapat ditayangkan.</p>
                </div>
              )}
            </div>

            {/* Modal Footer Description & Review Actions */}
            <div className="p-5 bg-slate-900 border-t border-slate-800 space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider block">Catatan Peserta:</span>
                <p className="text-slate-200 text-sm italic">"{lightboxSub.contentText || 'Tidak ada deskripsi'}"</p>
              </div>

              {lightboxSub.status === 'pending' && (
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      reviewSubmission(lightboxSub.id, 'rejected', 0, 'Ditolak dari pratinjau foto penuh.');
                      onShowToast(`Tugas ${lightboxSub.teamName} ditolak.`);
                      setLightboxSub(null);
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Tolak Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      reviewSubmission(lightboxSub.id, 'approved', 150, 'Foto disetujui dari pratinjau foto penuh.');
                      onShowToast(`Foto ${lightboxSub.teamName} disetujui (+150 Pts)!`);
                      setLightboxSub(null);
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <CheckCircle className="w-4 h-4" /> Setujui Foto (+150 Pts)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
