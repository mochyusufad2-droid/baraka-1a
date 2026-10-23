import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Shield, 
  MapPin, 
  Smartphone, 
  Save, 
  RotateCcw, 
  CheckCircle2,
  Lock,
  AlertTriangle,
  Clock,
  Zap,
  Timer,
  RefreshCw,
  Users,
  Sliders,
  Check,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { OfficialModeModal } from './OfficialModeModal';

const PasswordManagementSection: React.FC<{ onShowToast: (msg: string) => void }> = ({ onShowToast }) => {
  const { adminPassword, judgePassword, updateRolePasswords } = useRace();
  const [newAdminPass, setNewAdminPass] = useState(adminPassword);
  const [newJudgePass, setNewJudgePass] = useState(judgePassword);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showJudgePass, setShowJudgePass] = useState(false);

  useEffect(() => {
    setNewAdminPass(adminPassword);
    setNewJudgePass(judgePassword);
  }, [adminPassword, judgePassword]);

  const handleSavePasswords = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPass.trim() || !newJudgePass.trim()) {
      onShowToast('❌ Password tidak boleh kosong!');
      return;
    }
    updateRolePasswords(newAdminPass, newJudgePass);
    onShowToast('🔑 Password Panitia (Admin) dan Juri Pos berhasil diperbarui!');
  };

  return (
    <div className="pt-3 border-t border-slate-200 space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-orange-600" />
        <label className="font-extrabold text-slate-900 text-xs">
          Pengaturan Password Akses Role (RBAC):
        </label>
      </div>

      <form onSubmit={handleSavePasswords} className="space-y-3 p-3 rounded-xl bg-orange-50/50 border border-orange-200/80">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700">Password Panitia / Admin (Organizer):</label>
          <div className="relative">
            <input
              type={showAdminPass ? 'text' : 'password'}
              value={newAdminPass}
              onChange={(e) => setNewAdminPass(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowAdminPass(!showAdminPass)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
            >
              {showAdminPass ? 'Sembunyi' : 'Lihat'}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700">Password Juri Pos / Fasilitator:</label>
          <div className="relative">
            <input
              type={showJudgePass ? 'text' : 'password'}
              value={newJudgePass}
              onChange={(e) => setNewJudgePass(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowJudgePass(!showJudgePass)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
            >
              {showJudgePass ? 'Sembunyi' : 'Lihat'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
        >
          Simpan Password Baru
        </button>
      </form>
    </div>
  );
};

interface SettingsViewProps {
  onShowToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onShowToast }) => {
  const { 
    events, 
    selectedEventId, 
    updateEvent, 
    teams, 
    getTeamRemainingCooldown, 
    clearTeamCooldown, 
    resetToDemoData,
    isOfficialMode,
    activateOfficialMode,
    switchToDemoMode
  } = useRace();

  const [officialModalOpen, setOfficialModalOpen] = useState(false);
  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const [targetEventId, setTargetEventId] = useState<string>(currentEvent?.id || 'evt-01');
  const activeTargetEvent = events.find((e) => e.id === targetEventId) || currentEvent;

  // Local state for settings
  const [enforceMinInterval, setEnforceMinInterval] = useState<boolean>(true);
  const [minIntervalSeconds, setMinIntervalSeconds] = useState<number>(60);
  const [autoLockCheckpointsEnabled, setAutoLockCheckpointsEnabled] = useState<boolean>(true);
  const [autoLockCheckpointsMinutes, setAutoLockCheckpointsMinutes] = useState<number>(120);
  const [violationAction, setViolationAction] = useState<'block' | 'warning'>('block');
  const [showScoreToParticipants, setShowScoreToParticipants] = useState<boolean>(true);
  const [showCertificateToParticipants, setShowCertificateToParticipants] = useState<boolean>(true);
  const [showParticipantMap, setShowParticipantMap] = useState<boolean>(true);
  const [geofenceRadius, setGeofenceRadius] = useState<number>(25);
  const [indoorMode, setIndoorMode] = useState<boolean>(true);
  const [oneDeviceLock, setOneDeviceLock] = useState<boolean>(true);
  const [judgeVerification, setJudgeVerification] = useState<boolean>(true);

  // Sync from event
  useEffect(() => {
    if (activeTargetEvent) {
      setEnforceMinInterval(activeTargetEvent.enforceMinInterval !== false);
      setMinIntervalSeconds(
        activeTargetEvent.minIntervalBetweenCheckpointsSeconds ?? 
        activeTargetEvent.scoringRules?.minIntervalSeconds ?? 
        60
      );
      setAutoLockCheckpointsEnabled(activeTargetEvent.autoLockCheckpointsEnabled !== false);
      setAutoLockCheckpointsMinutes(activeTargetEvent.autoLockCheckpointsMinutes ?? 120);
      setShowScoreToParticipants(activeTargetEvent.showScoreToParticipants !== false);
      setShowCertificateToParticipants(activeTargetEvent.showCertificateToParticipants !== false);
      setShowParticipantMap(activeTargetEvent.showParticipantMap !== false);
    }
  }, [activeTargetEvent]);

  // Live timer tick for real-time cooldown monitor
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    if (!activeTargetEvent) return;
    updateEvent(activeTargetEvent.id, {
      minIntervalBetweenCheckpointsSeconds: minIntervalSeconds,
      enforceMinInterval: enforceMinInterval,
      autoLockCheckpointsEnabled,
      autoLockCheckpointsMinutes,
      showScoreToParticipants,
      showCertificateToParticipants,
      showParticipantMap,
      scoringRules: {
        ...(activeTargetEvent.scoringRules || {
          penaltyPerLateMin: 10,
          maxLateMinutes: 30,
          mandatoryBonus: 100,
          judgeMaxScore: 150,
        }),
        minIntervalSeconds: minIntervalSeconds,
      }
    });
    onShowToast(`Pengaturan auto-lock pos (${autoLockCheckpointsMinutes}m), jeda (${minIntervalSeconds}s) & visibilitas untuk "${activeTargetEvent.title}" berhasil disimpan.`);
  };

  const handleReset = () => {
    resetToDemoData();
    onShowToast('Data berhasil di-reset kembali ke nilai awal demo.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0b192c]">Pengaturan Event & Anti-Cheat</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">
              ANTI-SPEEDRUN & SECURITY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi waktu jeda minimum antar-pos, pencegahan kecurangan loncat pos (speedrun), toleransi GPS, dan aturan integritas.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer shrink-0 transition-transform active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Perubahan</span>
        </button>
      </div>

      {/* Event Selector Dropdown */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pilih Event yang Dikelola:
            </label>
            <div className="font-extrabold text-slate-900 text-sm">
              {activeTargetEvent?.title}
            </div>
          </div>
        </div>

        <select
          value={targetEventId}
          onChange={(e) => setTargetEventId(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
        >
          {events.map((evt) => (
            <option key={evt.id} value={evt.id}>
              {evt.title} ({evt.location})
            </option>
          ))}
        </select>
      </div>

      {/* MAIN FEATURE: Pelacakan & Pengaturan Waktu Jeda Minimum Antar-Pos */}
      <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-md p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">
                  Pelacakan Waktu Jeda Minimum Antar-Pos (Anti-Speedrun)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-orange-100 text-orange-800 uppercase">
                  FITUR PENCEGAHAN KECURANGAN
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mencegah peserta memindai beberapa pos berturut-turut tanpa benar-benar menempuh jarak fisik antar pos.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors shrink-0">
            <input
              type="checkbox"
              checked={enforceMinInterval}
              onChange={(e) => setEnforceMinInterval(e.target.checked)}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800">
              {enforceMinInterval ? 'Status: AKTIF' : 'Status: NONAKTIF'}
            </span>
          </label>
        </div>

        {enforceMinInterval ? (
          <div className="space-y-5">
            {/* Interval Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 space-y-3">
                <label className="font-bold text-slate-900 text-xs block">
                  Durasi Jeda Minimum per Pos (Detik / Menit):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={1800}
                    step={10}
                    value={minIntervalSeconds}
                    onChange={(e) => setMinIntervalSeconds(Math.max(0, Number(e.target.value)))}
                    className="w-28 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <div className="text-xs text-slate-700">
                    <span className="font-bold text-orange-700 text-sm">{minIntervalSeconds} Detik</span>
                    <span className="text-slate-500 ml-1.5 font-medium">
                      ({Math.floor(minIntervalSeconds / 60)} Menit {minIntervalSeconds % 60} Detik)
                    </span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: '30 Detik (Simulasi Cepat)', val: 30 },
                    { label: '60 Detik (1 Menit)', val: 60 },
                    { label: '90 Detik (1.5 Menit)', val: 90 },
                    { label: '120 Detik (2 Menit)', val: 120 },
                    { label: '180 Detik (3 Menit)', val: 180 },
                    { label: '300 Detik (5 Menit)', val: 300 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setMinIntervalSeconds(preset.val)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        minIntervalSeconds === preset.val
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-orange-100 hover:text-orange-900'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enforcement Action Mode */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="font-bold text-slate-900 text-xs block">
                  Tindakan Sistem Saat Jeda Belum Terpenuhi:
                </label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    violationAction === 'block' 
                      ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-400/20' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="violationAction"
                      checked={violationAction === 'block'}
                      onChange={() => setViolationAction('block')}
                      className="mt-0.5 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Kunci Pemindai & Tampilkan Hitung Mundur (Direkomendasikan)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tombol check-in dan kamera QR dinonaktifkan sementara disertai hitung mundur live detik tersisa.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    violationAction === 'warning' 
                      ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-400/20' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="violationAction"
                      checked={violationAction === 'warning'}
                      onChange={() => setViolationAction('warning')}
                      className="mt-0.5 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Izinkan Check-in dengan Catatan Peringatan Juri
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Check-in tetap dicatat namun ditandai sebagai "Speedrun Warning" di log juri untuk investigasi.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* LIVE COOLDOWN MONITOR PER TIM */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-orange-400" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                    Live Cooldown Monitor (Status Jeda Real-Time Tim):
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Sinkronisasi Aktif
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {teams.map((t) => {
                  const cd = getTeamRemainingCooldown(t.id);
                  const inCooldown = cd.inCooldown;

                  return (
                    <div 
                      key={t.id}
                      className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                        inCooldown
                          ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                          : 'bg-slate-800/80 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-orange-400">[{t.bibNumber}]</span>
                            <span className="truncate max-w-[130px]">{t.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                            Pos Terakhir: {t.lastPosName}
                          </div>
                        </div>

                        {inCooldown ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px] flex items-center gap-1 animate-pulse shrink-0">
                            <Clock className="w-3 h-3" />
                            {cd.remainingSeconds}s
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0">
                            Siap Scan Pos
                          </span>
                        )}
                      </div>

                      {/* Reset Button if In Cooldown */}
                      {inCooldown && (
                        <div className="mt-2 pt-2 border-t border-amber-500/30 flex items-center justify-between">
                          <span className="text-[10px] text-amber-300">Cooldown aktif</span>
                          <button
                            type="button"
                            onClick={() => {
                              clearTeamCooldown(t.id);
                              onShowToast(`Jeda pos untuk Tim ${t.name} berhasil di-reset.`);
                            }}
                            className="text-[10px] text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer"
                          >
                            Bypass / Reset Jeda
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
            Pembatasan waktu jeda antar-pos dinonaktifkan. Seluruh peserta dapat menyelesaikan dan memindai pos berturut-turut tanpa batas interval waktu.
          </div>
        )}
      </div>

      {/* Auto-Lock Checkpoint Settings Card */}
      <div className="bg-white rounded-2xl border-2 border-red-200 shadow-md p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0 font-bold">
              🔒
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">
                  Pengaturan Auto-Lock Checkpoint (Penutupan Otomatis Pos)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800 uppercase">
                  MANAJEMEN WAKTU POS
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mengunci pos secara otomatis setelah durasi waktu tertentu dari awal lomba agar tim yang terlambat tidak dapat lagi memindai pos.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors shrink-0">
            <input
              type="checkbox"
              checked={autoLockCheckpointsEnabled}
              onChange={(e) => setAutoLockCheckpointsEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800">
              {autoLockCheckpointsEnabled ? 'Status: AKTIF' : 'Status: NONAKTIF'}
            </span>
          </label>
        </div>

        {autoLockCheckpointsEnabled ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 space-y-3">
              <label className="font-bold text-slate-900 text-xs block">
                Batas Waktu Penutupan Otomatis Pos (Menit dari Waktu Lomba):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={10}
                  max={600}
                  step={10}
                  value={autoLockCheckpointsMinutes}
                  onChange={(e) => setAutoLockCheckpointsMinutes(Math.max(0, Number(e.target.value)))}
                  className="w-28 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="text-xs text-slate-700">
                  <span className="font-bold text-red-700 text-sm">{autoLockCheckpointsMinutes} Menit</span>
                  <span className="text-slate-500 ml-1.5 font-medium">
                    ({Math.floor(autoLockCheckpointsMinutes / 60)} Jam {autoLockCheckpointsMinutes % 60} Menit dari Awal)
                  </span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: '30 Menit', val: 30 },
                  { label: '60 Menit (1 Jam)', val: 60 },
                  { label: '90 Menit (1.5 Jam)', val: 90 },
                  { label: '120 Menit (2 Jam)', val: 120 },
                  { label: '180 Menit (3 Jam)', val: 180 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setAutoLockCheckpointsMinutes(preset.val)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      autoLockCheckpointsMinutes === preset.val
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-red-100 hover:text-red-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-red-100">
                Sistem akan memblokir check-in/scan barcode di pos jika waktu lomba berjalan (elapsed time) telah melewati {autoLockCheckpointsMinutes} menit.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
            Fitur Auto-Lock Checkpoint dinonaktifkan. Pos akan tetap terbuka bagi seluruh peserta selama perlombaan berlangsung.
          </div>
        )}
      </div>

      {/* Opsi Visibilitas Skor & Piagam di Tampilan Peserta */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Opsi Visibilitas Skor & Piagam Peserta
              </h3>
              <p className="text-xs text-slate-500">
                Atur apakah peserta dapat melihat perolehan skor dan menu piagam digital di HP mereka atau dirahasiakan panitia.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 shrink-0">
            KONTROL PRIVASI
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Toggle Skor */}
          <div className={`p-4 rounded-xl border transition-all ${
            showScoreToParticipants 
              ? 'bg-emerald-50/70 border-emerald-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 text-sm block">
                  Tampilkan Skor ke Peserta
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {showScoreToParticipants
                    ? 'Peserta dapat melihat perolehan poin tim, tab skor, dan rincian nilai.'
                    : 'Skor disembunyikan. HP peserta menampilkan status "Dirahasiakan Panitia" untuk menjaga ketegangan hingga pengumuman akhir.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={showScoreToParticipants}
                onChange={(e) => setShowScoreToParticipants(e.target.checked)}
                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0 mt-0.5"
              />
            </label>
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-2 text-[10px] font-bold">
              <span className={showScoreToParticipants ? 'text-emerald-700' : 'text-slate-500'}>
                {showScoreToParticipants ? '● Status: Skor Terbuka' : '○ Status: Skor Dirahasiakan (Blind Scoring)'}
              </span>
            </div>
          </div>

          {/* Toggle Piagam */}
          <div className={`p-4 rounded-xl border transition-all ${
            showCertificateToParticipants 
              ? 'bg-amber-50/70 border-amber-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 text-sm block">
                  Tampilkan Menu E-Piagam / Sertifikat
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {showCertificateToParticipants
                    ? 'Peserta dapat mengakses menu E-Piagam dan mengunduh sertifikat finisher digital.'
                    : 'Menu E-Piagam disembunyikan. Piagam hanya diterbitkan setelah lomba resmi selesai dan disahkan panitia.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={showCertificateToParticipants}
                onChange={(e) => setShowCertificateToParticipants(e.target.checked)}
                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0 mt-0.5"
              />
            </label>
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-2 text-[10px] font-bold">
              <span className={showCertificateToParticipants ? 'text-amber-700' : 'text-slate-500'}>
                {showCertificateToParticipants ? '● Status: Piagam Bisa Diakses' : '○ Status: Piagam Disembunyikan'}
              </span>
            </div>
          </div>

          {/* Toggle Peta Digital vs Peta Cetak */}
          <div className={`p-4 rounded-xl border transition-all ${
            showParticipantMap 
              ? 'bg-blue-50/70 border-blue-200' 
              : 'bg-amber-50/70 border-amber-200'
          }`}>
            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 text-sm block">
                  Tampilkan Peta Digital di HP
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {showParticipantMap
                    ? 'Peta digital interaktif GPS aktif pada HP peserta.'
                    : 'Mode Peta Cetak Fisik: Peta GPS disembunyikan agar peserta bernavigasi menggunakan Peta Cetak Kertas & Kompas.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={showParticipantMap}
                onChange={(e) => setShowParticipantMap(e.target.checked)}
                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0 mt-0.5"
              />
            </label>
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-2 text-[10px] font-bold">
              <span className={showParticipantMap ? 'text-blue-700' : 'text-amber-800'}>
                {showParticipantMap ? '● Status: Peta Digital Aktif' : '📄 Status: Mode Peta Cetak Fisik'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GPS & Location Settings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Validasi Lokasi & GPS Lapangan</h3>
              <p className="text-xs text-slate-500">Mencegah peserta scan QR dari jarak jauh</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Radius Toleransi Geofence GPS (Meter)
              </label>
              <input 
                type="number" 
                value={geofenceRadius}
                onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Peserta harus berada dalam radius {geofenceRadius} meter dari pos untuk dapat melakukan scan QR.
              </p>
            </div>

            <div className="pt-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Mode Permainan Indoor (Tanpa GPS)
              </label>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input 
                  type="checkbox" 
                  id="indoor_mode" 
                  checked={indoorMode}
                  onChange={(e) => setIndoorMode(e.target.checked)}
                  className="rounded text-orange-600 w-4 h-4 cursor-pointer" 
                />
                <label htmlFor="indoor_mode" className="text-slate-700 text-xs font-medium cursor-pointer">
                  Izinkan scan QR murni tanpa mewajibkan GPS aktif (ideal untuk mall & gedung bertingkat)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Anti-cheat & Security */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Anti-Cheat & Keamanan Lomba</h3>
              <p className="text-xs text-slate-500">Integritas jalannya perlombaan</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input 
                type="checkbox" 
                id="one_device" 
                checked={oneDeviceLock}
                onChange={(e) => setOneDeviceLock(e.target.checked)}
                className="rounded text-orange-600 w-4 h-4 cursor-pointer" 
              />
              <label htmlFor="one_device" className="text-slate-700 text-xs font-medium cursor-pointer">
                Kunci 1 Perangkat per Tim (1 login aktif per nomor BIB)
              </label>
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input 
                type="checkbox" 
                id="dynamic_token" 
                checked={judgeVerification}
                onChange={(e) => setJudgeVerification(e.target.checked)}
                className="rounded text-orange-600 w-4 h-4 cursor-pointer" 
              />
              <label htmlFor="dynamic_token" className="text-slate-700 text-xs font-medium cursor-pointer">
                Verifikasi Juri Pos Wajib untuk Pos Tertentu
              </label>
            </div>

            {/* Password & RBAC Management Sub-section */}
            <PasswordManagementSection onShowToast={onShowToast} />

            {/* Mode Sistem: Produksi vs Demo */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <label className="font-bold text-slate-800 block text-xs flex items-center justify-between">
                <span>Mode Sistem (Operasional vs Uji Coba):</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isOfficialMode ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}>
                  {isOfficialMode ? '🛡️ Mode Resmi Aktif' : '🧪 Mode Demo Aktif'}
                </span>
              </label>

              {isOfficialMode ? (
                <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-2.5">
                  <p className="leading-relaxed">
                    Sistem saat ini berada dalam <strong>Mode Resmi</strong>. Data tim dummy telah dibersihkan dan sistem siap untuk hari-H perlombaan.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Beralih kembali ke Mode Demo? Data preset simulasi akan dipulihkan untuk pengujian.')) {
                        switchToDemoMode();
                        onShowToast('Mode Demo & Simulasi diaktifkan.');
                      }
                    }}
                    className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                  >
                    Beralih ke Mode Demo & Simulasi
                  </button>
                </div>
              ) : (
                <div className="p-3.5 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 rounded-xl border border-emerald-500/40 text-xs text-white space-y-2.5">
                  <p className="leading-relaxed text-slate-200">
                    Sistem saat ini dalam <strong>Mode Demo / Simulasi</strong> dengan data preset contoh. Siap untuk hari-H?
                  </p>
                  <button
                    type="button"
                    onClick={() => setOfficialModalOpen(true)}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Aktifkan Mode Resmi (Siap Hari-H)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Reset Data Button */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="font-bold text-slate-800 block text-xs">
                Manajemen Data Demo:
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-300 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Seluruh Data ke Default Awal</span>
              </button>
              <p className="text-[11px] text-slate-400">
                Gunakan tombol ini jika Anda ingin mengembalikan daftar tim, pos, dan waktu ke kondisi awal demo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Official Mode Modal Dialog */}
      <OfficialModeModal
        isOpen={officialModalOpen}
        onClose={() => setOfficialModalOpen(false)}
        currentEventTitle={currentEvent?.title}
        currentLocation={currentEvent?.location}
        onConfirm={(options) => {
          activateOfficialMode(options);
          onShowToast(`Mode Resmi Diaktifkan: Event "${options.title}" siap dijalankan.`);
        }}
      />
    </div>
  );
};
