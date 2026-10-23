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
  ShieldCheck, 
  Compass,
  Users,
  Check,
  Award,
  AlertTriangle
} from 'lucide-react';
import { Team, EventItem } from '../../types';

interface BatchBibPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  currentEvent?: EventItem;
  onShowToast: (msg: string) => void;
}

export const BatchBibPrintModal: React.FC<BatchBibPrintModalProps> = ({
  isOpen,
  onClose,
  teams,
  currentEvent,
  onShowToast,
}) => {
  // Selected team IDs to print
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Customization Options
  const [layoutMode, setLayoutMode] = useState<'2_per_page' | '4_per_page' | '1_per_page'>('2_per_page');
  const [colorStyle, setColorStyle] = useState<'color' | 'contrast'>('color');
  const [showMembers, setShowMembers] = useState(true);
  const [showPin, setShowPin] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [showCutGuides, setShowCutGuides] = useState(true);
  const [emergencyPhone, setEmergencyPhone] = useState('0812-9988-7766 (Posko Medis)');

  // Cached QR Code Data URLs
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Initialize selected teams when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(teams.map((t) => t.id));
    }
  }, [isOpen, teams]);

  // Generate QR Code data URLs for each team
  useEffect(() => {
    if (!isOpen || teams.length === 0) return;

    let isMounted = true;
    setIsGeneratingQr(true);

    const generateAll = async () => {
      const generated: Record<string, string> = {};
      for (const t of teams) {
        try {
          const qrText = `BIB:${t.bibNumber}|PIN:${(t as any).pinCode || '****'}|TIM:${t.name}`;
          const url = await QRCode.toDataURL(qrText, {
            width: 320,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
          });
          generated[t.id] = url;
        } catch (err) {
          console.error('Error generating QR for team:', t.id, err);
        }
      }

      if (isMounted) {
        setQrCodeUrls(generated);
        setIsGeneratingQr(false);
      }
    };

    generateAll();

    return () => {
      isMounted = false;
    };
  }, [isOpen, teams]);

  // Filtered teams list
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const matchSearch = 
        t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        t.bibNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
        t.category.toLowerCase().includes(searchFilter.toLowerCase());
      const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [teams, searchFilter, categoryFilter]);

  // Selected teams to render
  const teamsToPrint = useMemo(() => {
    return teams.filter((t) => selectedIds.includes(t.id));
  }, [teams, selectedIds]);

  const allSelected = filteredTeams.length > 0 && filteredTeams.every((t) => selectedIds.includes(t.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      const filteredSet = new Set(filteredTeams.map((t) => t.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const newSet = new Set(selectedIds);
      filteredTeams.forEach((t) => newSet.add(t.id));
      setSelectedIds(Array.from(newSet));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Categories list for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    teams.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [teams]);

  // Trigger Print
  const handlePrintNow = () => {
    if (teamsToPrint.length === 0) {
      onShowToast('Pilih minimal 1 tim untuk dicetak.');
      return;
    }

    document.body.classList.add('printing-batch-bib');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing-batch-bib');
    }, 150);
  };

  // Copy manifest text
  const handleCopyManifest = () => {
    if (teamsToPrint.length === 0) return;
    const text = teamsToPrint
      .map((t, idx) => `${idx + 1}. [BIB ${t.bibNumber}] ${t.name} (PIN: ${(t as any).pinCode || '****'}) - ${t.category} - Anggota: ${t.members.map(m => m.name).join(', ')}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    onShowToast(`Rekapitulasi nomor BIB ${teamsToPrint.length} tim berhasil disalin!`);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Download CSV
  const handleDownloadCsv = () => {
    if (teamsToPrint.length === 0) return;
    const headers = ['No', 'Nomor_BIB', 'Nama_Tim', 'Kategori', 'PIN_Masuk', 'Jumlah_Anggota', 'Ketua_Tim', 'Daftar_Anggota'];
    const rows = teamsToPrint.map((t, idx) => [
      idx + 1,
      `"${t.bibNumber}"`,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.category.replace(/"/g, '""')}"`,
      `"${(t as any).pinCode || '****'}"`,
      t.members.length,
      `"${(t.members[0]?.name || '').replace(/"/g, '""')}"`,
      `"${t.members.map(m => `${m.name} (${m.role})`).join('; ').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Manifest_Nomor_BIB_Peserta_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('File Manifest BIB (.CSV) berhasil diunduh!');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 1. INTERACTIVE CONFIGURATION MODAL (Hidden in print) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
        <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
          {/* Modal Header */}
          <div className="bg-[#0b192c] text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-md">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base sm:text-lg text-white">
                    Cetak Nomor BIB & Kartu Peserta Massal
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-400 text-slate-950 uppercase">
                    SIAP CETAK A4
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {currentEvent?.title || 'Orienteering & Amazing Race'} • Terpilih {teamsToPrint.length} dari {teams.length} Tim
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body: Left Controls, Right Live Preview */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0 bg-slate-50">
            {/* LEFT PANEL: FILTERS & SETTINGS (4 Cols) */}
            <div className="lg:col-span-4 p-5 space-y-5 border-r border-slate-200 bg-white overflow-y-auto">
              {/* Box 1: Team Selection & Search */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-orange-500" />
                    <span>Pilih Tim Peserta</span>
                  </h4>
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer flex items-center gap-1"
                  >
                    {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    <span>{allSelected ? 'Batal Semua' : 'Pilih Semua'}</span>
                  </button>
                </div>

                {/* Search & Filter inputs */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama tim, BIB, divisi..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  {categories.length > 1 && (
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                    >
                      <option value="all">Semua Kategori ({teams.length} Tim)</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Team selection pills list */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                  {filteredTeams.map((t) => {
                    const isChecked = selectedIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleSelectOne(t.id)}
                        className={`p-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-orange-50/80 border-orange-300 text-slate-900 font-semibold' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.color}`} />
                          <div className="truncate">
                            <span className="font-mono font-bold text-orange-600 mr-1.5">{t.bibNumber}</span>
                            <span className="text-slate-800 font-medium truncate">{t.name}</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-orange-500 shrink-0 ml-2 pointer-events-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Box 2: Layout & Format */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Grid className="w-4 h-4 text-orange-500" />
                  <span>Format Lembar Kertas A4</span>
                </h4>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setLayoutMode('2_per_page')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      layoutMode === '2_per_page'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 text-xs'
                    }`}
                  >
                    <div className="font-extrabold text-sm">2 / Lembar</div>
                    <div className="text-[10px] opacity-80">Tag Dada Standar</div>
                  </button>

                  <button
                    onClick={() => setLayoutMode('4_per_page')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      layoutMode === '4_per_page'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 text-xs'
                    }`}
                  >
                    <div className="font-extrabold text-sm">4 / Lembar</div>
                    <div className="text-[10px] opacity-80">Badge Kompak</div>
                  </button>

                  <button
                    onClick={() => setLayoutMode('1_per_page')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      layoutMode === '1_per_page'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 text-xs'
                    }`}
                  >
                    <div className="font-extrabold text-sm">1 / Lembar</div>
                    <div className="text-[10px] opacity-80">Ukuran Jumbo</div>
                  </button>
                </div>
              </div>

              {/* Box 3: Styling & Ink Saver */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-orange-500" />
                  <span>Gaya & Pilihan Desain</span>
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setColorStyle('color')}
                    className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      colorStyle === 'color'
                        ? 'bg-orange-50 border-orange-400 text-orange-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    🌈 Desain Resmi Full-Color
                  </button>
                  <button
                    onClick={() => setColorStyle('contrast')}
                    className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      colorStyle === 'contrast'
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    ⚫ Monokrom (Hemat Tinta)
                  </button>
                </div>

                {/* Toggles */}
                <div className="space-y-2 pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={showMembers}
                      onChange={(e) => setShowMembers(e.target.checked)}
                      className="rounded text-orange-500"
                    />
                    <span>Sertakan daftar nama anggota regu</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={showPin}
                      onChange={(e) => setShowPin(e.target.checked)}
                      className="rounded text-orange-500"
                    />
                    <span>Cetak kode PIN login HP</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={showQr}
                      onChange={(e) => setShowQr(e.target.checked)}
                      className="rounded text-orange-500"
                    />
                    <span>Sertakan QR Code login cepat</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={showCutGuides}
                      onChange={(e) => setShowCutGuides(e.target.checked)}
                      className="rounded text-orange-500"
                    />
                    <span>Garis bantu potong gunting (Cut lines)</span>
                  </label>
                </div>

                {/* Emergency Contact */}
                <div className="pt-2">
                  <label className="font-bold text-slate-700 block text-[11px] mb-1">
                    Kontak Darurat / Panitia Medis pada Tag:
                  </label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="Contoh: 0812-9988-7766 (Posko Medis)"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: LIVE A4 PRINT PREVIEW (8 Cols) */}
            <div className="lg:col-span-8 p-5 overflow-y-auto flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-orange-500" />
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                    Pratinjau Lembaran Cetak (A4 Preview)
                  </h4>
                  <span className="text-xs text-slate-500">
                    ({teamsToPrint.length} Kartu BIB Terpilih)
                  </span>
                </div>
                {isGeneratingQr && (
                  <span className="text-xs text-orange-600 font-semibold animate-pulse">
                    Membuat Barcode...
                  </span>
                )}
              </div>

              {/* Simulated Paper Sheets */}
              <div className="flex-1 bg-slate-200/80 rounded-2xl p-4 sm:p-6 overflow-y-auto border border-slate-300/70 shadow-inner flex justify-center">
                {teamsToPrint.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 space-y-2">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="font-bold text-sm">Belum ada tim yang dipilih untuk dicetak.</p>
                    <p className="text-xs">Centang tim pada panel sebelah kiri untuk menampilkan kartu.</p>
                  </div>
                ) : (
                  <div className="w-full max-w-2xl bg-white p-5 sm:p-7 rounded-xl shadow-lg border border-slate-300 space-y-6">
                    <div className="text-center pb-3 border-b border-dashed border-slate-300">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {currentEvent?.title || 'JELAJAH ORIENTEERING & AMAZING RACE'} • KARTU DADA RESMI
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Siap dicetak di kertas HVS / Art Paper / Stiker A4, lalu disematkan peniti atau tali lanyard.
                      </div>
                    </div>

                    {/* Grid of Bib Cards */}
                    <div className={`grid gap-4 ${
                      layoutMode === '2_per_page' 
                        ? 'grid-cols-1' 
                        : layoutMode === '4_per_page' 
                        ? 'grid-cols-1 sm:grid-cols-2' 
                        : 'grid-cols-1'
                    }`}>
                      {teamsToPrint.map((t) => (
                        <div
                          key={t.id}
                          className={`rounded-2xl border-2 overflow-hidden flex flex-col justify-between transition-all ${
                            showCutGuides ? 'border-dashed' : 'border-solid'
                          } ${
                            colorStyle === 'color' 
                              ? 'border-slate-800 bg-white shadow-sm' 
                              : 'border-black bg-white text-black'
                          }`}
                        >
                          {/* Top Header of the BIB Tag */}
                          <div className={`px-4 py-2 flex items-center justify-between border-b ${
                            colorStyle === 'color' 
                              ? 'bg-[#0b192c] text-white border-slate-800' 
                              : 'bg-black text-white border-black'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Compass className="w-4 h-4 text-orange-400" />
                              <span className="font-extrabold text-[11px] uppercase tracking-wider">
                                {currentEvent?.title ? currentEvent.title.slice(0, 26) : 'ORIENTEERING RACE'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500 text-white uppercase">
                              {t.category}
                            </span>
                          </div>

                          {/* Big BIB Number and Team info */}
                          <div className="p-4 flex items-center justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                                  colorStyle === 'color' ? 'text-slate-900' : 'text-black'
                                }`}>
                                  {t.bibNumber}
                                </span>
                              </div>
                              <h5 className="font-extrabold text-base text-slate-900 leading-tight">
                                {t.name}
                              </h5>
                              {showPin && (
                                <div className="text-xs text-slate-600 font-mono">
                                  PIN HP: <strong className="text-slate-900 font-bold">{(t as any).pinCode || '****'}</strong>
                                </div>
                              )}
                            </div>

                            {/* QR Code */}
                            {showQr && qrCodeUrls[t.id] && (
                              <div className="flex flex-col items-center shrink-0">
                                <img
                                  src={qrCodeUrls[t.id]}
                                  alt={`QR ${t.bibNumber}`}
                                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain border border-slate-200 rounded-lg p-0.5 bg-white"
                                />
                                <span className="text-[9px] font-mono font-bold text-slate-500 mt-1">
                                  SCAN LOGIN HP
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Member roster */}
                          {showMembers && t.members.length > 0 && (
                            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-700">
                              <span className="font-bold text-slate-900 mr-1">Personel:</span>
                              {t.members.map((m, idx) => (
                                <span key={idx} className="mr-2">
                                  {m.name} <span className="text-slate-400">({m.role})</span>
                                  {idx < t.members.length - 1 ? ',' : ''}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Footer Tag */}
                          <div className="px-4 py-1.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                            <span>🚨 Medis: {emergencyPhone}</span>
                            <span className="font-mono">KARTU DADA RESMI PESERTA</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyManifest}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Tersalin!' : 'Salin Rekap BIB'}</span>
              </button>

              <button
                onClick={handleDownloadCsv}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Manifest (CSV)</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>

              <button
                onClick={handlePrintNow}
                disabled={teamsToPrint.length === 0}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar BIB Sekarang ({teamsToPrint.length} Tim)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ISOLATED PRINT PORTAL (Active during window.print()) */}
      <div id="bib-batch-print-portal" className="hidden">
        <div style={{ padding: '4mm', width: '100%', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '6mm', borderBottom: '1px solid #000', paddingBottom: '3mm' }}>
            <h2 style={{ fontSize: '16pt', fontWeight: 'bold', margin: '0 0 2mm 0', textTransform: 'uppercase' }}>
              {currentEvent?.title || 'ORIENTEERING & AMAZING RACE'}
            </h2>
            <div style={{ fontSize: '9pt', color: '#333' }}>
              KARTU DADA / NOMOR BIB RESMI PESERTA • TANGGAL: {currentEvent?.date || 'HARI PERLOMBAAN'} • TOTAL {teamsToPrint.length} TIM
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: layoutMode === '4_per_page' ? 'repeat(2, 1fr)' : '1fr',
              gap: '6mm',
            }}
          >
            {teamsToPrint.map((t) => (
              <div
                key={t.id}
                style={{
                  border: showCutGuides ? '2px dashed #000000' : '2px solid #000000',
                  borderRadius: '10px',
                  padding: '6mm',
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                  backgroundColor: '#ffffff',
                  marginBottom: '4mm',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Header card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '3mm', marginBottom: '4mm' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase' }}>
                    {currentEvent?.title || 'JELAJAH RACE'}
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '10pt', background: '#000', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>
                    {t.category}
                  </div>
                </div>

                {/* Big BIB and QR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4mm' }}>
                  <div>
                    <div style={{ fontSize: '42pt', fontWeight: '900', fontFamily: 'monospace', lineHeight: 1 }}>
                      {t.bibNumber}
                    </div>
                    <div style={{ fontSize: '14pt', fontWeight: 'bold', marginTop: '2mm' }}>
                      {t.name}
                    </div>
                    {showPin && (
                      <div style={{ fontSize: '11pt', fontFamily: 'monospace', marginTop: '1mm' }}>
                        PIN LOGIN: <strong>{(t as any).pinCode || '****'}</strong>
                      </div>
                    )}
                  </div>

                  {showQr && qrCodeUrls[t.id] && (
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={qrCodeUrls[t.id]}
                        alt={t.bibNumber}
                        style={{ width: '90px', height: '90px', border: '1px solid #000', borderRadius: '6px' }}
                      />
                      <div style={{ fontSize: '7pt', fontFamily: 'monospace', marginTop: '1mm', fontWeight: 'bold' }}>
                        SCAN LOGIN HP
                      </div>
                    </div>
                  )}
                </div>

                {/* Personel */}
                {showMembers && (
                  <div style={{ borderTop: '1px solid #ccc', paddingTop: '2mm', fontSize: '9pt', color: '#222', marginBottom: '2mm' }}>
                    <strong>Anggota: </strong>
                    {t.members.map((m) => `${m.name} (${m.role})`).join(', ')}
                  </div>
                )}

                {/* Footer Tag */}
                <div style={{ borderTop: '1px solid #000', paddingTop: '2mm', display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#333' }}>
                  <span>🚨 Posko Medis: {emergencyPhone}</span>
                  <span>GUNTING SESUAI GARIS BANTU</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
