import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  UserCheck, 
  Award, 
  QrCode, 
  Wifi, 
  WifiOff, 
  ArrowLeft, 
  Download, 
  Sparkles, 
  Maximize2, 
  Minimize2,
  RefreshCw,
  Share2,
  Sliders,
  ChevronRight,
  Info
} from 'lucide-react';
import { ParticipantView } from '../participant/ParticipantView';
import { MobileJudgeView } from './MobileJudgeView';
import { MobileQrShareModal } from './MobileQrShareModal';
import { useRace } from '../../context/RaceContext';

interface MobileAppPortalProps {
  initialRole?: 'participant' | 'judge';
  onShowToast: (msg: string) => void;
  onOpenLeaderboard: () => void;
  onExitMobilePortal?: () => void;
}

export const MobileAppPortal: React.FC<MobileAppPortalProps> = ({
  initialRole = 'participant',
  onShowToast,
  onOpenLeaderboard,
  onExitMobilePortal
}) => {
  const [activeRole, setActiveRole] = useState<'participant' | 'judge'>(initialRole);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('09:41');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  // PWA Install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(false);
  const [showPwaBanner, setShowPwaBanner] = useState<boolean>(true);

  // Digital clock for mobile status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Network state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) {
      setQrModalOpen(true);
      return;
    }
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      onShowToast('🎉 Aplikasi Mobile RacePoint berhasil diinstal ke HP Anda!');
      setCanInstallPwa(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Top Controls Bar for Mobile Shell (Allows switching mode, toggling phone frame, opening QR share) */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left Brand & Exit Button */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            {onExitMobilePortal && (
              <button
                onClick={onExitMobilePortal}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Kembali ke Portal Web Utama"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Portal Utama</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-md">
                📱
              </div>
              <div>
                <span className="font-extrabold text-xs text-white tracking-tight">RacePoint Mobile Shell</span>
                <span className="text-[10px] text-slate-400 block -mt-0.5">Aplikasi Khusus Lapangan</span>
              </div>
            </div>

            {/* Quick QR share button on mobile viewport */}
            <button
              onClick={() => setQrModalOpen(true)}
              className="sm:hidden px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[11px] font-bold flex items-center gap-1"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR HP</span>
            </button>
          </div>

          {/* Center: Mobile Role Switcher (Peserta vs Juri) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 w-full sm:w-auto justify-center">
            <button
              onClick={() => {
                setActiveRole('participant');
                onShowToast('🏃‍♂️ Beralih ke Aplikasi Peserta (Navigasi & Misi)');
              }}
              className={`flex-1 sm:flex-none py-1.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeRole === 'participant'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Aplikasi Peserta</span>
            </button>

            <button
              onClick={() => {
                setActiveRole('judge');
                onShowToast('⚖️ Beralih ke Aplikasi Juri Pos (Scan BIB & Nilai)');
              }}
              className={`flex-1 sm:flex-none py-1.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeRole === 'judge'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Aplikasi Juri Pos</span>
            </button>
          </div>

          {/* Right: Actions (Frame Toggle & QR Share & Install PWA) */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => setIsPhoneFrame(!isPhoneFrame)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title={isPhoneFrame ? 'Ubah ke Layar Penuh' : 'Ubah ke Frame Smartphone'}
            >
              {isPhoneFrame ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              <span>{isPhoneFrame ? 'Layar Penuh' : 'Frame HP'}</span>
            </button>

            <button
              onClick={() => setQrModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Buka di HP (QR)</span>
            </button>

            <button
              onClick={handleInstallPwa}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pasang PWA</span>
            </button>
          </div>
        </div>
      </header>

      {/* PWA Install Banner Notice (Dismissable) */}
      {showPwaBanner && (
        <div className="bg-gradient-to-r from-orange-950/80 via-slate-900 to-blue-950/80 border-b border-slate-800 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
              <span>
                <strong>Aplikasi Mobile Siap Dipasang:</strong> Berjalan cepat offline di lapangan tanpa download App Store.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setQrModalOpen(true)}
                className="text-[11px] font-bold text-orange-400 hover:underline"
              >
                Petunjuk Install
              </button>
              <button
                onClick={() => setShowPwaBanner(false)}
                className="text-slate-500 hover:text-slate-300 text-sm px-1"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 flex justify-center items-start p-0 sm:p-4 md:p-6 bg-slate-950">
        {isPhoneFrame ? (
          /* Phone Frame Container with Bezel */
          <div className="w-full max-w-[430px] rounded-none sm:rounded-[44px] sm:border-[10px] sm:border-slate-800 sm:shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden bg-slate-900 flex flex-col min-h-screen sm:min-h-[844px] transition-all">
            {/* Phone Top Speaker & Sensor Island */}
            <div className="bg-slate-950 py-2 px-6 flex justify-between items-center text-slate-400 text-[11px] font-mono select-none border-b border-slate-800/60">
              <span>{currentTime}</span>
              <div className="w-24 h-4 bg-slate-900 rounded-full flex items-center justify-center gap-1 border border-slate-800">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                <div className="w-2 h-2 rounded-full bg-blue-500/40"></div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-emerald-400 font-bold">5G</span>
                {isOnline ? (
                  <Wifi className="w-3 h-3 text-emerald-400" />
                ) : (
                  <WifiOff className="w-3 h-3 text-amber-400" />
                )}
                <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-0.5 flex items-center">
                  <div className="h-full w-full bg-emerald-400 rounded-2xs"></div>
                </div>
              </div>
            </div>

            {/* Active Mobile Component */}
            <div className="flex-1 overflow-y-auto">
              {activeRole === 'participant' ? (
                <ParticipantView
                  onShowToast={onShowToast}
                  onOpenLeaderboard={onOpenLeaderboard}
                />
              ) : (
                <MobileJudgeView
                  onShowToast={onShowToast}
                  onSwitchToParticipant={() => setActiveRole('participant')}
                />
              )}
            </div>

            {/* Phone Bottom Home Indicator */}
            <div className="hidden sm:flex justify-center items-center py-2 bg-slate-950 select-none">
              <div className="w-32 h-1 bg-slate-700 rounded-full"></div>
            </div>
          </div>
        ) : (
          /* Fullscreen Mobile View (no outer bezel) */
          <div className="w-full max-w-xl mx-auto bg-slate-900 min-h-screen flex flex-col">
            {activeRole === 'participant' ? (
              <ParticipantView
                onShowToast={onShowToast}
                onOpenLeaderboard={onOpenLeaderboard}
              />
            ) : (
              <MobileJudgeView
                onShowToast={onShowToast}
                onSwitchToParticipant={() => setActiveRole('participant')}
              />
            )}
          </div>
        )}
      </main>

      {/* QR Code Share & Install Modal */}
      <MobileQrShareModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onShowToast={onShowToast}
        defaultRole={activeRole}
      />
    </div>
  );
};
