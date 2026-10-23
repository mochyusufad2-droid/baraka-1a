import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Flag, 
  QrCode, 
  Download, 
  Play, 
  CheckCircle2, 
  FileText, 
  Settings, 
  Share2,
  ExternalLink,
  ShieldAlert,
  Copy,
  Pencil,
  Trash2,
  Plus,
  Award,
  BookOpen,
  Sliders,
  Check,
  Navigation,
  FileCode,
  Layers,
  TrendingUp
} from 'lucide-react';
import { Printer } from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { Checkpoint, EventItem } from '../../types';
import { QrCodeGeneratorModal } from '../common/QrCodeGeneratorModal';
import { CheckpointQrThumbnail } from '../common/CheckpointQrThumbnail';
import { EditEventModal } from './EditEventModal';
import { EditCheckpointModal } from './EditCheckpointModal';
import { CreateCheckpointModal } from './CreateCheckpointModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { BatchQrPrintModal } from './BatchQrPrintModal';
import { GpxRouteUploaderModal } from './GpxRouteUploaderModal';
import { InteractiveCheckpointMap } from './InteractiveCheckpointMap';
import { SimulationModePanel } from './SimulationModePanel';

interface EventDetailViewProps {
  eventId: string;
  onBack: () => void;
  onShowToast: (msg: string) => void;
  onSwitchToParticipant: () => void;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({
  eventId,
  onBack,
  onShowToast,
  onSwitchToParticipant,
}) => {
  const { 
    events, 
    checkpoints, 
    teams, 
    updateEvent, 
    deleteEvent,
    createCheckpoint,
    updateCheckpoint, 
    deleteCheckpoint 
  } = useRace();

  const [activeTab, setActiveTab] = useState<'overview' | 'checkpoints' | 'teams' | 'rules' | 'simulation'>('overview');
  const [selectedQrCheckpoint, setSelectedQrCheckpoint] = useState<Checkpoint | null>(null);

  // Modals state
  const [editEventModalOpen, setEditEventModalOpen] = useState(false);
  const [createCheckpointModalOpen, setCreateCheckpointModalOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [deletingCheckpoint, setDeletingCheckpoint] = useState<Checkpoint | null>(null);
  const [deletingEventModalOpen, setDeletingEventModalOpen] = useState(false);
  const [batchPrintModalOpen, setBatchPrintModalOpen] = useState(false);
  const [gpxUploaderModalOpen, setGpxUploaderModalOpen] = useState(false);
  const [checkpointViewMode, setCheckpointViewMode] = useState<'list' | 'map'>('list');

  // Quick inline new rule input for Tab 4
  const [quickNewRule, setQuickNewRule] = useState('');

  const event = events.find((e) => e.id === eventId) || events[0] || {
    id: eventId,
    title: 'Event Orienteering',
    subtitle: 'Event Balapan & Tantangan',
    description: 'Rangkaian event orienteering & amazing race.',
    organizerName: 'Panitia RacePoint',
    status: 'active',
    date: 'Hari Ini',
    timeRange: '08:00 - 13:00 WIB',
    location: 'Area Terbuka',
    timeLimitMinutes: 180,
  };

  const currentRules = event.rules && event.rules.length > 0 ? event.rules : [
    'Setiap tim wajib beranggotakan lengkap saat tiba dan memindai barcode di pos.',
    'Dilarang menggunakan kendaraan bermotor selama rute balapan, peserta wajib berjalan atau berlari.',
    'Pos bertanda "Wajib" harus diselesaikan sebelum tim menuju garis finish.',
    'Foto tantangan tim harus memuat wajah seluruh anggota dan petunjuk pos.',
    'Penalti keterlambatan berlaku jika melebihi batas waktu tempuh.'
  ];

  const currentScoring = event.scoringRules || {
    penaltyPerLateMin: 10,
    maxLateMinutes: 30,
    mandatoryBonus: 100,
    judgeMaxScore: 150,
  };

  const handleConfirmDeleteCheckpoint = () => {
    if (deletingCheckpoint) {
      const name = deletingCheckpoint.name;
      deleteCheckpoint(deletingCheckpoint.id);
      onShowToast(`Pos "${name}" berhasil dihapus.`);
      setDeletingCheckpoint(null);
    }
  };

  const handleConfirmDeleteEvent = () => {
    deleteEvent(event.id);
    onShowToast(`Event "${event.title}" berhasil dihapus.`);
    setDeletingEventModalOpen(false);
    onBack();
  };

  const handleAddQuickRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNewRule.trim()) return;
    const updatedRules = [...currentRules, quickNewRule.trim()];
    updateEvent(event.id, { rules: updatedRules });
    setQuickNewRule('');
    onShowToast('Aturan baru berhasil ditambahkan ke perlombaan!');
  };

  const handleRemoveRule = (index: number) => {
    const updatedRules = currentRules.filter((_, idx) => idx !== index);
    updateEvent(event.id, { rules: updatedRules });
    onShowToast('Aturan perlombaan berhasil dihapus.');
  };

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Event</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded bg-orange-100 text-orange-800 font-bold">
            ID: {event.id}
          </span>
          <button
            onClick={() => setEditEventModalOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-blue-600" />
            <span>Edit Event & Aturan</span>
          </button>
        </div>
      </div>

      {/* Event Header Banner */}
      <div className="bg-[#0b192c] rounded-2xl p-6 text-white shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                event.status === 'active' 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : event.status === 'draft'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}>
                {event.status === 'active' ? '● Sedang Berlangsung' : event.status === 'draft' ? 'Konsep Draft' : 'Selesai'}
              </span>

              {event.visibility === 'private' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 flex items-center gap-1.5">
                  🔒 Private Event • Kode: <span className="font-mono text-white underline">{event.eventCode || 'PRV'}</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  🌐 Publish Event (Publik)
                </span>
              )}

              <span className="text-xs text-slate-400 font-medium">
                Penyelenggara: {event.organizerName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {event.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {event.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-400" /> {event.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-400" /> {event.timeRange} ({event.timeLimitMinutes} Menit)
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400" /> {event.location}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setGpxUploaderModalOpen(true)}
              className="px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Unggah berkas GPX untuk menampilkan overlay jalur lomba di peta"
            >
              <Navigation className="w-4 h-4 text-amber-300" />
              <span>{event.gpxRouteData ? '🗺️ Overlay GPX Aktif' : '📂 Unggah Overlay GPX'}</span>
            </button>

            <button
              onClick={() => setEditEventModalOpen(true)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Settings className="w-4 h-4 text-orange-400" />
              <span>Kelola Parameter Event</span>
            </button>
            <button
              onClick={onSwitchToParticipant}
              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Sebagai Peserta (HP)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2 flex items-center gap-2 overflow-x-auto shadow-sm">
        {[
          { id: 'overview', label: 'Ringkasan & Info', icon: <FileText className="w-4 h-4" /> },
          { id: 'checkpoints', label: `Rute & Pos Checkpoint (${checkpoints.length})`, icon: <Flag className="w-4 h-4" /> },
          { id: 'teams', label: `Tim Terdaftar (${teams.length})`, icon: <Users className="w-4 h-4" /> },
          { id: 'rules', label: `Aturan & Sistem Penilaian (${currentRules.length})`, icon: <Settings className="w-4 h-4" /> },
          { id: 'simulation', label: '🧪 Mode Simulasi', icon: <TrendingUp className="w-4 h-4 text-purple-600" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-b-2xl p-6 border-x border-b border-slate-200 shadow-sm -mt-6">
        {/* TAB 1: Ringkasan */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">Deskripsi Rangkaian Acara</h3>
                  <button
                    onClick={() => setEditEventModalOpen(true)}
                    className="text-xs text-orange-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Ubah Deskripsi</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {event.description}
                </p>

                {/* Highlight Rules Snapshot */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-orange-600" />
                      <span>Aturan Pokok Lomba:</span>
                    </h4>
                    <button
                      onClick={() => setActiveTab('rules')}
                      className="text-xs text-orange-600 font-semibold hover:underline"
                    >
                      Lihat Semua Aturan ({currentRules.length}) →
                    </button>
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5">
                    {currentRules.slice(0, 3).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Ringkasan Statistik</h3>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Jumlah Checkpoint:</span>
                    <strong className="text-slate-900">{checkpoints.length} Pos</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Tim Terkonfirmasi:</span>
                    <strong className="text-blue-600">{teams.length} Tim Terdaftar</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Penalti Keterlambatan:</span>
                    <strong className="text-red-600">{currentScoring.penaltyPerLateMin} Poin/Menit</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Maksimum Poin Pos:</span>
                    <strong className="text-emerald-600">
                      {checkpoints.reduce((acc, c) => acc + (c.points || 0), 0)} Poin
                    </strong>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-orange-600" />
                    <span>Aksi Cepat Kelola Event</span>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      onClick={() => setEditEventModalOpen(true)}
                      className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                    >
                      Edit Detail & Aturan Lomba
                    </button>
                    <button
                      onClick={() => setDeletingEventModalOpen(true)}
                      className="w-full py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold text-xs cursor-pointer transition-colors"
                    >
                      Hapus Event Ini
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Checkpoint */}
        {activeTab === 'checkpoints' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Daftar Checkpoint & Titik Kontrol</h3>
                <p className="text-xs text-slate-500">
                  Ubah nilai poin, edit petunjuk pos, atau visualisasikan rute GPX di peta interaktif.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* View mode toggle */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCheckpointViewMode('list')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      checkpointViewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Daftar Pos
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckpointViewMode('map')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      checkpointViewMode === 'map'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Peta & Overlay GPX</span>
                  </button>
                </div>

                <button
                  onClick={() => setGpxUploaderModalOpen(true)}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Unggah atau kelola berkas GPX rute lomba"
                >
                  <FileCode className="w-3.5 h-3.5 text-blue-600" />
                  <span>{event.gpxRouteData ? 'Kelola GPX' : 'Unggah GPX'}</span>
                </button>

                <button
                  onClick={() => setBatchPrintModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                  title="Cetak lembar stiker semua kode QR pos secara sekaligus"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak All QR ({checkpoints.length})</span>
                </button>
                <button
                  onClick={() => setCreateCheckpointModalOpen(true)}
                  className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pos</span>
                </button>
              </div>
            </div>

            {/* If Map View is selected */}
            {checkpointViewMode === 'map' ? (
              <div className="space-y-3">
                <InteractiveCheckpointMap
                  checkpoints={checkpoints}
                  gpxRouteData={event.gpxRouteData}
                  createCheckpoint={createCheckpoint}
                  updateCheckpoint={updateCheckpoint}
                  deleteCheckpoint={deleteCheckpoint}
                  onShowToast={onShowToast}
                  onEditCheckpointRequest={(cp) => setEditingCheckpoint(cp)}
                />
              </div>
            ) : (

            <div className="space-y-3">
              {checkpoints.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Flag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Belum ada checkpoint di event ini.</p>
                  <button
                    onClick={() => setCreateCheckpointModalOpen(true)}
                    className="mt-3 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    + Tambah Pos Sekarang
                  </button>
                </div>
              ) : (
                checkpoints.map((cp, idx) => (
                  <div 
                    key={`${cp.id}-${idx}`}
                    className="p-4 rounded-xl border border-slate-200 hover:border-orange-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#0b192c] text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        #{cp.number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm">{cp.name}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <Award className="w-3 h-3 text-emerald-600" />
                            +{cp.points} Poin
                          </span>
                          {cp.isMandatory && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">
                              Wajib
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>
                            {cp.locationName || <span className="italic text-slate-400">Tanpa patokan fisik khusus</span>}
                            {cp.coordinates && ` (${cp.coordinates.lat}, ${cp.coordinates.lng})`}
                          </span>
                        </p>
                        <p className="text-xs text-slate-700 mt-2 bg-white p-2 rounded-lg border border-slate-200">
                          <span className="font-semibold text-slate-900">Petunjuk (Clue):</span>{' '}
                          {cp.clue ? (
                            <span>{cp.clue}</span>
                          ) : (
                            <span className="italic text-slate-400">Tidak ada petunjuk khusus (pos dapat ditemukan langsung).</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 shrink-0 bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <div 
                          onClick={() => setSelectedQrCheckpoint(cp)}
                          className="cursor-pointer group p-1 bg-white rounded-lg border border-slate-300 hover:border-orange-500 shadow-xs"
                          title="Klik untuk melihat lembar cetak QR dummy"
                        >
                          <CheckpointQrThumbnail
                            value={cp.qrCodeValue}
                            size={50}
                            className="rounded"
                            alt={`QR ${cp.name}`}
                          />
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {cp.qrCodeValue}
                          </span>
                          <button
                            onClick={() => setSelectedQrCheckpoint(cp)}
                            className="text-[10px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer mt-0.5 ml-auto"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>Lihat QR</span>
                          </button>
                        </div>
                      </div>

                      {/* Action buttons: Edit & Hapus */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 w-full justify-end">
                        <button
                          onClick={() => setEditingCheckpoint(cp)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Edit nilai pos & misi"
                        >
                          <Pencil className="w-3 h-3 text-blue-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeletingCheckpoint(cp)}
                          className="p-1 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg text-xs cursor-pointer transition-colors"
                          title="Hapus pos ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            )}
          </div>
        )}

        {/* TAB 3: Tim Terdaftar */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Daftar Tim Terdaftar ({teams.length} Tim)</h3>
                <p className="text-xs text-slate-500">Peserta yang memiliki akses login menggunakan nomor BIB dan PIN.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">No. BIB</th>
                    <th className="p-3">Nama Tim</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Ketua Tim</th>
                    <th className="p-3">PIN Masuk</th>
                    <th className="p-3">Skor</th>
                    <th className="p-3">Pos Selesai</th>
                    <th className="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teams.map((team) => (
                    <tr key={team.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{team.bibNumber}</td>
                      <td className="p-3 font-semibold text-slate-900">{team.name}</td>
                      <td className="p-3 text-slate-600">{team.category}</td>
                      <td className="p-3 text-slate-600">{team.members[0]?.name || '-'}</td>
                      <td className="p-3 font-mono font-bold text-orange-600">{(team as any).pinCode || '••••'}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{team.totalScore} Pts</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                          {team.checkpointsCompleted} / {team.totalCheckpoints} Pos
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            const pin = (team as any).pinCode || '••••';
                            navigator.clipboard.writeText(`BIB: ${team.bibNumber} | PIN: ${pin}`);
                            onShowToast(`Akses login Tim ${team.name} (BIB: ${team.bibNumber}, PIN: ${pin}) disalin!`);
                          }}
                          className="text-orange-600 hover:underline font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Salin PIN</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Aturan Lomba & Sistem Penilaian (Dinamis & Terkelola) */}
        {activeTab === 'rules' && (
          <div className="space-y-6 text-xs sm:text-sm text-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-600" />
                  <span>Tata Tertib & Aturan Lomba Resmi</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Peraturan ini mengikat seluruh tim dan ditampilkan pada antarmuka aplikasi peserta.
                </p>
              </div>

              <button
                onClick={() => setEditEventModalOpen(true)}
                className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-orange-500/20 shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Aturan & Bobot Skor</span>
              </button>
            </div>

            {/* Rules List (Interactive) */}
            <div className="space-y-2.5">
              {currentRules.map((rule, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 group hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#0b192c] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {rule}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveRule(idx)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="Hapus aturan ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Add Rule Form */}
            <form onSubmit={handleAddQuickRule} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Tambahkan poin aturan baru (contoh: Dilarang memisahkan diri dari rombongan)..."
                value={quickNewRule}
                onChange={(e) => setQuickNewRule(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#0b192c] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-orange-400" />
                <span>Tambah Aturan</span>
              </button>
            </form>

            {/* Scoring & Penalties Cards */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-600" />
                <span>Konfigurasi Pembobotan & Sistem Penalti</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 space-y-1">
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
                    Penalti Keterlambatan
                  </span>
                  <div className="font-mono font-extrabold text-lg text-red-600">
                    -{currentScoring.penaltyPerLateMin} Poin/Menit
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dikenakan saat tim kembali melebihi batas waktu {event.timeLimitMinutes} menit.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                    Batas DNF (Cut-Off)
                  </span>
                  <div className="font-mono font-extrabold text-lg text-amber-700">
                    {currentScoring.maxLateMinutes} Menit
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Keterlambatan di atas angka ini otomatis dinyatakan Did Not Finish.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Bonus Pos Wajib
                  </span>
                  <div className="font-mono font-extrabold text-lg text-emerald-700">
                    +{currentScoring.mandatoryBonus} Poin
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Hadiah ekstra jika tim menyelesaikan seluruh pos bertanda Wajib.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                    Maks. Skor Juri
                  </span>
                  <div className="font-mono font-extrabold text-lg text-blue-700">
                    {currentScoring.judgeMaxScore} Poin
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Nilai tertinggi pada tantangan foto formasi tim dan kuis pos.
                  </p>
                </div>
              </div>

              {/* Anti-Speedrun Jeda Minimum Antar-Pos Indicator */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-slate-900 text-sm">
                        Pelacakan Waktu Jeda Minimum Antar-Pos (Anti-Speedrun)
                      </h5>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        event.enforceMinInterval !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {event.enforceMinInterval !== false ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {event.enforceMinInterval !== false
                        ? `Peserta wajib menunggu minimal ${event.minIntervalBetweenCheckpointsSeconds || currentScoring.minIntervalSeconds || 60} detik antar-pos untuk mencegah scan berturut-turut tanpa pergerakan fisik.`
                        : 'Validasi jeda pos saat ini dinonaktifkan untuk event ini.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditEventModalOpen(true)}
                  className="px-3.5 py-1.5 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Atur Durasi Jeda</span>
                </button>
              </div>

              {/* Status Visibilitas Skor & Piagam Peserta */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>Opsi Visibilitas Tampilan HP Peserta:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      Skor Tim: 
                      <strong className={event.showScoreToParticipants !== false ? 'text-emerald-700' : 'text-rose-600'}>
                        {event.showScoreToParticipants !== false ? ' Ditampilkan' : ' Dirahasiakan'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      E-Piagam: 
                      <strong className={event.showCertificateToParticipants !== false ? 'text-emerald-700' : 'text-slate-500'}>
                        {event.showCertificateToParticipants !== false ? ' Ditampilkan' : ' Disembunyikan'}
                      </strong>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditEventModalOpen(true)}
                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
                >
                  Ubah Visibilitas
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Mode Simulasi */}
        {activeTab === 'simulation' && (
          <SimulationModePanel onShowToast={onShowToast} />
        )}
      </div>

      {/* QR Code Modal */}
      <QrCodeGeneratorModal
        checkpoint={selectedQrCheckpoint}
        onClose={() => setSelectedQrCheckpoint(null)}
        onShowToast={onShowToast}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={editEventModalOpen}
        event={event}
        onClose={() => setEditEventModalOpen(false)}
        onSubmit={(updatedData) => {
          updateEvent(event.id, updatedData);
        }}
        onDeleteRequest={() => setDeletingEventModalOpen(true)}
        onShowToast={onShowToast}
      />

      {/* Create Checkpoint Modal */}
      <CreateCheckpointModal
        isOpen={createCheckpointModalOpen}
        onClose={() => setCreateCheckpointModalOpen(false)}
        existingCheckpoints={checkpoints}
        onSubmit={(data) => {
          const newCp = createCheckpoint(data);
          if (newCp) {
            setSelectedQrCheckpoint(newCp);
            onShowToast(`Pos "${newCp.name}" berhasil dibuat dengan nilai ${newCp.points} Poin!`);
          }
        }}
        onShowToast={onShowToast}
        nextNumber={checkpoints.length + 1}
      />

      {/* Edit Checkpoint Modal */}
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

      {/* Confirm Delete Checkpoint Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingCheckpoint}
        title="Hapus Pos Checkpoint?"
        message={`Apakah Anda yakin ingin menghapus pos ini dari event "${event.title}"? Seluruh barcode pos ini tidak akan dapat di-scan lagi.`}
        itemName={deletingCheckpoint ? `Pos ${deletingCheckpoint.number}: ${deletingCheckpoint.name}` : ''}
        itemType="pos"
        confirmText="Hapus Pos"
        onConfirm={handleConfirmDeleteCheckpoint}
        onCancel={() => setDeletingCheckpoint(null)}
      />

      {/* Confirm Delete Event Modal */}
      <ConfirmDeleteModal
        isOpen={deletingEventModalOpen}
        title="Hapus Event Ini?"
        message={`Apakah Anda yakin ingin menghapus event "${event.title}"? Seluruh data rute pos dan riwayat partisipasi akan dihapus.`}
        itemName={event.title}
        itemType="event"
        confirmText="Hapus Event"
        onConfirm={handleConfirmDeleteEvent}
        onCancel={() => setDeletingEventModalOpen(false)}
      />

      {/* Batch QR Print Modal */}
      <BatchQrPrintModal
        isOpen={batchPrintModalOpen}
        onClose={() => setBatchPrintModalOpen(false)}
        checkpoints={checkpoints}
        currentEvent={event}
        onShowToast={onShowToast}
      />

      {/* GPX Route Uploader & Parser Modal */}
      <GpxRouteUploaderModal
        isOpen={gpxUploaderModalOpen}
        onClose={() => setGpxUploaderModalOpen(false)}
        currentGpxData={event.gpxRouteData}
        onSaveGpxRoute={(newGpxData) => {
          updateEvent(event.id, { gpxRouteData: newGpxData });
          if (newGpxData) {
            setCheckpointViewMode('map');
          }
        }}
        onCreateCheckpointsFromWaypoints={(waypoints) => {
          let addedCount = 0;
          waypoints.forEach((wpt, i) => {
            createCheckpoint({
              id: `cp-wpt-${Date.now()}-${i}-${Math.floor(1000 + Math.random() * 9000)}`,
              name: wpt.name || `Pos Waypoint ${i + 1}`,
              locationName: wpt.desc || 'Waypoint dari File GPX',
              points: 150,
              challengeType: 'qr_only',
              clue: `Waypoint GPX: ${wpt.name}`,
              challengeDescription: wpt.desc || 'Scan QR code pos ini.',
              isMandatory: true,
              coordinates: { lat: wpt.lat, lng: wpt.lng },
            });
            addedCount++;
          });
          onShowToast(`🚩 Berhasil mengonversi ${addedCount} waypoint GPX menjadi Pos Checkpoint!`);
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
