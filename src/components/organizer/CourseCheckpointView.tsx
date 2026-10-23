import React, { useState } from 'react';
import { 
  MapPin, 
  QrCode, 
  Plus, 
  HelpCircle, 
  Camera, 
  CheckCircle, 
  Lock, 
  Sparkles, 
  ExternalLink,
  Eye,
  Download,
  Copy,
  Printer,
  Grid,
  List,
  CheckCircle2,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Award,
  SlidersHorizontal,
  X,
  Compass,
  Navigation,
  Palette
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { Checkpoint } from '../../types';
import { QrCodeGeneratorModal } from '../common/QrCodeGeneratorModal';
import { CreateCheckpointModal } from './CreateCheckpointModal';
import { EditCheckpointModal } from './EditCheckpointModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { CheckpointQrThumbnail } from '../common/CheckpointQrThumbnail';
import { BatchQrPrintModal } from './BatchQrPrintModal';
import { MapLocationPickerModal } from './MapLocationPickerModal';
import { InteractiveCheckpointMap } from './InteractiveCheckpointMap';
import { MarkerGeneratorModal } from './MarkerGeneratorModal';

interface CourseCheckpointViewProps {
  onShowToast: (msg: string) => void;
}

export const CourseCheckpointView: React.FC<CourseCheckpointViewProps> = ({ onShowToast }) => {
  const { 
    checkpoints, 
    createCheckpoint, 
    updateCheckpoint, 
    deleteCheckpoint,
    batchUpdateCheckpointPoints,
    events,
    selectedEventId
  } = useRace();

  const [selectedQr, setSelectedQr] = useState<Checkpoint | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [deletingCheckpoint, setDeletingCheckpoint] = useState<Checkpoint | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchPrintModalOpen, setBatchPrintModalOpen] = useState(false);
  const [batchPointsValue, setBatchPointsValue] = useState<number>(100);
  const [viewMode, setViewMode] = useState<'list' | 'qr_gallery' | 'interactive_map'>('list');
  const [markerGeneratorOpen, setMarkerGeneratorOpen] = useState(false);
  const [targetCpForMarker, setTargetCpForMarker] = useState<Checkpoint | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [pendingLocationName, setPendingLocationName] = useState<string | undefined>(undefined);

  const currentEvent = events.find((e) => e.id === selectedEventId) || (events.length > 0 ? events[0] : null);

  const getChallengeBadge = (type: string) => {
    switch (type) {
      case 'qr_only':
        return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">Scan QR Saja</span>;
      case 'photo':
        return <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">Foto Kelompok</span>;
      case 'riddle':
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Teka-Teki Sandi</span>;
      case 'physical_game':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">Permainan Fisik</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold">Tantangan Pos</span>;
    }
  };

  const handleCopyCode = (val: string, name: string) => {
    navigator.clipboard.writeText(val);
    onShowToast(`Nilai barcode "${val}" untuk ${name} berhasil disalin ke clipboard.`);
  };

  const handlePrintAll = () => {
    setBatchPrintModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingCheckpoint) {
      const name = deletingCheckpoint.name;
      deleteCheckpoint(deletingCheckpoint.id);
      onShowToast(`Pos "${name}" berhasil dihapus dari rangkaian rute.`);
      setDeletingCheckpoint(null);
    }
  };

  const handleBatchUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    batchUpdateCheckpointPoints(batchPointsValue);
    onShowToast(`Seluruh nilai pos (${checkpoints.length} pos) diatur menjadi ${batchPointsValue} Poin.`);
    setBatchModalOpen(false);
  };

  const totalPointsAll = checkpoints.reduce((acc, c) => acc + (c.points || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0b192c]">Course & Checkpoint</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {checkpoints.length} POS AKTIF
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
              TOTAL {totalPointsAll} POIN
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola pos kontrol, cetak semua kode QR pos sekaligus, atur bobot nilai poin, dan hapus pos perlombaan.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Custom Marker Icon Generator Button */}
          <button
            onClick={() => {
              setTargetCpForMarker(null);
              setMarkerGeneratorOpen(true);
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Rancang ikon dan warna penanda kustom untuk pos-pos di peta interaktif"
          >
            <Palette className="w-3.5 h-3.5 text-amber-300" />
            <span>Generator Marker Kustom</span>
          </button>

          {/* Quick Batch Points button */}
          <button
            onClick={() => setBatchModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200"
            title="Ubah nilai poin seluruh pos sekaligus"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
            <span>Atur Nilai Semua Pos</span>
          </button>

          {/* Dedicated Cetak Semua QR Pos Button */}
          <button
            onClick={() => setBatchPrintModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
            title="Hasilkan lembar stiker dan cetak semua kode QR pos secara sekaligus"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Semua QR Pos ({checkpoints.length})</span>
          </button>

          {/* View mode toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'list' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Daftar Detail</span>
            </button>
            <button
              onClick={() => setViewMode('qr_gallery')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'qr_gallery' 
                  ? 'bg-orange-500 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Galeri Stiker QR ({checkpoints.length})</span>
            </button>
            <button
              onClick={() => setViewMode('interactive_map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'interactive_map' 
                  ? 'bg-orange-500 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Peta Interaktif Pos</span>
            </button>
          </div>

          <button
            onClick={() => setMapPickerOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-slate-950 rounded-xl text-xs font-extrabold shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
            title="Klik titik mana saja pada peta untuk menambah pos tanpa harus berada di lokasi fisik"
          >
            <Compass className="w-4 h-4 text-slate-950" />
            <span>Tambah Pos di Peta</span>
          </button>

          <button
            onClick={() => {
              setPendingCoords(undefined);
              setPendingLocationName(undefined);
              setCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-[#0b192c] hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 text-orange-400" />
            <span>Tambah Pos Manual</span>
          </button>
        </div>
      </div>

      {/* Demonstration Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-orange-500/30 shadow-md">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/30">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Cetak & Hasil QR Code Otomatis Tiap Checkpoint</h3>
              <span className="px-2 py-0.2 rounded text-[10px] font-extrabold bg-orange-500/30 text-orange-300 border border-orange-500/40">
                Auto Generated
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Setiap pos yang dibuat otomatis menghasilkan gambar QR Code dummy asli beresolusi tinggi. Anda dapat langsung mencetak semua kode QR pos secara serentak ke kertas stiker A4 atau PDF.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => {
              if (checkpoints.length > 0) setSelectedQr(checkpoints[0]);
            }}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-orange-400" />
            <span>Pratinjau Pos #1</span>
          </button>
          
          <button
            onClick={() => setBatchPrintModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Semua QR Pos</span>
          </button>

          {viewMode === 'list' && (
            <button
              onClick={() => setViewMode('qr_gallery')}
              className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Lihat Stiker</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: LIST WITH INTEGRATED QR DUMMY PREVIEW AND ACTIONS */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {checkpoints.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">Belum Ada Pos Checkpoint</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Tambahkan pos kontrol rute pertama Anda untuk memulai perlombaan.
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pos Baru</span>
              </button>
            </div>
          ) : (
            checkpoints.map((cp, index) => (
              <div 
                key={`${cp.id}-${index}`}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:border-orange-300 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left: Info & Description */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#0b192c] text-white flex flex-col items-center justify-center font-bold shrink-0">
                      <span className="text-[9px] text-orange-400 uppercase leading-none">POS</span>
                      <span className="text-sm leading-none mt-0.5">{cp.number}</span>
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{cp.name}</h3>
                        {getChallengeBadge(cp.challengeType)}
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                          <Award className="w-3 h-3 text-emerald-600" />
                          +{cp.points} Poin
                        </span>
                        {cp.isMandatory && (
                          <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold border border-red-200">
                            Wajib
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        <span>{cp.locationName || <span className="text-slate-400 italic">Tanpa patokan fisik khusus</span>}</span>
                        {cp.coordinates && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-slate-400">({cp.coordinates.lat}, {cp.coordinates.lng})</span>
                          </>
                        )}
                      </p>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="text-slate-800 font-semibold">Petunjuk yang Diberikan ke Peserta:</div>
                        <div className="text-slate-600 italic">
                          {cp.clue ? `"${cp.clue}"` : <span className="text-slate-400 not-italic">(Tidak ada petunjuk / clue khusus)</span>}
                        </div>
                        {cp.challengeDescription && (
                          <div className="pt-1 text-slate-700 font-medium">
                            <strong>Tugas di Pos:</strong> {cp.challengeDescription}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Generated QR Dummy Image & Quick Actions */}
                  <div className="flex sm:flex-row lg:flex-col items-center justify-between sm:justify-end gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 bg-slate-50/70 p-3 rounded-xl border">
                    {/* Generated QR Code Thumbnail */}
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => setSelectedQr(cp)}
                        className="cursor-pointer group relative p-1.5 bg-white rounded-xl border-2 border-slate-300 hover:border-orange-500 transition-all shadow-xs"
                        title="Klik untuk perbesar dan unduh gambar QR dummy ini"
                      >
                        <CheckpointQrThumbnail
                          value={cp.qrCodeValue}
                          size={76}
                          className="rounded-lg group-hover:scale-105 transition-transform"
                          alt={`QR Dummy ${cp.name}`}
                        />
                        <div className="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      <div className="space-y-1 text-left sm:text-left lg:text-center">
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                            QR Dummy Siap
                          </span>
                        </div>
                        <div className="font-mono text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-[130px]">
                          {cp.qrCodeValue}
                        </div>
                        <button
                          onClick={() => handleCopyCode(cp.qrCodeValue, cp.name)}
                          className="text-[10px] text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Salin Kode</span>
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons: Edit, Delete, View QR */}
                    <div className="flex items-center gap-1.5 w-full justify-end flex-wrap">
                      <button
                        onClick={() => {
                          setTargetCpForMarker(cp);
                          setMarkerGeneratorOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Atur ikon dan warna penanda kustom pos ini pada peta"
                      >
                        <Palette className="w-3.5 h-3.5 text-purple-600" />
                        <span>Marker Kustom</span>
                      </button>

                      <button
                        onClick={() => setEditingCheckpoint(cp)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                        title="Ubah nilai poin pos, lokasi, misi, atau kode QR"
                      >
                        <Pencil className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit Pos & Nilai</span>
                      </button>

                      <button
                        onClick={() => setSelectedQr(cp)}
                        className="px-2.5 py-1.5 bg-[#0b192c] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                        title="Lihat stiker QR ukuran penuh"
                      >
                        <Eye className="w-3.5 h-3.5 text-orange-400" />
                        <span>Lihat QR</span>
                      </button>

                      <button
                        onClick={() => setDeletingCheckpoint(cp)}
                        className="p-1.5 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg text-xs cursor-pointer transition-colors"
                        title="Hapus pos checkpoint ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW MODE 2: QR DUMMY GALLERY / STICKER SHEET PREVIEW */}
      {viewMode === 'qr_gallery' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-slate-800">
                Pratinjau Lembar Stiker QR Code Dummy ({checkpoints.length} Pos Lomba)
              </span>
            </div>
            <p className="text-slate-500 hidden sm:block">
              Setiap stiker siap dicetak pada kertas A4 / stiker vynil tahan air untuk dipasang di pohon, pos ronda, atau patokan rute.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {checkpoints.map((cp) => (
              <div
                key={cp.id}
                className="bg-white rounded-2xl p-5 border-2 border-slate-200 hover:border-orange-400 transition-all shadow-sm flex flex-col justify-between text-center relative group"
              >
                {/* Header Sticker */}
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0b192c] text-white text-[11px] font-extrabold tracking-wide">
                    POS #{cp.number}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      +{cp.points} POIN
                    </span>
                    <button
                      onClick={() => setEditingCheckpoint(cp)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Edit nilai poin pos ini"
                    >
                      <Pencil className="w-3 h-3 text-blue-600" />
                    </button>
                    <button
                      onClick={() => setDeletingCheckpoint(cp)}
                      className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                      title="Hapus pos ini"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Title & Location */}
                <div className="my-3 space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-base line-clamp-1">{cp.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3 text-orange-500" />
                    <span className="truncate max-w-[200px]">{cp.locationName || 'Lokasi Terbuka (Tanpa Patokan)'}</span>
                  </p>
                </div>

                {/* Big Generated QR Code Dummy Image */}
                <div className="py-2 flex flex-col items-center justify-center">
                  <div 
                    onClick={() => setSelectedQr(cp)}
                    className="p-3 bg-white border-4 border-[#0b192c] rounded-2xl shadow-md cursor-pointer hover:scale-102 transition-transform"
                    title="Klik untuk perbesar atau cetak lembar ini"
                  >
                    <CheckpointQrThumbnail
                      value={cp.qrCodeValue}
                      size={140}
                      className="rounded-lg mx-auto"
                      alt={`QR Code ${cp.name}`}
                    />
                  </div>
                  <div className="mt-2 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                    {cp.qrCodeValue}
                  </div>
                </div>

                {/* Clue Hint Snippet */}
                <div className="mt-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-[11px] text-slate-600 italic line-clamp-2">
                  {cp.clue ? `"${cp.clue}"` : <span className="text-slate-400 not-italic">(Tanpa petunjuk / clue khusus)</span>}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleCopyCode(cp.qrCodeValue, cp.name)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    title="Salin Nilai Kode QR"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingCheckpoint(cp)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    title="Edit Pos & Nilai"
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                  <button
                    onClick={() => setSelectedQr(cp)}
                    className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Perbesar & Cetak</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: INTERACTIVE CHECKPOINT MAP WITH DIRECT CLICK & DRAG TO RACECONTEXT */}
      {viewMode === 'interactive_map' && (
        <InteractiveCheckpointMap
          checkpoints={checkpoints}
          gpxRouteData={currentEvent?.gpxRouteData}
          createCheckpoint={createCheckpoint}
          updateCheckpoint={updateCheckpoint}
          deleteCheckpoint={deleteCheckpoint}
          onShowToast={onShowToast}
          onEditCheckpointRequest={(cp) => setEditingCheckpoint(cp)}
        />
      )}

      {/* Modal Real QR Code Generator */}
      <QrCodeGeneratorModal
        checkpoint={selectedQr}
        onClose={() => setSelectedQr(null)}
        onShowToast={onShowToast}
      />

      {/* Modal Penentu Lokasi Peta Interaktif */}
      <MapLocationPickerModal
        isOpen={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        existingCheckpoints={checkpoints}
        onShowToast={onShowToast}
        onSelectLocation={(selected) => {
          setPendingCoords({ lat: selected.lat, lng: selected.lng });
          setPendingLocationName(selected.locationName);
          setCreateModalOpen(true);
        }}
      />

      {/* Modal Tambah Checkpoint Baru */}
      <CreateCheckpointModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setPendingCoords(undefined);
          setPendingLocationName(undefined);
        }}
        initialCoords={pendingCoords}
        initialLocationName={pendingLocationName}
        existingCheckpoints={checkpoints}
        onSubmit={(data) => {
          const newCp = createCheckpoint(data);
          if (newCp) {
            setSelectedQr(newCp);
            onShowToast(`Pos "${newCp.name}" berhasil dibuat di peta dengan nilai ${newCp.points} Poin!`);
          }
        }}
        onShowToast={onShowToast}
        nextNumber={checkpoints.length + 1}
      />

      {/* Modal Edit Checkpoint */}
      <EditCheckpointModal
        isOpen={!!editingCheckpoint}
        checkpoint={editingCheckpoint}
        existingCheckpoints={checkpoints}
        onClose={() => setEditingCheckpoint(null)}
        onSubmit={(updatedData) => {
          if (editingCheckpoint) {
            updateCheckpoint(editingCheckpoint.id, updatedData);
          }
        }}
        onDeleteRequest={(cp) => {
          setDeletingCheckpoint(cp);
        }}
        onShowToast={onShowToast}
      />

      {/* Modal Konfirmasi Hapus Pos */}
      <ConfirmDeleteModal
        isOpen={!!deletingCheckpoint}
        title="Hapus Pos Checkpoint?"
        message={`Apakah Anda yakin ingin menghapus pos ini dari perlombaan? Seluruh stiker QR code dan tantangan terkait pos ini akan dinonaktifkan.`}
        itemName={deletingCheckpoint ? `Pos ${deletingCheckpoint.number}: ${deletingCheckpoint.name}` : ''}
        itemType="pos"
        confirmText="Hapus Pos"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingCheckpoint(null)}
      />

      {/* Modal Atur Nilai Semua Pos (Batch Points) */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Atur Nilai Semua Pos</h3>
              </div>
              <button 
                onClick={() => setBatchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchUpdateSubmit} className="mt-4 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Ubah nilai perolehan poin secara seragam untuk seluruh <strong>{checkpoints.length} pos kontrol</strong> yang ada.
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nilai Poin Baru Tiap Pos:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    step={10}
                    value={batchPointsValue}
                    onChange={(e) => setBatchPointsValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="font-bold text-slate-700 shrink-0">Poin</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 font-medium">Preset:</span>
                {[50, 100, 150, 200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBatchPointsValue(preset)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                      batchPointsValue === preset
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {preset} Pts
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  Terapkan ke Semua Pos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Semua QR Pos Secara Sekaligus (Batch QR Print) */}
      <BatchQrPrintModal
        isOpen={batchPrintModalOpen}
        onClose={() => setBatchPrintModalOpen(false)}
        checkpoints={checkpoints}
        currentEvent={currentEvent}
        onShowToast={onShowToast}
      />

      {/* Modal Custom Marker Icon Generator */}
      <MarkerGeneratorModal
        isOpen={markerGeneratorOpen}
        onClose={() => setMarkerGeneratorOpen(false)}
        checkpoints={checkpoints}
        updateCheckpoint={updateCheckpoint}
        onShowToast={onShowToast}
        targetCheckpoint={targetCpForMarker}
      />
    </div>
  );
};
