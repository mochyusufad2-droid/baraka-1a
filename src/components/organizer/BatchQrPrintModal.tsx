import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  X, 
  CheckSquare, 
  Square, 
  Search, 
  Copy, 
  Download, 
  Sliders, 
  Grid, 
  FileText, 
  Sparkles, 
  Eye, 
  Scissors, 
  MapPin, 
  Award, 
  CheckCircle2, 
  Compass,
  Layers,
  HelpCircle
} from 'lucide-react';
import { Checkpoint, EventItem } from '../../types';

interface BatchQrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoints: Checkpoint[];
  currentEvent?: EventItem | null;
  onShowToast: (msg: string) => void;
}

export const BatchQrPrintModal: React.FC<BatchQrPrintModalProps> = ({
  isOpen,
  onClose,
  checkpoints,
  currentEvent,
  onShowToast,
}) => {
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Print layout settings
  const [layoutColumns, setLayoutColumns] = useState<'grid-1' | 'grid-2' | 'grid-3' | 'grid-4'>('grid-2');
  const [themeStyle, setThemeStyle] = useState<'contrast' | 'color'>('contrast');
  
  // Elements toggle
  const [showEventName, setShowEventName] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showClue, setShowClue] = useState(false); // Clue default false agar rahasia jika ditempel di pohon
  const [showCodeText, setShowCodeText] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showCutGuides, setShowCutGuides] = useState(true);

  // Generated QR Data URLs map: { [checkpointId]: dataUrl }
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Initialize all selected when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(checkpoints.map((cp) => cp.id)));
    }
  }, [isOpen, checkpoints]);

  // Generate QR Data URLs for all checkpoints when opened or when checkpoints change
  useEffect(() => {
    if (!isOpen || checkpoints.length === 0) return;

    let isCancelled = false;
    setIsGenerating(true);

    const generateAll = async () => {
      const newMap: Record<string, string> = {};
      
      for (const cp of checkpoints) {
        try {
          const url = await QRCode.toDataURL(cp.qrCodeValue, {
            width: 400,
            margin: 1,
            color: {
              dark: '#0b192c',
              light: '#ffffff',
            },
          });
          newMap[cp.id] = url;
        } catch {
          // fallback placeholder
        }
      }

      if (!isCancelled) {
        setQrMap(newMap);
        setIsGenerating(false);
      }
    };

    generateAll();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, checkpoints]);

  // Filtered checkpoints based on search
  const filteredCheckpoints = useMemo(() => {
    if (!searchQuery.trim()) return checkpoints;
    const q = searchQuery.toLowerCase();
    return checkpoints.filter(
      (cp) =>
        cp.name.toLowerCase().includes(q) ||
        `pos ${cp.number}`.toLowerCase().includes(q) ||
        cp.qrCodeValue.toLowerCase().includes(q) ||
        (cp.locationName && cp.locationName.toLowerCase().includes(q))
    );
  }, [checkpoints, searchQuery]);

  // Checkpoints to actually print (in order of cp.number)
  const printableCheckpoints = useMemo(() => {
    return checkpoints
      .filter((cp) => selectedIds.has(cp.id))
      .sort((a, b) => a.number - b.number);
  }, [checkpoints, selectedIds]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedIds.size === checkpoints.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(checkpoints.map((cp) => cp.id)));
    }
  };

  const toggleCheckpoint = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handlePrint = () => {
    if (printableCheckpoints.length === 0) {
      onShowToast('Pilih minimal 1 pos checkpoint untuk dicetak.');
      return;
    }

    document.body.classList.add('printing-batch-qr');

    const cleanUp = () => {
      document.body.classList.remove('printing-batch-qr');
      window.removeEventListener('afterprint', cleanUp);
    };

    window.addEventListener('afterprint', cleanUp);
    window.print();

    // Fallback timeout in case afterprint does not fire
    setTimeout(() => {
      document.body.classList.remove('printing-batch-qr');
    }, 1500);
  };

  const handleCopySummary = () => {
    if (printableCheckpoints.length === 0) {
      onShowToast('Pilih minimal 1 pos terlebih dahulu.');
      return;
    }

    const title = currentEvent ? currentEvent.title : 'Event Jelajah Orienteering';
    const lines = [
      `=== REKAPITULASI KODE QR POS CHECKPOINT ===`,
      `Event: ${title}`,
      `Total Pos Terpilih: ${printableCheckpoints.length} Pos`,
      `Total Poin: ${printableCheckpoints.reduce((acc, c) => acc + (c.points || 0), 0)} Poin`,
      `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`,
      `=============================================`,
      '',
    ];

    printableCheckpoints.forEach((cp) => {
      lines.push(`POS #${cp.number} - ${cp.name}`);
      lines.push(`  • Nilai: +${cp.points} Poin`);
      lines.push(`  • Nilai Barcode QR: ${cp.qrCodeValue}`);
      if (cp.locationName) lines.push(`  • Patokan Lapangan: ${cp.locationName}`);
      if (cp.clue) lines.push(`  • Clue / Petunjuk: ${cp.clue}`);
      lines.push('');
    });

    navigator.clipboard.writeText(lines.join('\n'));
    onShowToast(`Daftar ${printableCheckpoints.length} kode QR berhasil disalin ke clipboard!`);
  };

  const handleDownloadCsv = () => {
    if (printableCheckpoints.length === 0) {
      onShowToast('Pilih minimal 1 pos terlebih dahulu.');
      return;
    }

    const headers = ['Nomor_Pos', 'Nama_Pos', 'Poin', 'Kode_Barcode_QR', 'Patokan_Fisik', 'Petunjuk_Clue'];
    const rows = printableCheckpoints.map((cp) => [
      `#${cp.number}`,
      `"${cp.name.replace(/"/g, '""')}"`,
      cp.points,
      `"${cp.qrCodeValue}"`,
      `"${(cp.locationName || '').replace(/"/g, '""')}"`,
      `"${(cp.clue || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daftar_Kode_QR_Pos_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast(`Data rekapitulasi ${printableCheckpoints.length} pos berhasil diunduh (CSV).`);
  };

  // Grid styling for preview and print
  const getGridClasses = () => {
    switch (layoutColumns) {
      case 'grid-1':
        return 'grid-cols-1';
      case 'grid-2':
        return 'grid-cols-1 md:grid-cols-2';
      case 'grid-3':
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 'grid-4':
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
      default:
        return 'grid-cols-1 md:grid-cols-2';
    }
  };

  const getPrintGridClasses = () => {
    switch (layoutColumns) {
      case 'grid-1':
        return 'grid-cols-1';
      case 'grid-2':
        return 'grid-cols-2';
      case 'grid-3':
        return 'grid-cols-3';
      case 'grid-4':
        return 'grid-cols-4';
      default:
        return 'grid-cols-2';
    }
  };

  const eventTitle = currentEvent ? currentEvent.title : 'Jelajah Orienteering Resmi';

  return (
    <>
      {/* SCREEN INTERFACE MODAL */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#0b192c] text-white flex items-center justify-center shadow-md shadow-slate-900/20 shrink-0">
                <Printer className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                    Cetak Semua Kode QR Pos
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                    {printableCheckpoints.length} Pos Terpilih
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Total {printableCheckpoints.reduce((acc, c) => acc + (c.points || 0), 0)} Poin
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hasilkan lembar stiker dan kartu QR Code untuk seluruh pos sekaligus, siap dicetak ke printer fisik atau disimpan sebagai PDF.
                </p>
              </div>
            </div>

            {/* Quick Action Top */}
            <div className="flex items-center gap-2 self-end md:self-center">
              <button
                onClick={handlePrint}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-md shadow-orange-500/25 cursor-pointer transition-all flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Simpan PDF</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
                title="Tutup dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body: Sidebar Settings + Interactive Live Sheet Preview */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left Controls Panel */}
            <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 bg-white p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto shrink-0">
              
              {/* Checkpoint Selection Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
                    <span>Pilih Pos Dicetak ({selectedIds.size}/{checkpoints.length})</span>
                  </label>
                  <button
                    onClick={toggleSelectAll}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    {selectedIds.size === checkpoints.length ? 'Batal Semua' : 'Pilih Semua'}
                  </button>
                </div>

                {/* Filter Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nomor pos, nama, atau kode..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                {/* Checklist List */}
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-100 rounded-xl p-1.5 bg-slate-50/50">
                  {filteredCheckpoints.map((cp, idx) => {
                    const isSelected = selectedIds.has(cp.id);
                    return (
                      <div
                        key={`${cp.id}-${idx}`}
                        onClick={() => toggleCheckpoint(cp.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-white border border-orange-200 shadow-2xs font-semibold text-slate-900' 
                            : 'text-slate-500 hover:bg-white/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            #{cp.number}
                          </span>
                          <span className="truncate">{cp.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 shrink-0">
                          +{cp.points} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Layout Kolom Kertas */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-orange-600" />
                  <span>Tata Letak Stiker / Kertas</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setLayoutColumns('grid-2')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      layoutColumns === 'grid-2'
                        ? 'border-orange-500 bg-orange-50/60 font-bold text-orange-950 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-extrabold">2 Kolom (Standar)</div>
                    <div className="text-[10px] text-slate-500">4-6 pos per lembar A4</div>
                  </button>

                  <button
                    onClick={() => setLayoutColumns('grid-3')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      layoutColumns === 'grid-3'
                        ? 'border-orange-500 bg-orange-50/60 font-bold text-orange-950 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-extrabold">3 Kolom (Kompak)</div>
                    <div className="text-[10px] text-slate-500">9-12 pos per lembar A4</div>
                  </button>

                  <button
                    onClick={() => setLayoutColumns('grid-1')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      layoutColumns === 'grid-1'
                        ? 'border-orange-500 bg-orange-50/60 font-bold text-orange-950 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-extrabold">1 Kolom (Besar)</div>
                    <div className="text-[10px] text-slate-500">Plang pos pohon/outdoor</div>
                  </button>

                  <button
                    onClick={() => setLayoutColumns('grid-4')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      layoutColumns === 'grid-4'
                        ? 'border-orange-500 bg-orange-50/60 font-bold text-orange-950 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-extrabold">4 Kolom (Mini)</div>
                    <div className="text-[10px] text-slate-500">Label stiker barcode</div>
                  </button>
                </div>
              </div>

              {/* Tema Desain Stiker */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-orange-600" />
                  <span>Gaya Desain Stiker</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setThemeStyle('contrast')}
                    className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      themeStyle === 'contrast'
                        ? 'border-slate-900 bg-slate-900 text-white font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Kontras Hitam Putih
                    <span className="block text-[9px] opacity-75">Hemat Tinta & Tajam</span>
                  </button>
                  <button
                    onClick={() => setThemeStyle('color')}
                    className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      themeStyle === 'color'
                        ? 'border-orange-500 bg-orange-50 text-orange-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Warna Resmi
                    <span className="block text-[9px] opacity-75">Aksen Oranye & Biru</span>
                  </button>
                </div>
              </div>

              {/* Elemen Konten yang Ditampilkan */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-orange-600" />
                  <span>Elemen Pada Stiker</span>
                </label>

                <div className="space-y-1.5">
                  <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-700">Nama Acara & Logo Pos</span>
                    <input
                      type="checkbox"
                      checked={showEventName}
                      onChange={(e) => setShowEventName(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-700">Nilai Bobot Poin (+Pts)</span>
                    <input
                      type="checkbox"
                      checked={showPoints}
                      onChange={(e) => setShowPoints(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-700">Lokasi / Patokan Fisik</span>
                    <input
                      type="checkbox"
                      checked={showLocation}
                      onChange={(e) => setShowLocation(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div className="flex flex-col">
                      <span className="text-slate-700">Petunjuk Rute / Clue</span>
                      <span className="text-[10px] text-slate-400">Nonaktifkan jika clue rahasia</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showClue}
                      onChange={(e) => setShowClue(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-700">Teks Kode Barcode (Backup)</span>
                    <input
                      type="checkbox"
                      checked={showCodeText}
                      onChange={(e) => setShowCodeText(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-700">Panduan Scan Peserta</span>
                    <input
                      type="checkbox"
                      checked={showInstructions}
                      onChange={(e) => setShowInstructions(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <span className="text-slate-700">Garis Panduan Gunting Stiker</span>
                    <input
                      type="checkbox"
                      checked={showCutGuides}
                      onChange={(e) => setShowCutGuides(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Utility Export & Copy Actions */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Rekapitulasi Kode Teks</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Unduh Manifest Pos (CSV)</span>
                </button>
              </div>

              {/* Outdoor Organizer Tips */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Tips Lapangan Orienteering:</span>
                </div>
                <p className="leading-relaxed text-amber-800">
                  Gunakan kertas stiker vinyl anti-air atau lapisi stiker dengan lakban bening / laminasi sebelum ditempelkan di pohon/pos outdoor agar barcode tetap terbaca saat hujan atau lembap.
                </p>
              </div>
            </div>

            {/* Right Live Sheet Preview Area */}
            <div className="flex-1 bg-slate-100/80 p-4 sm:p-6 overflow-y-auto flex flex-col items-center">
              
              {/* Preview Banner */}
              <div className="w-full max-w-4xl mb-4 flex items-center justify-between text-xs text-slate-600 bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-orange-500" />
                  <span className="font-bold text-slate-800">Pratinjau Lembar Cetak Siap Print</span>
                  <span className="hidden sm:inline text-slate-400">• Tampilan persis sama saat dicetak di A4</span>
                </div>
                <div className="font-mono font-bold text-[11px] text-slate-500">
                  {printableCheckpoints.length} Stiker Aktif
                </div>
              </div>

              {/* Sheet Container (Simulating Paper Sheet) */}
              <div className="w-full max-w-4xl bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 space-y-6">
                
                {/* Paper Header (optional in preview) */}
                <div className="pb-4 border-b-2 border-slate-900 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Compass className="w-5 h-5 text-orange-600" />
                      <h2 className="font-black text-slate-900 text-lg uppercase tracking-wider">
                        {eventTitle}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Lembar Resmi QR Code Checkpoint • Jelajah Orienteering Competition
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="inline-block px-2.5 py-1 bg-slate-100 rounded-lg font-mono font-bold text-slate-700">
                      TOTAL {printableCheckpoints.length} POS
                    </span>
                  </div>
                </div>

                {isGenerating && (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Menghasilkan gambar kode QR resolusi tinggi untuk seluruh pos...
                  </div>
                )}

                {printableCheckpoints.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                    <Printer className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    Tidak ada pos checkpoint yang dipilih untuk dicetak. Centang pos pada menu di sebelah kiri.
                  </div>
                ) : (
                  /* Cards Grid */
                  <div className={`grid gap-4 sm:gap-5 ${getGridClasses()}`}>
                    {printableCheckpoints.map((cp, idx) => {
                      const qrUrl = qrMap[cp.id];
                      const isCompact = layoutColumns === 'grid-3' || layoutColumns === 'grid-4';

                      return (
                        <div
                          key={`${cp.id}-${idx}`}
                          className={`relative p-4 rounded-2xl flex flex-col items-center justify-between text-center transition-all print-card-break-avoid ${
                            showCutGuides 
                              ? 'border-2 border-dashed border-slate-300 hover:border-orange-400' 
                              : 'border-2 border-slate-900'
                          } ${
                            themeStyle === 'contrast'
                              ? 'bg-white text-slate-900'
                              : 'bg-gradient-to-b from-orange-50/40 via-white to-slate-50/60'
                          }`}
                        >
                          {/* Cut Guide Scissors Marker */}
                          {showCutGuides && (
                            <div className="absolute -top-3 left-4 bg-white px-1.5 text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                              <Scissors className="w-2.5 h-2.5" />
                              <span>Gunting disini</span>
                            </div>
                          )}

                          {/* Top Header Card */}
                          <div className="w-full pb-2 border-b border-slate-200 flex items-center justify-between gap-1">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-950 text-white font-mono text-[11px] font-black tracking-wide">
                              POS #{cp.number}
                            </span>
                            
                            {showEventName && !isCompact && (
                              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider truncate max-w-[120px]">
                                {eventTitle}
                              </span>
                            )}

                            {showPoints && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                +{cp.points} POIN
                              </span>
                            )}
                          </div>

                          {/* Checkpoint Name */}
                          <div className="my-2.5 w-full">
                            <h4 className="font-black text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
                              {cp.name}
                            </h4>

                            {showLocation && (
                              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                                <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                                <span className="truncate max-w-[220px]">
                                  {cp.locationName || <span className="italic text-slate-400">Titik Bebas</span>}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* QR Code Container */}
                          <div className="my-2 p-2.5 bg-white border-2 border-slate-900 rounded-2xl shadow-xs">
                            {qrUrl ? (
                              <img
                                src={qrUrl}
                                alt={`QR Pos ${cp.number}`}
                                className={
                                  layoutColumns === 'grid-1' 
                                    ? 'w-48 h-48 object-contain' 
                                    : layoutColumns === 'grid-3' 
                                      ? 'w-24 h-24 object-contain' 
                                      : layoutColumns === 'grid-4'
                                        ? 'w-20 h-20 object-contain'
                                        : 'w-32 h-32 sm:w-36 sm:h-36 object-contain'
                                }
                              />
                            ) : (
                              <div className="w-28 h-28 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                                Memuat QR...
                              </div>
                            )}
                          </div>

                          {/* Backup Code Text */}
                          {showCodeText && (
                            <div className="mt-1 font-mono text-[11px] font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              {cp.qrCodeValue}
                            </div>
                          )}

                          {/* Clue Text (if toggled on) */}
                          {showClue && cp.clue && (
                            <div className="mt-2 w-full p-2 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-600 italic">
                              "{cp.clue}"
                            </div>
                          )}

                          {/* Scan Instruction Footer */}
                          {showInstructions && (
                            <div className="mt-3 pt-2 border-t border-slate-100 w-full text-center">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Scan dengan scanner aplikasi Jelajah
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500">
              <span className="font-bold text-slate-700">{printableCheckpoints.length} Pos siap dicetak</span>
              <span className="mx-2">•</span>
              <span>Tata letak: {layoutColumns.replace('grid-', '')} kolom ({themeStyle === 'contrast' ? 'Monokrom' : 'Berwarna'})</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-md shadow-orange-500/25 cursor-pointer transition-all flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Stiker Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED PRINT PORTAL (VISIBLE ONLY ON @MEDIA PRINT) */}
      <div id="qr-batch-print-portal" className="hidden">
        <div className="p-4 bg-white text-black font-sans">
          
          {/* Header Print Document */}
          <div className="pb-3 mb-4 border-b-2 border-black flex items-center justify-between">
            <div>
              <h1 className="text-base font-black uppercase tracking-wider text-black">
                {eventTitle}
              </h1>
              <p className="text-[10px] text-gray-700 font-medium">
                Lembar Stiker Resmi Checkpoint • Dicetak pada {new Date().toLocaleDateString('id-ID')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-black uppercase tracking-wider font-mono">
                {printableCheckpoints.length} CHECKPOINT
              </div>
              <div className="text-[9px] text-gray-600">
                Total {printableCheckpoints.reduce((acc, c) => acc + (c.points || 0), 0)} Poin
              </div>
            </div>
          </div>

          {/* Sticker Grid for Print */}
          <div className={`grid gap-4 ${getPrintGridClasses()}`}>
            {printableCheckpoints.map((cp, idx) => {
              const qrUrl = qrMap[cp.id];
              const isCompact = layoutColumns === 'grid-3' || layoutColumns === 'grid-4';

              return (
                <div
                  key={`${cp.id}-${idx}`}
                  className={`relative p-3.5 rounded-xl flex flex-col items-center justify-between text-center print-card-break-avoid bg-white ${
                    showCutGuides 
                      ? 'border border-dashed border-gray-400' 
                      : 'border-2 border-black'
                  }`}
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  {/* Top Bar */}
                  <div className="w-full pb-1.5 border-b border-gray-300 flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 rounded-full bg-black text-white font-mono text-[10px] font-black">
                      POS #{cp.number}
                    </span>
                    
                    {showEventName && !isCompact && (
                      <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider truncate max-w-[130px]">
                        {eventTitle}
                      </span>
                    )}

                    {showPoints && (
                      <span className="px-1.5 py-0.5 rounded border border-gray-300 text-black text-[9px] font-black">
                        +{cp.points} PTS
                      </span>
                    )}
                  </div>

                  {/* Title & Location */}
                  <div className="my-2 w-full">
                    <h4 className="font-black text-black text-xs leading-snug line-clamp-2">
                      {cp.name}
                    </h4>
                    {showLocation && cp.locationName && (
                      <p className="text-[9px] text-gray-600 mt-0.5 truncate">
                        Patokan: {cp.locationName}
                      </p>
                    )}
                  </div>

                  {/* High Quality QR Image */}
                  <div className="my-1.5 p-1.5 bg-white border-2 border-black rounded-lg">
                    {qrUrl ? (
                      <img
                        src={qrUrl}
                        alt={`QR Pos #${cp.number}`}
                        className={
                          layoutColumns === 'grid-1' 
                            ? 'w-48 h-48 object-contain' 
                            : layoutColumns === 'grid-3' 
                              ? 'w-24 h-24 object-contain' 
                              : layoutColumns === 'grid-4'
                                ? 'w-20 h-20 object-contain'
                                : 'w-32 h-32 object-contain'
                        }
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 flex items-center justify-center text-[9px]">
                        QR Code
                      </div>
                    )}
                  </div>

                  {/* Code string */}
                  {showCodeText && (
                    <div className="mt-1 font-mono text-[10px] font-black text-black px-2 py-0.5 rounded bg-gray-100 border border-gray-300">
                      {cp.qrCodeValue}
                    </div>
                  )}

                  {/* Optional Clue */}
                  {showClue && cp.clue && (
                    <div className="mt-1.5 w-full p-1.5 bg-gray-50 border border-gray-200 text-[9px] italic text-gray-700">
                      "{cp.clue}"
                    </div>
                  )}

                  {/* Footer instruction */}
                  {showInstructions && (
                    <div className="mt-2 pt-1 border-t border-gray-200 w-full text-center">
                      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">
                        Scan dengan kamera aplikasi Jelajah
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
