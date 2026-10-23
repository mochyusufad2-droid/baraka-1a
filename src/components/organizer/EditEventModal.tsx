import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Flag, 
  Save, 
  Plus, 
  Trash2, 
  BookOpen, 
  Award, 
  AlertCircle,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { EventItem, EventStatus } from '../../types';

interface EditEventModalProps {
  isOpen: boolean;
  event: EventItem | null;
  onClose: () => void;
  onSubmit: (updatedData: Partial<EventItem>) => void;
  onDeleteRequest?: (event: EventItem) => void;
  onShowToast: (msg: string) => void;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  event,
  onClose,
  onSubmit,
  onDeleteRequest,
  onShowToast,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [eventType, setEventType] = useState<EventItem['eventType']>('amazing_race');
  const [status, setStatus] = useState<EventStatus>('active');
  const [date, setDate] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [location, setLocation] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(180);
  const [description, setDescription] = useState('');

  // Rules & Scoring
  const [rules, setRules] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState('');
  const [penaltyPerLateMin, setPenaltyPerLateMin] = useState(10);
  const [maxLateMinutes, setMaxLateMinutes] = useState(30);
  const [mandatoryBonus, setMandatoryBonus] = useState(100);
  const [judgeMaxScore, setJudgeMaxScore] = useState(150);
  const [minIntervalSeconds, setMinIntervalSeconds] = useState(60);
  const [enforceMinInterval, setEnforceMinInterval] = useState(true);
  const [autoLockCheckpointsEnabled, setAutoLockCheckpointsEnabled] = useState(true);
  const [autoLockCheckpointsMinutes, setAutoLockCheckpointsMinutes] = useState(120);
  const [showScoreToParticipants, setShowScoreToParticipants] = useState(true);
  const [showCertificateToParticipants, setShowCertificateToParticipants] = useState(true);
  const [showParticipantMap, setShowParticipantMap] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [eventCode, setEventCode] = useState<string>('');

  const [activeSubTab, setActiveSubTab] = useState<'general' | 'rules' | 'scoring'>('general');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setSubtitle(event.subtitle);
      setEventType(event.eventType);
      setStatus(event.status);
      setDate(event.date);
      setTimeRange(event.timeRange);
      setLocation(event.location);
      setOrganizerName(event.organizerName);
      setTimeLimitMinutes(event.timeLimitMinutes);
      setDescription(event.description);
      setVisibility(event.visibility || 'public');
      setEventCode(event.eventCode || `PRV-${Math.floor(1000 + Math.random() * 9000)}`);
      
      const defaultRules = [
        'Setiap tim wajib beranggotakan lengkap saat tiba dan memindai barcode di pos.',
        'Dilarang menggunakan kendaraan bermotor selama rute balapan, peserta wajib berjalan atau berlari.',
        'Pos bertanda "Wajib" harus diselesaikan sebelum tim menuju garis finish.',
        'Foto tantangan tim harus memuat wajah seluruh anggota dan petunjuk pos.',
        'Penalti keterlambatan berlaku jika melebihi batas waktu tempuh.'
      ];
      setRules(event.rules && event.rules.length > 0 ? event.rules : defaultRules);

      setPenaltyPerLateMin(event.scoringRules?.penaltyPerLateMin ?? 10);
      setMaxLateMinutes(event.scoringRules?.maxLateMinutes ?? 30);
      setMandatoryBonus(event.scoringRules?.mandatoryBonus ?? 100);
      setJudgeMaxScore(event.scoringRules?.judgeMaxScore ?? 150);
      setMinIntervalSeconds(event.minIntervalBetweenCheckpointsSeconds ?? event.scoringRules?.minIntervalSeconds ?? 60);
      setEnforceMinInterval(event.enforceMinInterval !== false);
      setAutoLockCheckpointsEnabled(event.autoLockCheckpointsEnabled !== false);
      setAutoLockCheckpointsMinutes(event.autoLockCheckpointsMinutes ?? 120);
      setShowScoreToParticipants(event.showScoreToParticipants !== false);
      setShowCertificateToParticipants(event.showCertificateToParticipants !== false);
      setShowParticipantMap(event.showParticipantMap !== false);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const handleGenerateCode = () => {
    const code = `PRV-${Math.floor(1000 + Math.random() * 9000)}`;
    setEventCode(code);
    onShowToast(`Kode Event Privat diperbarui: ${code}`);
  };

  const handleAddRule = () => {
    if (!newRuleInput.trim()) return;
    setRules((prev) => [...prev, newRuleInput.trim()]);
    setNewRuleInput('');
  };

  const handleRemoveRule = (index: number) => {
    setRules((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRuleChange = (index: number, val: string) => {
    setRules((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) {
      onShowToast('Harap isi Nama Event dan Lokasi Acara.');
      return;
    }

    const finalCode = eventCode.trim().toUpperCase() || `PRV-${Math.floor(1000 + Math.random() * 9000)}`;

    onSubmit({
      title: title.trim(),
      subtitle: subtitle.trim(),
      eventType,
      status,
      date: date.trim(),
      timeRange: timeRange.trim(),
      location: location.trim(),
      organizerName: organizerName.trim(),
      timeLimitMinutes: Number(timeLimitMinutes),
      description: description.trim(),
      visibility,
      eventCode: finalCode,
      rules,
      minIntervalBetweenCheckpointsSeconds: Number(minIntervalSeconds),
      enforceMinInterval,
      autoLockCheckpointsEnabled,
      autoLockCheckpointsMinutes: Number(autoLockCheckpointsMinutes),
      showScoreToParticipants,
      showCertificateToParticipants,
      showParticipantMap,
      scoringRules: {
        penaltyPerLateMin: Number(penaltyPerLateMin),
        maxLateMinutes: Number(maxLateMinutes),
        mandatoryBonus: Number(mandatoryBonus),
        judgeMaxScore: Number(judgeMaxScore),
        minIntervalSeconds: Number(minIntervalSeconds),
      },
    });

    onShowToast(`Event "${title}" dan aturan lomba berhasil diperbarui!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-[#0b192c] text-white flex items-center justify-center font-bold text-sm shadow-md">
              <Flag className="w-5 h-5 text-orange-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg">Kelola & Edit Event</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  ID: {event.id}
                </span>
              </div>
              <p className="text-xs text-slate-500">Edit informasi umum, aturan perlombaan, dan pembobotan skor</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
          {[
            { id: 'general', label: '1. Informasi Umum Event' },
            { id: 'rules', label: '2. Aturan Lomba (Rules)' },
            { id: 'scoring', label: '3. Sistem Poin & Penalti' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeSubTab === tab.id
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* TAB 1: INFORMASI UMUM */}
          {activeSubTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Event / Judul Kegiatan: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Akses & Visibilitas Event (Publik vs Private) */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                <label className="font-extrabold text-indigo-950 text-xs block">
                  Akses & Visibilitas Event Pendaftaran:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      visibility === 'public'
                        ? 'bg-white border-orange-500 ring-2 ring-orange-400 shadow-xs'
                        : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span>🌐 Publish Event (Publik)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Muncul di pilihan event umum saat pendaftaran peserta.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      visibility === 'private'
                        ? 'bg-white border-indigo-600 ring-2 ring-indigo-400 shadow-xs'
                        : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                      <span>🔒 Private Event (Privat)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      Sembunyi dari umum. Peserta butuh Kode Event untuk daftar.
                    </p>
                  </button>
                </div>

                {visibility === 'private' && (
                  <div className="bg-white p-3 rounded-xl border border-indigo-200 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-xs text-indigo-950">
                        Kode Event Akses Privat:
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateCode}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                      >
                        Acak Kode Baru
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required={visibility === 'private'}
                        value={eventCode}
                        onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                        placeholder="Contoh: PRV-8821"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-indigo-300 rounded-lg text-slate-900 font-mono font-bold text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                      />
                      <span className="px-2.5 py-2 bg-indigo-100 text-indigo-800 font-mono font-extrabold text-xs rounded-lg shrink-0">
                        KODE PRIVAT
                      </span>
                    </div>
                    <p className="text-[10px] text-indigo-700 leading-relaxed">
                      Bagikan kode unik ini kepada peserta target. Peserta akan memasukkan kode ini pada menu pendaftaran untuk membuka event privat.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status Event:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="active">Sedang Berlangsung (Active)</option>
                    <option value="draft">Konsep Rencana (Draft)</option>
                    <option value="completed">Telah Selesai (Completed)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis / Kategori Event:</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="amazing_race">Amazing Race Korporat</option>
                    <option value="orienteering">Orienteering Checkpoint</option>
                    <option value="outbound">Outbound & Team Building</option>
                    <option value="indoor_qr">Indoor QR Scavenger Hunt</option>
                    <option value="school">Sekolah & Kampus</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sub-judul / Tema:</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Penyelenggara:</label>
                  <input
                    type="text"
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Lokasi Kegiatan: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batas Waktu Tempuh (Menit):</label>
                  <input
                    type="number"
                    min={30}
                    max={600}
                    step={15}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Acara:</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Waktu Pelaksanaan:</label>
                  <input
                    type="text"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi Singkat:</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed"
                />
              </div>

              {/* Opsi Visibilitas Skor & Piagam di Tampilan Peserta */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Visibilitas di Tampilan HP Peserta
                </span>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showScoreToParticipants}
                      onChange={(e) => setShowScoreToParticipants(e.target.checked)}
                      className="rounded accent-orange-500 w-4 h-4 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Tampilkan Skor ke Peserta</span>
                      <span className="text-[11px] text-slate-500">
                        Bila dimatikan, perolehan skor dirahasiakan dan peserta tidak dapat melihat tab perolehan poin.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-slate-200/60">
                    <input
                      type="checkbox"
                      checked={showCertificateToParticipants}
                      onChange={(e) => setShowCertificateToParticipants(e.target.checked)}
                      className="rounded accent-orange-500 w-4 h-4 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Tampilkan Menu E-Piagam / Sertifikat</span>
                      <span className="text-[11px] text-slate-500">
                        Bila dimatikan, opsi unduh piagam penghargaan disembunyikan sampai disahkan oleh panitia.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-slate-200/60">
                    <input
                      type="checkbox"
                      checked={showParticipantMap}
                      onChange={(e) => setShowParticipantMap(e.target.checked)}
                      className="rounded accent-orange-500 w-4 h-4 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Tampilkan Peta Digital di HP Peserta</span>
                      <span className="text-[11px] text-slate-500">
                        Bila dimatikan, peta digital GPS disembunyikan agar peserta bernavigasi menggunakan Peta Cetak Fisik & Kompas.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATURAN LOMBA (RULES) */}
          {activeSubTab === 'rules' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5">
                <BookOpen className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong>Kelola Aturan Perlombaan:</strong> Aturan ini dapat dilihat oleh seluruh peserta di aplikasi mobile mereka. Anda dapat menambah, mengedit teks, atau menghapus pasal aturan.
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-2.5">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="w-6 h-6 rounded-lg bg-[#0b192c] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-1">
                      {idx + 1}
                    </span>
                    <textarea
                      rows={2}
                      value={rule}
                      onChange={(e) => handleRuleChange(idx, e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors shrink-0"
                      title="Hapus aturan ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Rule */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ketik poin aturan baru (contoh: Dilarang memotong jalur hutan lindung)..."
                  value={newRuleInput}
                  onChange={(e) => setNewRuleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRule();
                    }
                  }}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={handleAddRule}
                  className="px-4 py-2.5 bg-[#0b192c] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                >
                  <Plus className="w-4 h-4 text-orange-400" />
                  <span>Tambah Aturan</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SISTEM POIN & PENALTI */}
          {activeSubTab === 'scoring' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong>Konfigurasi Sistem Penilaian & Penalti:</strong> Tentukan bobot poin keterlambatan, bonus penyelesaian pos wajib, dan rentang skor penilaian juri.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <label className="font-bold text-slate-900 block text-xs">
                    Penalti Keterlambatan Finis:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={penaltyPerLateMin}
                      onChange={(e) => setPenaltyPerLateMin(Number(e.target.value))}
                      className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-xs text-slate-600 font-medium">Poin dikurangi per menit terlambat</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Jika batas waktu habis, setiap 1 menit akan memotong skor tim secara otomatis.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <label className="font-bold text-slate-900 block text-xs">
                    Batas Maksimal Terlambat (Cut-Off DNF):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={maxLateMinutes}
                      onChange={(e) => setMaxLateMinutes(Number(e.target.value))}
                      className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-xs text-slate-600 font-medium">Menit sebelum status DNF</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tim yang terlambat melebihi batas ini dianggap Did Not Finish (DNF).
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <label className="font-bold text-slate-900 block text-xs">
                    Bonus Menyelesaikan Semua Pos Wajib:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={500}
                      step={25}
                      value={mandatoryBonus}
                      onChange={(e) => setMandatoryBonus(Number(e.target.value))}
                      className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-xs text-slate-600 font-medium">Bonus Poin Tambahan</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Diberikan ke tim yang tidak melewatkan satupun pos berlabel "Wajib".
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <label className="font-bold text-slate-900 block text-xs">
                    Skor Maksimum Penilaian Juri Tantangan:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={50}
                      max={500}
                      step={25}
                      value={judgeMaxScore}
                      onChange={(e) => setJudgeMaxScore(Number(e.target.value))}
                      className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-xs text-slate-600 font-medium">Poin Maksimal Form Penilaian</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Nilai tertinggi yang bisa diberikan juri pada tantangan foto formasi dan kuis.
                  </p>
                </div>
              </div>

              {/* Anti-Speedrun Minimum Interval Settings */}
              <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                    <h5 className="font-extrabold text-slate-900 text-xs">
                      Waktu Jeda Minimum Antar-Pos (Anti-Speedrun):
                    </h5>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={enforceMinInterval}
                      onChange={(e) => setEnforceMinInterval(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Aktifkan Pembatasan Jeda</span>
                  </label>
                </div>

                {enforceMinInterval ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={10}
                        max={1800}
                        step={10}
                        value={minIntervalSeconds}
                        onChange={(e) => setMinIntervalSeconds(Math.max(0, Number(e.target.value)))}
                        className="w-28 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="text-xs text-slate-700 font-semibold">
                        Detik ({Math.floor(minIntervalSeconds / 60)} Menit {minIntervalSeconds % 60} Detik)
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">Pilihan Cepat:</span>
                      {[
                        { label: '30 Detik', val: 30 },
                        { label: '1 Menit (60s)', val: 60 },
                        { label: '90 Detik', val: 90 },
                        { label: '2 Menit (120s)', val: 120 },
                        { label: '3 Menit (180s)', val: 180 },
                        { label: '5 Menit (300s)', val: 300 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setMinIntervalSeconds(preset.val)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            minIntervalSeconds === preset.val
                              ? 'bg-orange-600 text-white shadow-sm'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-orange-100 hover:text-orange-800'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-orange-100">
                      Mencegah peserta menyelesaikan pos secara instan (speedrun cheating). Peserta harus menunggu jeda waktu ini selesai sebelum sistem mengizinkan check-in atau scan barcode di pos berikutnya.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Pembatasan jeda dinonaktifkan. Peserta dapat memindai pos kapan pun tanpa batasan interval waktu.
                  </p>
                )}
              </div>

              {/* Fitur Auto-Lock Checkpoint (Penutupan Otomatis Pos) */}
              <div className="p-4 bg-red-50/80 border border-red-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <h5 className="font-extrabold text-slate-900 text-xs">
                      Auto-Lock Checkpoint (Penutupan Otomatis Pos):
                    </h5>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={autoLockCheckpointsEnabled}
                      onChange={(e) => setAutoLockCheckpointsEnabled(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Aktifkan Auto-Lock Pos</span>
                  </label>
                </div>

                {autoLockCheckpointsEnabled ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={10}
                        max={600}
                        step={10}
                        value={autoLockCheckpointsMinutes}
                        onChange={(e) => setAutoLockCheckpointsMinutes(Math.max(0, Number(e.target.value)))}
                        className="w-28 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <span className="text-xs text-slate-700 font-semibold">
                        Menit dari awal perlombaan
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">Pilihan Cepat:</span>
                      {[
                        { label: '30 Menit', val: 30 },
                        { label: '60 Menit (1 Jam)', val: 60 },
                        { label: '90 Menit', val: 90 },
                        { label: '120 Menit (2 Jam)', val: 120 },
                        { label: '180 Menit (3 Jam)', val: 180 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setAutoLockCheckpointsMinutes(preset.val)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            autoLockCheckpointsMinutes === preset.val
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-red-100 hover:text-red-800'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-red-100">
                      Setelah durasi lomba berjalan melebihi {autoLockCheckpointsMinutes} menit, seluruh pos akan terkunci secara otomatis. Peserta yang memindai QR code di pos tersebut akan menerima notifikasi "Pos Terkunci Otomatis" dan check-in ditolak.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Penutupan otomatis pos dinonaktifkan. Pos tetap dapat dipindai selama lomba berlangsung.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
            {onDeleteRequest ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeleteRequest(event);
                }}
                className="px-3.5 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Event</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan Event</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
