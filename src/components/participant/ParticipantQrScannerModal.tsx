import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { 
  QrCode, 
  Camera, 
  X, 
  SwitchCamera, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Lock, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  MapPin, 
  ChevronRight,
  RefreshCw,
  Award
} from 'lucide-react';
import { Checkpoint, Team } from '../../types';

interface ParticipantQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTeam?: Team;
  checkpoints: Checkpoint[];
  onProcessCheckIn: (cp: Checkpoint, bypassCooldown?: boolean) => Promise<void>;
  onProcessManualCode: (codeText: string) => Promise<void>;
  cooldownRemaining: number;
  onShowToast: (msg: string) => void;
}

export const ParticipantQrScannerModal: React.FC<ParticipantQrScannerModalProps> = ({
  isOpen,
  onClose,
  currentTeam,
  checkpoints,
  onProcessCheckIn,
  onProcessManualCode,
  cooldownRemaining,
  onShowToast,
}) => {
  // Mode: 'camera' | 'manual'
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');

  // Camera State
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied' | 'unsupported'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Video & Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Manual Input State
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Scan Result State (when a QR code is detected)
  const [lastScannedResult, setLastScannedResult] = useState<{
    code: string;
    cp?: Checkpoint;
    timestamp: number;
  } | null>(null);

  // Cooldown Bypass toggle
  const [bypassCooldown, setBypassCooldown] = useState<boolean>(false);

  // Hardware Diagnostic Tool State & Runner
  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    hasMediaDevices: boolean;
    hasGetUserMedia: boolean;
    isSecureContext: boolean;
    deviceCount: number;
  } | null>(null);

  const runHardwareDiagnostic = async () => {
    console.info('[Hardware Diagnostic Tool] Starting navigator.mediaDevices diagnostic check...');
    const hasMD = !!(navigator && navigator.mediaDevices);
    const hasGUM = !!(hasMD && navigator.mediaDevices.getUserMedia);
    const isSec = window.isSecureContext;
    let count = 0;

    if (hasMD && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        count = videoDevices.length;
        console.info('[Hardware Diagnostic Tool] Found video input devices:', count, videoDevices.map(d => ({ label: d.label || 'hidden', deviceId: d.deviceId })));
      } catch (err: any) {
        console.warn('[Hardware Diagnostic Tool] enumerateDevices error:', err?.name, err?.message);
      }
    }

    const diag = {
      hasMediaDevices: hasMD,
      hasGetUserMedia: hasGUM,
      isSecureContext: isSec,
      deviceCount: count,
    };
    setDiagnosticInfo(diag);
    console.info('[Hardware Diagnostic Tool] Diagnostic Summary:', diag);
    return diag;
  };

  // Reset states on open/close and optimize battery with visibilitychange
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopCamera();
      } else if (document.visibilityState === 'visible' && isOpen && activeTab === 'camera') {
        startCamera();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (isOpen) {
      setLastScannedResult(null);
      setErrorMessage(null);
      setManualCodeInput('');
      if (activeTab === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode]);

  // Audio Beep generator for success feedback
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);

      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch {
      // Ignore audio context errors
    }
  };

  // Start Camera with Fallbacks & Timeout
  const startCamera = async () => {
    stopCamera();
    setCameraPermission('pending');
    setErrorMessage(null);

    await runHardwareDiagnostic();

    console.info('[QR Scanner Debug] Initiating getUserMedia. UserAgent:', navigator.userAgent, 'FacingMode:', facingMode, 'Protocol:', window.location.protocol);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('[QR Scanner Debug] navigator.mediaDevices.getUserMedia is unsupported.');
      setCameraPermission('unsupported');
      setErrorMessage('Kamera tidak didukung pada peramban/perangkat ini.');
      return;
    }

    // Timeout safety in case getUserMedia hangs indefinitely waiting for permission
    let hasTimedOut = false;
    const timeoutId = setTimeout(() => {
      if (cameraPermission === 'pending') {
        hasTimedOut = true;
        setCameraPermission('denied');
        setErrorMessage('Waktu tunggu akses kamera habis atau izin diblokir browser. Silakan gunakan Input Manual.');
        stopCamera();
      }
    }, 7000);

    try {
      let stream: MediaStream | null = null;

      // Try 1: High res ideal constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (firstErr) {
        console.warn('[QR Scanner] First constraints attempt failed, trying simpler constraints...', firstErr);
        // Try 2: Simpler constraints fallback for older/restricted mobile browsers
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
        });
      }

      if (hasTimedOut) {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        clearTimeout(timeoutId);
        return;
      }

      clearTimeout(timeoutId);

      if (!stream) {
        throw new Error('Stream kamera kosong.');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
        setCameraPermission('granted');

        // Start Frame Decoding Loop
        requestAnimationFrame(scanVideoFrame);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (hasTimedOut) return;

      console.error('[QR Scanner Debug] CRITICAL getUserMedia Error:', {
        name: err?.name,
        message: err?.message,
        constraint: err?.constraint,
        stack: err?.stack,
        userAgent: navigator.userAgent,
      });

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        setCameraPermission('denied');
        setErrorMessage(`Izin kamera ditolak/diblokir (${err.name}). Ketuk ikon gembok di bilah alamat browser, izinkan kamera, lalu muat ulang.`);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraPermission('unsupported');
        setErrorMessage(`Kamera fisik tidak ditemukan (${err.name}). Pastikan perangkat memiliki kamera aktif.`);
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraPermission('denied');
        setErrorMessage(`Kamera sedang digunakan aplikasi lain (${err.name}). Tutup aplikasi lain yang mengakses kamera.`);
      } else if (err.name === 'OverconstrainedError') {
        setCameraPermission('denied');
        setErrorMessage(`Kamera tidak mendukung spesifikasi resolusi yang diminta (${err.name}).`);
      } else {
        setCameraPermission('denied');
        setErrorMessage(`Gagal membuka kamera [${err.name || 'Error'}]: ${err.message || 'Kesalahan tidak diketahui'}`);
      }
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
  };

  // Toggle Torch/Flashlight if track supports it
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities() as any;
      if (capabilities && capabilities.torch) {
        const nextTorch = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setTorchOn(nextTorch);
        onShowToast(nextTorch ? '🔦 Senter kamera dinyalakan.' : '🔦 Senter kamera dimatikan.');
      } else {
        onShowToast('Senter kamera tidak didukung pada perangkat/kamera ini.');
      }
    } catch {
      onShowToast('Senter kamera tidak dapat diaktifkan.');
    }
  };

  // Frame Decoding Loop via jsQR
  const scanVideoFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data && code.data.trim().length > 0) {
        const decodedString = code.data.trim();
        handleQrDetected(decodedString);
        return; // Pause scanning while result card is active
      }
    }

    animFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  // Handle detected QR string
  const handleQrDetected = async (rawCode: string) => {
    // Prevent duplicate scans within 2.5 seconds
    if (lastScannedResult && (Date.now() - lastScannedResult.timestamp < 2500) && lastScannedResult.code === rawCode) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    playBeep();

    const matchedCp = checkpoints.find((c) => {
      const targetVal = c.qrCodeValue.toUpperCase();
      const cleanInput = rawCode.trim().toUpperCase();
      return (
        targetVal === cleanInput ||
        targetVal.replace(/-/g, '') === cleanInput.replace(/-/g, '') ||
        targetVal.endsWith(cleanInput)
      );
    });

    setLastScannedResult({
      code: rawCode,
      cp: matchedCp,
      timestamp: Date.now(),
    });

    if (matchedCp) {
      await onProcessCheckIn(matchedCp, bypassCooldown);
    } else {
      onShowToast(`⚠️ QR Code "${rawCode}" berhasil dipindai, namun tidak cocok dengan pos event.`);
    }
  };

  // Submit Manual Code
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;

    setIsSubmitting(true);
    await onProcessManualCode(manualCodeInput.trim());
    setIsSubmitting(false);
    setManualCodeInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-0 sm:p-4 animate-in fade-in duration-200">
      
      {/* Hidden canvas for jsQR frame processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header Bar */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-orange-500/20">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-base">Pemindai QR Code Pos</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE DECODER
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {currentTeam ? `Tim: ${currentTeam.name} (${currentTeam.bibNumber})` : 'Mode Pemindai Lapangan'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-slate-950">
        
        {/* Anti-speedrun Warning Banner if in cooldown */}
        {cooldownRemaining > 0 && !bypassCooldown && (
          <div className="absolute top-4 left-4 right-4 z-40 bg-amber-500/90 backdrop-blur-md text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-bold border border-amber-400 shadow-xl flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-950 animate-spin shrink-0" />
              <span>Jeda Anti-Speedrun: Tunggu {cooldownRemaining}s lagi sebelum scan pos berikutnya.</span>
            </div>
            <button
              onClick={() => setBypassCooldown(true)}
              className="text-[10px] font-extrabold underline cursor-pointer hover:text-white"
            >
              Bypass
            </button>
          </div>
        )}

        {/* MODE 1: CAMERA SCANNER VIEW */}
        {activeTab === 'camera' && (
          <div className="w-full h-full flex flex-col items-center justify-center relative min-h-[380px]">
            {cameraPermission === 'granted' && (
              <>
                {/* Live Video Feed */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover max-h-[70vh]"
                />

                {/* Camera Overlay Viewfinder Target */}
                <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
                  <div className="w-64 h-64 sm:w-72 sm:h-72 border-2 border-white/40 rounded-3xl relative flex items-center justify-center shadow-2xl overflow-hidden backdrop-brightness-110">
                    {/* Corner Brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-2xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-2xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-2xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-2xl" />

                    {/* Animated Scanning Laser Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-lg shadow-orange-500 animate-pulse absolute top-1/2 -translate-y-1/2" />

                    {/* Instruction hint in target */}
                    <div className="bg-slate-950/70 text-white px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-xs border border-white/20">
                      Arahkan Kamera ke Stiker QR
                    </div>
                  </div>
                </div>

                {/* Floating Camera Controls (Torch, Switch, Sound) */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-700/80 shadow-2xl flex items-center gap-4">
                  <button
                    onClick={toggleTorch}
                    className={`p-2.5 rounded-full transition-all cursor-pointer ${
                      torchOn ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30' : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                    title="Aktifkan Senter Kamera"
                  >
                    <Zap className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
                    className="p-2.5 rounded-full bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Ganti Kamera Depan/Belakang"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-2.5 rounded-full transition-all cursor-pointer ${
                      soundEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}
                    title="Suara Beep Scan"
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                </div>
              </>
            )}

            {cameraPermission === 'pending' && (
              <div className="p-8 text-center space-y-4">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-300">Menghubungkan Kamera HP...</p>
                  <p className="text-[10px] text-slate-400">Pastikan Anda mengizinkan akses kamera pada browser.</p>
                </div>
                <button
                  onClick={() => setActiveTab('manual')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md border border-slate-700"
                >
                  Beralih ke Input Manual Kode
                </button>
              </div>
            )}

            {(cameraPermission === 'denied' || cameraPermission === 'unsupported') && (
              <div className="p-6 max-w-sm text-center space-y-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl m-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-white text-base">Akses Kamera Terkendala</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {errorMessage || 'Izin kamera ditolak oleh peramban HP.'}
                  </p>
                </div>

                {diagnosticInfo && (
                  <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-left space-y-1 text-[11px] text-slate-400">
                    <p className="font-bold text-slate-200">🔍 Laporan Diagnostik Perangkat:</p>
                    <p>• Secure Context (HTTPS): <span className={diagnosticInfo.isSecureContext ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{diagnosticInfo.isSecureContext ? 'Aman (Ya)' : 'Tidak Aman (HTTP)'}</span></p>
                    <p>• MediaDevices API: <span className={diagnosticInfo.hasMediaDevices ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{diagnosticInfo.hasMediaDevices ? 'Didukung' : 'Tidak Didukung'}</span></p>
                    <p>• Kamera Terdeteksi: <span className={diagnosticInfo.deviceCount > 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{diagnosticInfo.deviceCount > 0 ? `${diagnosticInfo.deviceCount} Kamera` : 'Tidak Ada / Izin Diblokir'}</span></p>
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={startCamera}
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Coba Ulang Akses Kamera</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('manual')}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Gunakan Mode Input Kode Barcode
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: MANUAL BARCODE CODE INPUT */}
        {activeTab === 'manual' && (
          <div className="w-full max-w-md p-6 space-y-6 animate-in fade-in duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto border border-orange-500/30">
                <Keyboard className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-extrabold text-white">Input Kode Stiker / Barcode</h4>
              <p className="text-xs text-slate-400">
                Ketikkan kode barcode stiker pos (contoh: <code className="text-orange-400 font-mono font-bold">QR-POS01-AMZ-2026</code>) jika kamera HP sulit membaca stiker.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Kode Barcode Pos:</label>
                <input
                  type="text"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  placeholder="Masukkan kode pos..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !manualCodeInput.trim()}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verifikasi Kode Pos</span>
              </button>
            </form>

            {/* Quick Demo Selector for Field Testing */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span>Pilihan Pos Rute Event ({checkpoints.length}):</span>
                </span>
                <span className="text-[10px] text-slate-500">Klik untuk test</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {checkpoints.map((cp, idx) => (
                  <button
                    key={`${cp.id}-${idx}`}
                    type="button"
                    onClick={() => onProcessCheckIn(cp, bypassCooldown)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="font-bold text-white group-hover:text-orange-400 truncate">
                        Pos #{cp.number}: {cp.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {cp.locationName ? `Lokasi: ${cp.locationName}` : `Petunjuk: ${cp.clue || 'Pos di rute lomba'}`}
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded shrink-0">
                      +{cp.points} Pts
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCAN RESULT OVERLAY CARD (Triggered when QR is scanned/detected) */}
        {lastScannedResult && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-6 flex items-center justify-center animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 border-2 border-orange-500 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl text-white">
              {lastScannedResult.cp ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase">
                      QR CODE COCOK RUTE
                    </span>
                    <h3 className="text-xl font-black text-white">{lastScannedResult.cp.name}</h3>
                    <p className="text-xs text-slate-300 flex items-center justify-center gap-1 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span>{lastScannedResult.cp.locationName || 'Area Lapangan'}</span>
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-orange-400 font-extrabold flex items-center justify-between">
                    <span>Poin Pos:</span>
                    <span className="text-base text-emerald-400">+{lastScannedResult.cp.points} Pts</span>
                  </div>

                  <button
                    onClick={() => setLastScannedResult(null)}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    Lanjutkan Permainan
                  </button>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">Kode Tidak Dikenali</h3>
                    <p className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded-xl break-all">
                      "{lastScannedResult.code}"
                    </p>
                    <p className="text-xs text-slate-300 pt-2">
                      Kode QR ini tidak sesuai dengan daftar pos rute lomba yang terdaftar.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setLastScannedResult(null);
                      if (activeTab === 'camera') startCamera();
                    }}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Pindai Ulang
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Mode Tabs */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-3 shrink-0">
        <button
          onClick={() => setActiveTab('camera')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'camera'
              ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
              : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Kamera HP Live</span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'manual'
              ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
              : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          <span>Input Barcode / Demo</span>
        </button>
      </div>
    </div>
  );
};
