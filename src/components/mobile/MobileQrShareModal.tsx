import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Smartphone, 
  Copy, 
  CheckCircle2, 
  QrCode, 
  Download, 
  Share2, 
  ExternalLink,
  Sparkles,
  UserCheck,
  Award
} from 'lucide-react';

interface MobileQrShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  defaultRole?: 'participant' | 'judge';
}

export const MobileQrShareModal: React.FC<MobileQrShareModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  defaultRole = 'participant'
}) => {
  const [role, setRole] = useState<'participant' | 'judge'>(defaultRole);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (defaultRole) {
      setRole(defaultRole);
    }
  }, [defaultRole]);

  // Construct target mobile URL with parameters
  const currentBase = typeof window !== 'undefined' ? window.location.origin : 'https://racepoint.app';
  const targetMobileUrl = `${currentBase}/?view=mobile-app&role=${role}`;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(
      targetMobileUrl,
      {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [isOpen, targetMobileUrl, role]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetMobileUrl);
    setCopied(true);
    onShowToast('Tautan aplikasi mobile berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_App_Mobile_${role.toUpperCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast(`QR Code App ${role === 'participant' ? 'Peserta' : 'Juri'} berhasil diunduh!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0b192c] via-[#0f233d] to-slate-900 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Buka di HP Smartphone</h3>
                <p className="text-xs text-slate-300">Scan QR Code dengan kamera HP Anda</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Role selector inside modal */}
          <div className="grid grid-cols-2 gap-2 mt-4 bg-slate-950/60 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setRole('participant')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                role === 'participant'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Mode Peserta</span>
            </button>
            <button
              onClick={() => setRole('judge')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                role === 'judge'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Mode Juri Pos</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-center">
          {/* QR Code Canvas */}
          <div className="inline-block p-4 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-300 shadow-inner">
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="QR Code Mobile App" 
                className="w-56 h-56 mx-auto rounded-2xl shadow-sm"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                <QrCode className="w-12 h-12 animate-pulse text-slate-300" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-extrabold text-slate-800">
              {role === 'participant' ? '🏃‍♂️ Tautan Aplikasi Lapangan Peserta' : '⚖️ Tautan Aplikasi Juri Lapangan'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Buka kamera di smartphone iOS (Safari) atau Android (Chrome) lalu arahkan ke QR di atas untuk langsung membuka aplikasi.
            </p>
          </div>

          {/* Quick Copy Link Box */}
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
            <input
              type="text"
              readOnly
              value={targetMobileUrl}
              className="bg-transparent text-xs font-mono text-slate-700 w-full px-2 outline-none truncate"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>

          {/* PWA Install Instructions */}
          <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-left space-y-1 text-xs">
            <div className="font-extrabold text-amber-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Instalasi ke Layar Utama (Tanpa Download App Store):</span>
            </div>
            <ul className="text-[11px] text-amber-800 space-y-1 list-disc list-inside">
              <li><strong>Android (Chrome):</strong> Tekan menu titik tiga (⋮) &rarr; "Instal Aplikasi" atau "Tambahkan ke Layar Utama".</li>
              <li><strong>iPhone (Safari):</strong> Tekan tombol Bagikan (Share <span className="font-mono">⎋</span>) &rarr; "Tambahkan ke Layar Utama".</li>
            </ul>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleDownloadQr}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Unduh Gambar QR</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-orange-500/20"
            >
              <span>Tutup</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
