import React, { useState, useRef, useEffect } from 'react';
import { compressImageFile } from '../../utils/imageCompressor';
import { 
  Smartphone, 
  MapPin, 
  QrCode, 
  Camera, 
  Trophy, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  Send, 
  HelpCircle, 
  Sparkles, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Check, 
  Key, 
  LogOut, 
  Compass, 
  Layers, 
  Video,
  Megaphone,
  Award,
  Printer,
  BookOpen,
  X,
  Sliders,
  FileText,
  Wifi,
  WifiOff,
  Database,
  UploadCloud
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { Checkpoint, Team } from '../../types';
import { InteractiveCompassMap } from './InteractiveCompassMap';
import { FinisherCertificateModal } from '../common/FinisherCertificateModal';
import { ParticipantQrScannerModal } from './ParticipantQrScannerModal';
import { 
  queueOfflineScan, 
  getPendingOfflineScans, 
  getAllOfflineScans,
  updateOfflineScanStatus,
  markScanAsSynced, 
  clearOfflineScanQueue,
  OfflineScanQueueItem 
} from '../../utils/participantOfflineManager';

interface ParticipantViewProps {
  onShowToast: (msg: string) => void;
  onOpenLeaderboard: () => void;
}

export const ParticipantView: React.FC<ParticipantViewProps> = ({
  onShowToast,
  onOpenLeaderboard,
}) => {
  const { 
    teams, 
    events,
    selectedEventId,
    updateEvent,
    checkpoints, 
    activeTeamId, 
    setActiveTeamId, 
    loginParticipant, 
    logoutParticipant, 
    updateTeamCoordinates,
    checkInCheckpoint, 
    checkInByQrCode,
    getTeamRemainingCooldown,
    clearTeamCooldown,
    submitChallengeProof,
    raceStatus,
    raceElapsedSeconds,
    broadcasts,
    triggerSos
  } = useRace();

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const showScore = currentEvent?.showScoreToParticipants !== false;
  const showCertificate = currentEvent?.showCertificateToParticipants !== false;
  const showMap = currentEvent?.showParticipantMap !== false;

  // Active tab: 'clues' | 'map' | 'history' | 'score'
  const [activeTab, setActiveTab] = useState<'clues' | 'map' | 'history' | 'score'>('clues');
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);

  // Login form state
  const [bibInput, setBibInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Real-Time GPS Telemetry Tracker for Field Participants (Directive D)
  const [gpsTrackingEnabled, setGpsTrackingEnabled] = useState<boolean>(true);
  const [gpsStatus, setGpsStatus] = useState<'locked' | 'searching' | 'denied' | 'off'>('searching');
  const [currentGpsCoords, setCurrentGpsCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [lastGpsSentAt, setLastGpsSentAt] = useState<number>(0);
  const [gpsExplanationModalOpen, setGpsExplanationModalOpen] = useState<boolean>(false);

  // Active team from context
  const currentTeam: Team | undefined = teams.find((t) => t.id === activeTeamId);

  // Anti-Speedrun Cooldown Tracking state
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [minIntervalDuration, setMinIntervalDuration] = useState<number>(60);
  const [demoBypassCooldown, setDemoBypassCooldown] = useState<boolean>(false);

  // Offline & IndexedDB Cache State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [pendingOfflineScans, setPendingOfflineScans] = useState<OfflineScanQueueItem[]>([]);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);

  // Integrated QR Scanner & Manual Barcode Modal / Drawer
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [qrInputText, setQrInputText] = useState('');
  const [useRealCamera, setUseRealCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Integrated Photo Mission Modal State
  const [missionModalCp, setMissionModalCp] = useState<Checkpoint | null>(null);
  const [challengeDescription, setChallengeDescription] = useState('Foto formasi regu lengkap dan tanda pos');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=600&q=80');
  const [challengeSentSuccess, setChallengeSentSuccess] = useState(false);

  // Modal states
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosSending, setSosSending] = useState(false);

  const handleTriggerSos = () => {
    if (!currentTeam) return;
    setSosSending(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          triggerSos(currentTeam.id, { lat: pos.coords.latitude, lng: pos.coords.longitude });
          setSosSending(false);
          setSosModalOpen(false);
          onShowToast('🚨 Sinyal DARURAT (SOS) dan koordinat GPS Anda berhasil dikirim ke Panitia!');
        },
        (err) => {
          const fallbackCoords = checkpoints[0]?.coordinates || { lat: -6.2088, lng: 106.8456 };
          triggerSos(currentTeam.id, fallbackCoords);
          setSosSending(false);
          setSosModalOpen(false);
          onShowToast('🚨 Sinyal DARURAT (SOS) dikirim (menggunakan koordinat referensi pos)!');
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      const fallbackCoords = checkpoints[0]?.coordinates || { lat: -6.2088, lng: 106.8456 };
      triggerSos(currentTeam.id, fallbackCoords);
      setSosSending(false);
      setSosModalOpen(false);
      onShowToast('🚨 Sinyal DARURAT (SOS) berhasil dikirim ke Panitia!');
    }
  };

  // GPS Telemetry Engine (Directive D: Real device location streaming with throttling)
  useEffect(() => {
    if (!currentTeam || !gpsTrackingEnabled) {
      setGpsStatus('off');
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }

    setGpsStatus('searching');

    const handlePos = (pos: GeolocationPosition) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed !== null && pos.coords.speed !== undefined ? pos.coords.speed : undefined,
        heading: pos.coords.heading !== null && pos.coords.heading !== undefined ? pos.coords.heading : undefined,
      };
      setCurrentGpsCoords(coords);
      setGpsStatus('locked');

      // Battery & network conscious throttle: transmit location update every 15s
      const now = Date.now();
      if (now - lastGpsSentAt > 15000) {
        setLastGpsSentAt(now);
        updateTeamCoordinates(currentTeam.id, coords);
      }
    };

    const handleErr = (err: GeolocationPositionError) => {
      if (err.code === 1) {
        setGpsStatus('denied');
      } else {
        setGpsStatus('searching');
      }
    };

    const watchId = navigator.geolocation.watchPosition(handlePos, handleErr, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 10000,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [currentTeam?.id, gpsTrackingEnabled, lastGpsSentAt, updateTeamCoordinates]);

  // Live timer for anti-speedrun countdown
  useEffect(() => {
    if (!currentTeam) {
      setCooldownRemaining(0);
      return;
    }

    const checkCooldown = () => {
      const cd = getTeamRemainingCooldown(currentTeam.id);
      setCooldownRemaining(cd.remainingSeconds);
      setMinIntervalDuration(cd.minIntervalSeconds || 60);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [currentTeam, getTeamRemainingCooldown]);

  const refreshPendingQueue = async () => {
    if (!currentTeam) return;
    const items = await getPendingOfflineScans(currentTeam.id);
    setPendingOfflineScans(items);
  };

  const triggerAutoSync = async () => {
    if (!currentTeam) return;
    const items = await getPendingOfflineScans(currentTeam.id);
    if (items.length === 0) return;

    setIsSyncingOffline(true);
    let count = 0;
    for (const item of items) {
      const res = await checkInByQrCode(item.teamId, item.qrCodeInput, item.bypassCooldown);
      if (res.success || res.message.includes('sudah') || res.message.includes('tercatat') || res.message.includes('selesai')) {
        await markScanAsSynced(item.id);
        count++;
      }
    }
    setIsSyncingOffline(false);
    await refreshPendingQueue();
    if (count > 0) {
      onShowToast(`✅ Berhasil menyinkronkan ${count} antrean scan QR offline ke server!`);
    }
  };

  // Network Online/Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onShowToast('📶 Koneksi internet pulih! Menghubungkan ke server...');
      triggerAutoSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      onShowToast('⚠️ Sinyal internet terputus. Mode Offline (IndexedDB Cache) diaktifkan!');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentTeam]);

  useEffect(() => {
    refreshPendingQueue();
  }, [currentTeam]);

  // Adjust active tab if score and certificate are both hidden
  useEffect(() => {
    if (!showScore && !showCertificate && activeTab === 'score') {
      setActiveTab('clues');
    }
  }, [showScore, showCertificate, activeTab]);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await loginParticipant(bibInput, pinInput);
    if (res.success) {
      onShowToast(`Selamat datang, Tim ${res.team?.name}! Sesi tim berhasil diverifikasi server.`);
      setBibInput('');
      setPinInput('');
    } else {
      setLoginError(res.message || 'Login gagal.');
    }
  };

  const isCpAutoLocked = (cp: Checkpoint) => {
    if (raceStatus !== 'running') return false;
    const isAutoLockEnabled = currentEvent?.autoLockCheckpointsEnabled !== false;
    const lockMins = cp.autoLockMinutes && cp.autoLockMinutes > 0 
      ? cp.autoLockMinutes 
      : (currentEvent?.autoLockCheckpointsMinutes || 0);

    if (!isAutoLockEnabled || lockMins <= 0) return false;
    const elapsedMins = Math.floor(raceElapsedSeconds / 60);
    return elapsedMins >= lockMins;
  };

  const handleSimulateCheckIn = async (cp: Checkpoint) => {
    if (!currentTeam) return;

    if (isCpAutoLocked(cp)) {
      const lockMins = cp.autoLockMinutes || currentEvent?.autoLockCheckpointsMinutes || 120;
      onShowToast(`🔒 Pos "${cp.name}" telah tertutup otomatis (Auto-Locked) setelah ${lockMins} menit perlombaan!`);
      return;
    }

    const effectivelyOffline = !isOnline || simulatedOffline;

    const gpsCoords = await new Promise<{ lat: number; lng: number; accuracy?: number } | undefined>((resolve) => {
      if (!navigator.geolocation) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => resolve(undefined),
        { timeout: 2500, enableHighAccuracy: true, maximumAge: 15000 }
      );
    });

    if (effectivelyOffline) {
      // Offline mode: Queue scan to IndexedDB first
      await queueOfflineScan({
        teamId: currentTeam.id,
        checkpointId: cp.id,
        qrCodeInput: cp.qrCodeValue,
        checkpointName: cp.name,
        pointsAwarded: cp.points,
        bypassCooldown: demoBypassCooldown
      });

      // Update local state in RaceContext
      const res = await checkInCheckpoint(currentTeam.id, cp.id, demoBypassCooldown, gpsCoords);
      await refreshPendingQueue();

      if (res.isLocked) {
        onShowToast(res.message || `🔒 Pos ${cp.name} telah tertutup otomatis.`);
      } else if (res.success) {
        onShowToast(`📲 [MODE OFFLINE CACHE] Check-in ${cp.name} tersimpan di IndexedDB! Antrean dikirim saat sinyal pulih.`);
      } else if (res.isCooldown) {
        onShowToast(`⚠️ Anti-Speedrun: Jeda ${res.remainingSeconds}s lagi sebelum scan ${cp.name}.`);
      } else {
        onShowToast(`📲 [MODE OFFLINE CACHE] Scan ${cp.name} tersimpan di memori HP!`);
      }
      return;
    }

    const res = await checkInCheckpoint(currentTeam.id, cp.id, demoBypassCooldown, gpsCoords);
    if (res.isLocked) {
      onShowToast(res.message || `🔒 Pos ${cp.name} telah tertutup otomatis.`);
    } else if (res.success) {
      onShowToast(
        showScore 
          ? `Berhasil check-in di ${res.checkpointName}! +${res.pointsAwarded} Poin tersinkronisasi server.`
          : `Berhasil check-in di ${res.checkpointName}! Pos resmi dicatat tuntas.`
      );
    } else if (res.isCooldown) {
      onShowToast(`⚠️ Anti-Speedrun: Jeda ${res.remainingSeconds}s lagi sebelum scan ${res.checkpointName}.`);
    } else {
      onShowToast(res.message || 'Check-in gagal.');
    }
  };

  const handleManualQrCheckIn = async () => {
    if (!currentTeam) return;
    if (!qrInputText.trim()) {
      onShowToast('Harap masukkan kode barcode terlebih dahulu.');
      return;
    }

    const effectivelyOffline = !isOnline || simulatedOffline;

    const matchedCp = checkpoints.find((c) => {
      const targetVal = c.qrCodeValue.toUpperCase();
      const cleanInput = qrInputText.trim().toUpperCase();
      return (
        targetVal === cleanInput || 
        targetVal.replace(/-/g, '') === cleanInput.replace(/-/g, '') ||
        targetVal.endsWith(cleanInput)
      );
    });

    if (!matchedCp) {
      onShowToast(`Kode barcode "${qrInputText}" tidak valid atau tidak cocok dengan rute pos.`);
      return;
    }

    const gpsCoords = await new Promise<{ lat: number; lng: number; accuracy?: number } | undefined>((resolve) => {
      if (!navigator.geolocation) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => resolve(undefined),
        { timeout: 2500, enableHighAccuracy: true, maximumAge: 15000 }
      );
    });

    if (effectivelyOffline) {
      await queueOfflineScan({
        teamId: currentTeam.id,
        checkpointId: matchedCp.id,
        qrCodeInput: qrInputText,
        checkpointName: matchedCp.name,
        pointsAwarded: matchedCp.points,
        bypassCooldown: demoBypassCooldown
      });

      const res = await checkInCheckpoint(currentTeam.id, matchedCp.id, demoBypassCooldown, gpsCoords);
      await refreshPendingQueue();
      setQrInputText('');
      setScannerModalOpen(false);

      if (res.success) {
        onShowToast(`📲 [MODE OFFLINE CACHE] Barcode ${matchedCp.name} tersimpan di IndexedDB! Disinkronkan saat online.`);
      } else {
        onShowToast(res.message || `Barcode ${matchedCp.name} tersimpan di antrean offline.`);
      }
      return;
    }

    const res = await checkInByQrCode(currentTeam.id, qrInputText, demoBypassCooldown, gpsCoords);
    onShowToast(res.message);
    if (res.success) {
      setQrInputText('');
      setScannerModalOpen(false);
    }
  };

  const toggleCamera = async () => {
    if (useRealCamera) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setUseRealCamera(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        streamRef.current = stream;
        setUseRealCamera(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        onShowToast('Kamera perangkat tidak tersedia. Menggunakan mode bidik simulasi.');
        setUseRealCamera(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleSendChallenge = () => {
    if (!currentTeam) return;
    const targetCp = missionModalCp || checkpoints[currentTeam.checkpointsCompleted] || checkpoints[0];
    submitChallengeProof(currentTeam.id, targetCp.id, 'photo', challengeDescription, photoPreviewUrl);
    setChallengeSentSuccess(true);
    onShowToast(`Tugas foto untuk ${targetCp.name} berhasil dikirim ke antrean juri!`);
    setTimeout(() => {
      setChallengeSentSuccess(false);
      setMissionModalCp(null);
    }, 2000);
  };

  return (
    <div className="py-4 px-2 sm:px-4 max-w-4xl mx-auto space-y-4">
      {/* Main Container - Phone Mockup or Responsive Full-Width */}
      <div className="flex justify-center">
        <div 
          className={`w-full transition-all duration-300 ${
            isPhoneFrame 
              ? 'max-w-md rounded-[2.5rem] p-3 bg-slate-900 border-8 border-slate-800 shadow-2xl overflow-hidden' 
              : 'max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden p-4'
          }`}
        >
          {/* Phone Top Notch / Speaker (Visible in Phone Frame mode) */}
          {isPhoneFrame && (
            <div className="bg-slate-900 py-1.5 px-6 flex justify-between items-center text-slate-400 text-[11px] font-mono select-none">
              <span>09:41</span>
              <div className="w-20 h-4 bg-slate-950 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-800"></div>
              </div>
              <div className="flex items-center gap-1">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* INNER CONTENT: If NO team logged in -> Show Login Screen */}
          {!currentTeam ? (
            <div className="bg-slate-950 text-white rounded-3xl p-6 min-h-[540px] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="text-center pt-4">
                  <div className="w-14 h-14 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl mx-auto flex items-center justify-center text-slate-950 font-extrabold text-2xl shadow-lg shadow-orange-500/20">
                    RP
                  </div>
                  <h3 className="text-xl font-extrabold mt-3 tracking-tight">RACEPOINT MOBILE</h3>
                  <p className="text-xs text-slate-400 mt-1">Portal Navigasi & Pos Peserta Perlombaan</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Nomor BIB / ID Tim:</label>
                    <input
                      type="text"
                      placeholder="Contoh: 101 atau team-01"
                      value={bibInput}
                      onChange={(e) => setBibInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Kode PIN Regu:</label>
                    <input
                      type="password"
                      placeholder="PIN 4-digit (default: 1234)"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {loginError && (
                    <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold text-xs tracking-wider uppercase transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    Masuk Arena Pertandingan
                  </button>
                </form>
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-3">
                Sistem Terenkripsi • Terhubung ke Server Juri Pos
              </div>
            </div>
          ) : (
            /* IF LOGGED IN: Render Participant Active Game Console */
            <div className="bg-slate-950 rounded-3xl overflow-hidden flex flex-col min-h-[580px]">
              {/* Header: Team Info & Race Status */}
              <div className="p-4 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500 text-slate-950 font-extrabold flex items-center justify-center text-sm shadow-md">
                      {currentTeam.bibNumber}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-white flex items-center gap-2">
                        <span>{currentTeam.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          {currentTeam.status === 'racing' ? 'BERTANDING' : currentTeam.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {currentTeam.category} • {currentTeam.members.length} Anggota
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSosModalOpen(true)}
                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-black flex items-center gap-1 shadow-md animate-pulse cursor-pointer"
                      title="Tombol Darurat SOS"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>SOS</span>
                    </button>
                    <button
                      onClick={() => setRulesModalOpen(true)}
                      className="p-2 text-slate-400 hover:text-orange-400 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Aturan & Petunjuk Lomba"
                    >
                      <BookOpen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => logoutParticipant()}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Keluar Akun"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status Lomba Banner */}
                {raceStatus === 'paused' && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Perlombaan dijeda sementara oleh Panitia. Harap tetap di pos.</span>
                  </div>
                )}
                {raceStatus === 'ended' && (
                  <div className="mt-2 p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Garis finish telah ditutup. Perlombaan resmi berakhir!</span>
                  </div>
                )}

                {/* Quick Status Bar */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-center">
                  <div className="bg-slate-800/60 p-2 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-medium">Waktu Lomba</div>
                    <div className="text-xs font-mono font-bold text-orange-400 flex items-center justify-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {formatTimer(raceElapsedSeconds)}
                    </div>
                  </div>

                  <div className="bg-slate-800/60 p-2 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-medium">Total Skor</div>
                    {showScore ? (
                      <div className="text-xs font-mono font-extrabold text-emerald-400 mt-0.5">
                        {currentTeam.totalScore} Pts
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-slate-400 mt-0.5 flex items-center justify-center gap-1" title="Skor dirahasiakan panitia">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span className="text-[11px] text-amber-300">Rahasia</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-800/60 p-2 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-medium">Pos Tuntas</div>
                    <div className="text-xs font-mono font-bold text-white mt-0.5">
                      {currentTeam.checkpointsCompleted}/{currentTeam.totalCheckpoints}
                    </div>
                  </div>
                </div>
              </div>

              {/* Anti-Speedrun Cooldown Bar (Real-time Live Ticker) */}
              <div className={`px-4 py-2 border-b text-xs flex items-center justify-between transition-all ${
                cooldownRemaining > 0 && !demoBypassCooldown
                  ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border-amber-500/40 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    cooldownRemaining > 0 && !demoBypassCooldown
                      ? 'bg-amber-500 text-slate-950 font-bold animate-pulse shadow-sm'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-[11px] truncate">
                        {cooldownRemaining > 0 && !demoBypassCooldown
                          ? 'Jeda Minimum Pos'
                          : 'Jeda Pos Terpenuhi'}
                      </span>
                      {cooldownRemaining > 0 && !demoBypassCooldown && (
                        <span className="font-mono bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold animate-pulse">
                          {Math.floor(cooldownRemaining / 60)}:{String(cooldownRemaining % 60).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {cooldownRemaining > 0 && !demoBypassCooldown
                        ? `Tunggu ${cooldownRemaining}s sebelum scan pos berikutnya.`
                        : 'Siap scan QR / selesaikan pos berikutnya!'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDemoBypassCooldown(!demoBypassCooldown);
                      onShowToast(!demoBypassCooldown ? 'Mode bypass jeda aktif.' : 'Mode validasi jeda anti-speedrun aktif.');
                    }}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                      demoBypassCooldown
                        ? 'bg-orange-500 text-white border-orange-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {demoBypassCooldown ? 'Bypass: ON' : 'Bypass Demo'}
                  </button>
                </div>
              </div>

              {/* Offline Network Status & IndexedDB Storage Indicator */}
              <div className={`px-4 py-2 border-b text-xs flex items-center justify-between transition-all ${
                (!isOnline || simulatedOffline)
                  ? 'bg-gradient-to-r from-red-950 via-red-900 to-slate-900 border-red-500/40 text-red-200'
                  : pendingOfflineScans.length > 0
                  ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-amber-500/40 text-amber-200'
                  : 'bg-slate-900/90 border-slate-800 text-emerald-400'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    (!isOnline || simulatedOffline)
                      ? 'bg-red-500 text-white animate-pulse'
                      : pendingOfflineScans.length > 0
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {(!isOnline || simulatedOffline) ? (
                      <WifiOff className="w-3.5 h-3.5" />
                    ) : pendingOfflineScans.length > 0 ? (
                      <Database className="w-3.5 h-3.5 text-slate-950" />
                    ) : (
                      <Wifi className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-[11px] truncate">
                        {(!isOnline || simulatedOffline)
                          ? 'Mode Offline (Cache IndexedDB)'
                          : pendingOfflineScans.length > 0
                          ? `${pendingOfflineScans.length} Antrean Scan Offline`
                          : 'Sinyal Terkoneksi (Online)'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">
                      {(!isOnline || simulatedOffline)
                        ? 'Scan QR tersimpan aman di HP meski tanpa sinyal.'
                        : pendingOfflineScans.length > 0
                        ? 'Ada hasil scan offline belum disinkronkan ke server.'
                        : 'Hasil scan QR langsung tersambung ke server juri.'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {pendingOfflineScans.length > 0 && (
                    <button
                      type="button"
                      onClick={triggerAutoSync}
                      disabled={isSyncingOffline}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <UploadCloud className={`w-3 h-3 ${isSyncingOffline ? 'animate-spin' : ''}`} />
                      <span>{isSyncingOffline ? 'Syncing...' : `Sync (${pendingOfflineScans.length})`}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowOfflineModal(true)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[10px] cursor-pointer"
                    title="Detail Antrean Cache Offline"
                  >
                    <Database className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Real-Time GPS Tracking Telemetry Status Bar (Directive D) */}
              <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    gpsStatus === 'locked' ? 'bg-emerald-400 animate-ping' :
                    gpsStatus === 'searching' ? 'bg-amber-400 animate-pulse' :
                    gpsStatus === 'denied' ? 'bg-red-400' : 'bg-slate-500'
                  }`} />
                  <div className="text-[11px] truncate text-slate-300">
                    <span className="font-bold">GPS: </span>
                    {gpsStatus === 'locked' ? (
                      <span className="text-emerald-400 font-medium">Terkunci (±{Math.round(currentGpsCoords?.accuracy || 12)}m)</span>
                    ) : gpsStatus === 'searching' ? (
                      <span className="text-amber-300 font-medium">Mencari satelit...</span>
                    ) : gpsStatus === 'denied' ? (
                      <span className="text-red-400 font-medium">Izin GPS Ditolak</span>
                    ) : (
                      <span className="text-slate-400 font-medium">Dinonaktifkan</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setGpsTrackingEnabled(!gpsTrackingEnabled)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      gpsTrackingEnabled 
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                    title="Aktifkan atau jeda pelacakan lokasi"
                  >
                    {gpsTrackingEnabled ? 'Pelacakan Aktif' : 'Pelacakan Dijeda'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGpsExplanationModalOpen(true)}
                    className="p-1 text-slate-400 hover:text-white text-[10px] cursor-pointer"
                    title="Info Kebijakan GPS & Privasi"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* SIMPLIFIED BOTTOM NAVIGATION BAR
                  Menu Scan QR & Misi Foto sekarang digabung ke menu "Pos & Clue".
                  Menu Skor & Piagam hanya tampil jika showScore atau showCertificate aktif! */}
              <div className={`bg-slate-900 border-b border-slate-800 grid text-[11px] font-bold ${
                (showScore || showCertificate) ? 'grid-cols-4' : 'grid-cols-3'
              }`}>
                {/* 1. Pos & Clue */}
                <button
                  onClick={() => setActiveTab('clues')}
                  className={`py-2.5 text-center transition-colors cursor-pointer flex flex-col items-center gap-1 ${
                    activeTab === 'clues' 
                      ? 'text-orange-400 border-b-2 border-orange-500 bg-slate-800/60' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>Pos & Clue</span>
                </button>

                {/* 2. Peta & Azimuth */}
                <button
                  onClick={() => setActiveTab('map')}
                  className={`py-2.5 text-center transition-colors cursor-pointer flex flex-col items-center gap-1 ${
                    activeTab === 'map' 
                      ? 'text-orange-400 border-b-2 border-orange-500 bg-slate-800/60' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>{showMap ? 'Peta' : 'Peta Cetak'}</span>
                </button>

                {/* 3. Riwayat Aktivitas */}
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-2.5 text-center transition-colors cursor-pointer flex flex-col items-center gap-1 ${
                    activeTab === 'history' 
                      ? 'text-orange-400 border-b-2 border-orange-500 bg-slate-800/60' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Riwayat</span>
                </button>

                {/* 4. Skor & Piagam (Optional) */}
                {(showScore || showCertificate) && (
                  <button
                    onClick={() => setActiveTab('score')}
                    className={`py-2.5 text-center transition-colors cursor-pointer flex flex-col items-center gap-1 ${
                      activeTab === 'score' 
                        ? 'text-orange-400 border-b-2 border-orange-500 bg-slate-800/60' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {showScore && showCertificate ? (
                      <>
                        <Trophy className="w-4 h-4" />
                        <span>Skor & Piagam</span>
                      </>
                    ) : showScore ? (
                      <>
                        <Trophy className="w-4 h-4" />
                        <span>Skor Tim</span>
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4" />
                        <span>E-Piagam</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Phone Screen Inner Body */}
              <div className="bg-slate-50 min-h-[460px] p-4 text-slate-800 text-xs overflow-y-auto flex-1">
                {/* ========================================================
                    MENU 1: POS & CLUE (DENGAN SCAN QR & MISI FOTO TERPADU)
                    ======================================================== */}
                {activeTab === 'clues' && (
                  <div className="space-y-4">
                    {/* Active Target Pos Announcement */}
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-3.5 rounded-2xl shadow-md">
                      <div className="flex items-center justify-between text-[11px] font-bold text-orange-100 uppercase tracking-wider mb-1">
                        <span>Pos Terakhir Tercatat</span>
                        <span>{currentTeam.checkpointsCompleted} dari {currentTeam.totalCheckpoints} Selesai</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-white">
                        {currentTeam.lastPosName}
                      </h4>
                      <p className="text-[11px] text-orange-100 mt-1">
                        {showScore ? (
                          <>Poin Dasar: {currentTeam.points} | Bonus Juri: +{currentTeam.bonusPoints}</>
                        ) : (
                          <>Progres Tim: {currentTeam.checkpointsCompleted} Pos Tuntas (Skor Dirahasiakan)</>
                        )}
                      </p>
                    </div>

                    {/* Integrated Quick Action Bar inside Pos & Clue */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setScannerModalOpen(true)}
                        className="p-2.5 bg-white hover:bg-orange-50/70 border border-slate-200 hover:border-orange-300 rounded-2xl text-left transition-all shadow-xs group cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold mb-1.5 group-hover:scale-105 transition-transform">
                          <QrCode className="w-3.5 h-3.5" />
                        </div>
                        <div className="font-extrabold text-slate-900 text-[11px] truncate">Scan QR Pos</div>
                        <div className="text-[9px] text-slate-500 truncate">Kamera & kode</div>
                      </button>

                      <button
                        onClick={() => setActiveTab('map')}
                        className="p-2.5 bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-2xl text-left transition-all shadow-xs group cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-1.5 group-hover:scale-105 transition-transform">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="font-extrabold text-slate-900 text-[11px] truncate">Peta & Marker</div>
                        <div className="text-[9px] text-slate-500 truncate">{checkpoints.length} titik sebaran</div>
                      </button>

                      <button
                        onClick={() => {
                          const nextCp = checkpoints[currentTeam.checkpointsCompleted] || checkpoints[0];
                          setMissionModalCp(nextCp);
                        }}
                        className="p-2.5 bg-white hover:bg-purple-50/70 border border-slate-200 hover:border-purple-300 rounded-2xl text-left transition-all shadow-xs group cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold mb-1.5 group-hover:scale-105 transition-transform">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                        <div className="font-extrabold text-slate-900 text-[11px] truncate">Misi Foto</div>
                        <div className="text-[9px] text-slate-500 truncate">Kirim ke juri</div>
                      </button>
                    </div>

                    {/* Checkpoint list with unified Scan & Photo Mission buttons */}
                    <div className="space-y-3">
                      <div className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center justify-between">
                        <span>Rute Checkpoint ({checkpoints.length} Pos):</span>
                        <span className="text-[10px] text-slate-500">Scan QR & Misi Foto langsung di tiap pos</span>
                      </div>

                      {checkpoints.map((cp, idx) => {
                        const isDone = idx < currentTeam.checkpointsCompleted;
                        const isCurrent = idx === currentTeam.checkpointsCompleted;
                        const isLocked = isCpAutoLocked(cp) && !isDone;

                        return (
                          <div 
                            key={`${cp.id}-${idx}`}
                            className={`rounded-2xl border p-3.5 transition-all ${
                              isDone
                                ? 'bg-emerald-50/70 border-emerald-200'
                                : isLocked
                                ? 'bg-red-50/70 border-red-200 opacity-90'
                                : isCurrent
                                ? 'bg-white border-orange-400 shadow-md ring-2 ring-orange-400/20'
                                : 'bg-slate-100/80 border-slate-200 opacity-80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5">
                                <span className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-600 text-white'
                                    : isLocked
                                    ? 'bg-red-600 text-white'
                                    : isCurrent
                                    ? 'bg-orange-500 text-white shadow-xs'
                                    : 'bg-slate-300 text-slate-600'
                                }`}>
                                  {isDone ? <Check className="w-4 h-4" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : cp.number}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                                    <span>{cp.name}</span>
                                    {isDone && (
                                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                                        Tuntas
                                      </span>
                                    )}
                                    {isLocked && (
                                      <span className="text-[10px] text-red-700 font-bold bg-red-100 px-1.5 py-0.2 rounded border border-red-200 flex items-center gap-1">
                                        <Lock className="w-3 h-3 text-red-600" /> Auto-Locked
                                      </span>
                                    )}
                                    {isCurrent && !isLocked && (
                                      <span className="text-[10px] text-orange-700 font-bold bg-orange-100 px-1.5 py-0.2 rounded">
                                        Pos Aktif
                                      </span>
                                    )}
                                  </div>
                                  {cp.locationName && (
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      {cp.locationName}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {showScore ? (
                                <span className="font-extrabold text-xs text-orange-600 shrink-0 font-mono">
                                  +{cp.points} Pts
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                                  Pos #{cp.number}
                                </span>
                              )}
                            </div>

                            {/* Clue box */}
                            <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-700">Petunjuk Lokasi (Clue):</span>
                                <span className="text-[10px] text-slate-500 font-mono">Pos #{cp.number}</span>
                              </div>
                              <p className="bg-white/90 p-2 rounded-xl text-[11px] text-slate-700 italic border border-slate-200">
                                {cp.clue ? `"${cp.clue}"` : <span className="text-slate-400 not-italic">(Langsung menuju patokan pos)</span>}
                              </p>

                              {/* Challenge Mission description */}
                              <div className="p-2 bg-purple-50/70 rounded-xl border border-purple-200 text-[11px] text-purple-900 flex items-start gap-1.5">
                                <Camera className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                                <div>
                                  <strong>Misi:</strong> {cp.challengeDescription}
                                </div>
                              </div>

                              {/* Integrated Direct Actions per Pos */}
                              <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('map');
                                  }}
                                  className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Lihat posisi pos ini pada peta interaktif"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Lihat di Peta</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setMissionModalCp(cp)}
                                  className="px-2.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Camera className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Unggah Misi Foto</span>
                                </button>

                                {!isDone ? (
                                  isLocked ? (
                                    <button
                                      type="button"
                                      onClick={() => onShowToast(`🔒 Pos "${cp.name}" tertutup otomatis (Auto-Locked). Pembatasan waktu telah terlampaui.`)}
                                      className="px-3 py-1.5 text-[10px] font-bold rounded-xl bg-red-100 text-red-700 border border-red-300 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Lock className="w-3.5 h-3.5 text-red-600" />
                                      <span>Pos Tertutup Otomatis</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setScannerModalOpen(true)}
                                      className={`px-3 py-1.5 text-[10px] font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-xs ${
                                        cooldownRemaining > 0 && !demoBypassCooldown
                                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                          : 'bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold'
                                      }`}
                                    >
                                      {cooldownRemaining > 0 && !demoBypassCooldown ? (
                                        <>
                                          <Clock className="w-3 h-3 text-amber-200 animate-spin" />
                                          <span>Jeda ({cooldownRemaining}s)</span>
                                        </>
                                      ) : (
                                        <>
                                          <QrCode className="w-3.5 h-3.5" />
                                          <span>Scan / Check-in Pos</span>
                                        </>
                                      )}
                                    </button>
                                  )
                                ) : (
                                  <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-xl flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Telah Selesai</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ========================================================
                    MENU 2: PETA & AZIMUTH KOMPAS
                    ======================================================== */}
                {activeTab === 'map' && (
                  <InteractiveCompassMap
                    checkpoints={checkpoints}
                    currentTeam={currentTeam}
                    onSelectCheckpoint={(_cp) => setScannerModalOpen(true)}
                    showDigitalMap={showMap}
                  />
                )}

                {/* ========================================================
                    MENU 3: RIWAYAT AKTIVITAS KUNJUNGAN POS (ACTIVITY LOG)
                    ======================================================== */}
                {activeTab === 'history' && (
                  <div className="space-y-4">
                    <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <h4 className="font-extrabold text-sm">Riwayat Aktivitas Kunjungan Pos</h4>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Catatan waktu tiba, metode verifikasi, dan status penyelesaian setiap pos yang telah dikunjungi oleh Tim {currentTeam.name}.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {(!currentTeam.visitHistory || currentTeam.visitHistory.length === 0) ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 space-y-2">
                          <MapPin className="w-8 h-8 mx-auto text-slate-300" />
                          <div className="font-bold text-slate-700">Belum Ada Riwayat Kunjungan Pos</div>
                          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                            Lakukan scan QR di pos checkpoint terdekat atau selesaikan misi foto untuk mulai mencatat riwayat kunjungan.
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('clues')}
                            className="mt-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            Mulai Pos & Clue
                          </button>
                        </div>
                      ) : (
                        currentTeam.visitHistory.map((visit, idx) => (
                          <div
                            key={`${visit.checkpointId || 'visit'}-${idx}-${visit.timeString || ''}`}
                            className="bg-white border border-slate-200 hover:border-orange-300 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-extrabold shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900 text-xs">
                                  {visit.checkpointName}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {visit.timeString}
                                  </span>
                                  <span>•</span>
                                  <span className="bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded">
                                    {visit.method}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-extrabold text-emerald-600 text-xs font-mono">
                                +{visit.points} Pts
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full inline-block mt-1">
                                Tuntas
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ========================================================
                    MENU 3: SKOR & PIAGAM (OPSI VISIBILITAS KONDISIONAL)
                    ======================================================== */}
                {activeTab === 'score' && (showScore || showCertificate) && (
                  <div className="space-y-4">
                    {/* Digital Certificate Banner (Only if showCertificate is true) */}
                    {showCertificate ? (
                      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-md space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-200" />
                            <h4 className="font-extrabold text-sm text-white">E-Sertifikat Finisher Resmi</h4>
                          </div>
                          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white">
                            E-Piagam
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-100 leading-snug">
                          Piagam penghargaan resmi atas nama regu <strong>{currentTeam.name}</strong>
                          {showScore && <> dengan perolehan <strong>{currentTeam.totalScore} Poin</strong></>}.
                        </p>
                        <button
                          type="button"
                          onClick={() => setCertModalOpen(true)}
                          className="w-full py-2 bg-white text-orange-600 hover:bg-orange-50 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                        >
                          <Award className="w-4 h-4" />
                          <span>Buka E-Sertifikat Tim ({currentTeam.name})</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Menu E-Piagam disembunyikan oleh Panitia sampai seluruh rute tuntas dan disahkan.</span>
                      </div>
                    )}

                    {/* Leaderboard Section (Only if showScore is true) */}
                    {showScore ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pt-1">
                          <h4 className="font-bold text-slate-900 text-sm">Papan Skor Singkat (Live Sync)</h4>
                          <button 
                            type="button"
                            onClick={onOpenLeaderboard}
                            className="text-xs font-bold text-orange-600 underline cursor-pointer"
                          >
                            Buka Layar Penuh
                          </button>
                        </div>

                        <div className="space-y-2">
                          {teams.map((t, idx) => (
                            <div 
                              key={`${t.id}-${idx}`}
                              className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                t.id === currentTeam.id 
                                  ? 'bg-orange-50 border-orange-400 shadow-sm ring-1 ring-orange-400/30' 
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-500 w-4">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                    <span>{t.name}</span>
                                    {t.id === currentTeam.id && (
                                      <span className="text-[9px] px-1 bg-orange-200 text-orange-800 rounded font-bold">
                                        Tim Anda
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500">{t.lastPosName}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-extrabold text-slate-900 text-xs font-mono">{t.totalScore}</span>
                                <div className="text-[10px] text-slate-400">Pts</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Blind scoring lock notice */
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2">
                        <div className="flex items-center gap-2 font-bold text-amber-900">
                          <Lock className="w-4 h-4 text-amber-600" />
                          <span>Perolehan Skor Dirahasiakan oleh Panitia</span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          Panitia mengaktifkan mode skor tertutup (blind scoring) untuk menjaga ketegangan dan kejutan kompetisi hingga pengumuman pemenang resmi.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phone Bottom Home Bar */}
          {isPhoneFrame && (
            <div className="bg-slate-900 py-2 flex justify-center">
              <div className="w-32 h-1 bg-slate-700 rounded-full"></div>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Camera QR Scanner Modal */}
      <ParticipantQrScannerModal
        isOpen={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        currentTeam={currentTeam}
        checkpoints={checkpoints}
        onProcessCheckIn={handleSimulateCheckIn}
        onProcessManualCode={async (codeText) => {
          setQrInputText(codeText);
          const matchedCp = checkpoints.find((c) => {
            const targetVal = c.qrCodeValue.toUpperCase();
            const cleanInput = codeText.trim().toUpperCase();
            return (
              targetVal === cleanInput || 
              targetVal.replace(/-/g, '') === cleanInput.replace(/-/g, '') ||
              targetVal.endsWith(cleanInput)
            );
          });
          if (matchedCp) {
            await handleSimulateCheckIn(matchedCp);
          } else {
            onShowToast(`Kode barcode "${codeText}" tidak ditemukan di rute lomba.`);
          }
        }}
        cooldownRemaining={cooldownRemaining}
        onShowToast={onShowToast}
      />

      {/* ========================================================
          INTEGRATED MODAL: UNGGAH MISI FOTO & TANTANGAN POS
          ======================================================== */}
      {missionModalCp && currentTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Unggah Misi Foto Pos</h3>
                  <p className="text-[10px] text-slate-500">{missionModalCp.name}</p>
                </div>
              </div>
              <button
                onClick={() => setMissionModalCp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction Card */}
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1">
              <span className="font-bold block text-[11px] text-purple-800 uppercase tracking-wider">
                Instruksi Tugas:
              </span>
              <p className="leading-relaxed">
                {missionModalCp.challengeDescription}
              </p>
            </div>

            {/* Photo Upload Widget */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 text-xs block flex items-center justify-between">
                <span>Unggah Foto Bukti Misi:</span>
                <span className="text-[10px] text-purple-600 font-semibold">Format JPG/PNG</span>
              </label>

              <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-purple-300 bg-purple-50/50 p-2 text-center">
                {photoPreviewUrl ? (
                  <div className="space-y-2">
                    <img 
                      src={photoPreviewUrl} 
                      alt="Preview Bukti Misi" 
                      className="w-full h-28 object-cover rounded-xl shadow-xs"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <label className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-[10px] border border-purple-200 cursor-pointer shadow-xs transition-colors">
                        <span>Ganti Foto...</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImageFile(file, 800, 800, 0.7);
                              if (compressed) {
                                setPhotoPreviewUrl(compressed);
                                onShowToast('Foto berhasil diunggah dan siap dikirim.');
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
                            'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80',
                          ];
                          const randomUrl = samples[Math.floor(Math.random() * samples.length)];
                          setPhotoPreviewUrl(randomUrl);
                          onShowToast('Foto sampel tantangan berhasil dimuat.');
                        }}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[10px] cursor-pointer shadow-xs transition-colors"
                      >
                        Sampel Foto Lain
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="py-4 flex flex-col items-center justify-center cursor-pointer">
                    <Camera className="w-6 h-6 text-purple-400 mb-1" />
                    <span className="font-bold text-slate-700 text-xs">Klik untuk Unggah Foto dari Perangkat</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const compressed = await compressImageFile(file, 800, 800, 0.7);
                          if (compressed) {
                            setPhotoPreviewUrl(compressed);
                            onShowToast('Foto berhasil diunggah dan siap dikirim ke juri.');
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Description Form */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 text-xs block">
                Deskripsi Bukti Tugas Regu:
              </label>
              <textarea
                rows={3}
                value={challengeDescription}
                onChange={(e) => setChallengeDescription(e.target.value)}
                placeholder="Deskripsikan foto tugas yang dilakukan regu Anda (misal: Seluruh anggota regu berpose membentuk segitiga)..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="button"
              onClick={handleSendChallenge}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Kirim ke Juri Lapangan</span>
            </button>

            {challengeSentSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Misi berhasil dikirim ke antrean penilaian Juri Pos!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finisher Certificate Modal */}
      <FinisherCertificateModal
        isOpen={certModalOpen}
        team={currentTeam || null}
        event={currentEvent || events[0]}
        onClose={() => setCertModalOpen(false)}
        onShowToast={onShowToast}
      />

      {/* Participant Rules Modal */}
      {rulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-sm w-full p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-400" />
                <h3 className="font-extrabold text-white text-sm">Aturan & Petunjuk Lomba</h3>
              </div>
              <button
                onClick={() => setRulesModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Name & Time Limit */}
            <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700 space-y-1">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">
                {currentEvent?.title || 'Perlombaan Orienteering'}
              </span>
              <div className="text-xs text-slate-300">
                Batas Waktu: <strong>{currentEvent?.timeLimitMinutes || 180} Menit</strong>
              </div>
            </div>

            {/* Rules list */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Tata Tertib Peserta:
              </span>
              <div className="space-y-2 text-xs text-slate-300">
                {(currentEvent?.rules || [
                  'Setiap tim wajib beranggotakan lengkap saat tiba dan memindai barcode di pos.',
                  'Dilarang menggunakan kendaraan bermotor selama rute balapan.',
                  'Pos bertanda "Wajib" harus diselesaikan sebelum tim menuju garis finish.',
                  'Foto tantangan tim harus memuat wajah seluruh anggota dan petunjuk pos.',
                  'Penalti keterlambatan berlaku jika melebihi batas waktu tempuh.'
                ]).map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
                    <span className="w-5 h-5 rounded-md bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setRulesModalOpen(false)}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-md shadow-orange-500/20"
            >
              Paham, Lanjut Bertanding
            </button>
          </div>
        </div>
      )}

      {/* SOS Emergency Confirmation Modal */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-red-500 text-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-500 border border-red-500/40 flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-black text-lg text-white">DARURAT (SOS) PANITIA</h3>
              <p className="text-xs text-red-200">
                Apakah Anda benar-benar dalam keadaan darurat atau butuh bantuan segera? Sinyal SOS dan koordinat GPS terkini tim Anda akan dikirimkan secara instan ke layar pengawas panitia.
              </p>
            </div>

            <div className="bg-red-950/60 p-3 rounded-2xl border border-red-800 text-[11px] text-red-300 font-mono">
              Tim: <strong>{currentTeam?.name}</strong> ({currentTeam?.bibNumber})
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setSosModalOpen(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleTriggerSos}
                disabled={sosSending}
                className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs cursor-pointer transition-colors shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5"
              >
                {sosSending ? 'Mengirim...' : 'Kirim SOS!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Queue Detail Modal */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Antrean Cache Scan Offline</h3>
                  <p className="text-[11px] text-slate-500">Penyimpanan Sementara (IndexedDB / LocalStorage)</p>
                </div>
              </div>
              <button
                onClick={() => setShowOfflineModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Sistem Penyimpanan Cerdas HP Peserta</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Semua scan barcode di pos perlombaan tetap tercatat aman di HP Anda meski tanpa sinyal atau kuota. Antrean ini akan terkirim otomatis ke server saat internet HP pulih.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Daftar Scan Offline ({pendingOfflineScans.length}):</span>
                {pendingOfflineScans.length > 0 && (
                  <button
                    onClick={async () => {
                      await clearOfflineScanQueue();
                      await refreshPendingQueue();
                      onShowToast('Antrean scan offline dibersihkan.');
                    }}
                    className="text-[10px] text-red-600 hover:underline cursor-pointer"
                  >
                    Bersihkan Antrean
                  </button>
                )}
              </div>

              {pendingOfflineScans.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                  <p className="font-bold text-slate-700">Tidak ada antrean scan tertunda</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Semua hasil scan QR Anda sudah tersinkronkan penuh ke server juri.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {pendingOfflineScans.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-extrabold text-slate-900">{item.checkpointName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Kode: {item.qrCodeInput} • {item.timeFormatted}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                        Tertunda
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setShowOfflineModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Tutup
              </button>
              {pendingOfflineScans.length > 0 && (
                <button
                  onClick={async () => {
                    await triggerAutoSync();
                    setShowOfflineModal(false);
                  }}
                  disabled={isSyncingOffline}
                  className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs cursor-pointer transition-colors shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5"
                >
                  <UploadCloud className={`w-4 h-4 ${isSyncingOffline ? 'animate-spin' : ''}`} />
                  <span>{isSyncingOffline ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* GPS Telemetry & Privacy Explanation Modal (Directive D) */}
      {gpsExplanationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Kebijakan Pelacakan GPS</h4>
                  <p className="text-[10px] text-slate-500">Monitoring Keselamatan Lapangan</p>
                </div>
              </div>
              <button
                onClick={() => setGpsExplanationModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>Tujuan Pelacakan:</strong> Koordinat perangkat Anda dikirimkan ke Dashboard Panitia secara berkala (setiap 15–30 detik) semata-mata untuk:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px]">
                <li>Validasi radius saat memindai kode QR pos.</li>
                <li>Pemantauan radar posisi tim dan deteksi tim tersesat.</li>
                <li>Penyelamatan darurat cepat saat menekan tombol SOS.</li>
              </ul>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                <div className="font-bold text-slate-800">Hemat Daya Baterai:</div>
                <p className="text-slate-500">
                  Sistem menggunakan throttling hemat daya dan hanya menyiarkan posisi saat aplikasi aktif atau saat diperlukan verifikasi pos.
                </p>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                <span>Status Pelacakan Anda:</span>
                <span className="font-bold">{gpsTrackingEnabled ? '🟢 AKTIF' : '⚪ DIJEDA'}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGpsTrackingEnabled(!gpsTrackingEnabled);
                  setGpsExplanationModalOpen(false);
                  onShowToast(gpsTrackingEnabled ? 'Pelacakan GPS dijeda sementara.' : 'Pelacakan GPS diaktifkan kembali.');
                }}
                className={`w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                  gpsTrackingEnabled 
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                }`}
              >
                {gpsTrackingEnabled ? 'Jeda Pelacakan' : 'Aktifkan Pelacakan'}
              </button>
              <button
                type="button"
                onClick={() => setGpsExplanationModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
