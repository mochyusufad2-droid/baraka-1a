import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Printer, QrCode, CheckCircle2, Copy } from 'lucide-react';
import { Checkpoint } from '../../types';

interface QrCodeGeneratorModalProps {
  checkpoint: Checkpoint | null;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const QrCodeGeneratorModal: React.FC<QrCodeGeneratorModalProps> = ({
  checkpoint,
  onClose,
  onShowToast,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!checkpoint) return;

    // Generate real QR code image
    QRCode.toDataURL(
      checkpoint.qrCodeValue,
      {
        width: 300,
        margin: 2,
        color: {
          dark: '#0b192c',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [checkpoint]);

  if (!checkpoint) return null;

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-${checkpoint.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast(`Stiker QR untuk ${checkpoint.name} berhasil diunduh!`);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(checkpoint.qrCodeValue);
    onShowToast(`Teks kode QR "${checkpoint.qrCodeValue}" disalin ke clipboard.`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider">
            <QrCode className="w-4 h-4" />
            <span>Stiker QR Pos Resmi (Real QR)</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-[#0b192c] font-mono text-xs font-extrabold">
            POS #{checkpoint.number}
          </span>
          <h4 className="font-extrabold text-slate-900 text-lg">{checkpoint.name}</h4>
          <p className="text-xs text-slate-500">{checkpoint.locationName}</p>
        </div>

        {/* Real Generated QR Image */}
        <div className="p-4 bg-white border-4 border-[#0b192c] rounded-2xl inline-block shadow-md">
          {qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt={checkpoint.qrCodeValue} 
              className="w-48 h-48 mx-auto rounded-lg"
            />
          ) : (
            <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400">
              Membuat QR Code...
            </div>
          )}
        </div>

        {/* Code Value Pill */}
        <div className="flex items-center justify-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <span className="text-xs font-mono font-bold text-slate-800">
            {checkpoint.qrCodeValue}
          </span>
          <button
            onClick={handleCopyCode}
            title="Salin kode"
            className="text-slate-500 hover:text-orange-600 p-1 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Stiker QR ini dapat dipindai oleh kamera HP peserta saat tiba di pos kontrol. Bernilai <strong className="text-orange-600">+{checkpoint.points} Poin</strong>.
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={handleDownload}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Unduh PNG</span>
          </button>

          <button
            onClick={handlePrint}
            className="w-full py-2.5 bg-[#0b192c] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Lembar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
