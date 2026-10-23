import React, { useState } from 'react';
import { X, Calendar, MapPin, Clock, Users, Flag, Sparkles } from 'lucide-react';
import { EventItem } from '../../types';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: Partial<EventItem>) => void;
  onShowToast: (msg: string) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onShowToast,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [eventType, setEventType] = useState<EventItem['eventType']>('amazing_race');
  const [date, setDate] = useState('28 Oktober 2026');
  const [timeRange, setTimeRange] = useState('08:00 - 12:00 WIB');
  const [location, setLocation] = useState('');
  const [organizerName, setOrganizerName] = useState('Panitia Pelaksana');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(180);
  const [minIntervalSeconds, setMinIntervalSeconds] = useState(60);
  const [enforceMinInterval, setEnforceMinInterval] = useState(true);
  const [autoLockCheckpointsEnabled, setAutoLockCheckpointsEnabled] = useState(true);
  const [autoLockCheckpointsMinutes, setAutoLockCheckpointsMinutes] = useState(120);
  const [showScoreToParticipants, setShowScoreToParticipants] = useState(true);
  const [showCertificateToParticipants, setShowCertificateToParticipants] = useState(true);
  const [showParticipantMap, setShowParticipantMap] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [eventCode, setEventCode] = useState<string>(() => `PRV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleGenerateCode = () => {
    const code = `PRV-${Math.floor(1000 + Math.random() * 9000)}`;
    setEventCode(code);
    onShowToast(`Kode Event Privat diperbarui: ${code}`);
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
      subtitle: subtitle.trim() || 'Perlombaan Orienteering & Amazing Race',
      eventType,
      date,
      timeRange,
      location: location.trim(),
      organizerName: organizerName.trim(),
      timeLimitMinutes: Number(timeLimitMinutes),
      minIntervalBetweenCheckpointsSeconds: Number(minIntervalSeconds),
      enforceMinInterval,
      autoLockCheckpointsEnabled,
      autoLockCheckpointsMinutes: Number(autoLockCheckpointsMinutes),
      showScoreToParticipants,
      showCertificateToParticipants,
      showParticipantMap,
      visibility,
      eventCode: finalCode,
      rules: [
        'Setiap tim wajib beranggotakan lengkap saat tiba dan memindai barcode di pos.',
        'Dilarang menggunakan kendaraan bermotor selama rute balapan, peserta wajib berjalan atau berlari.',
        `Waktu jeda minimum antar-pos adalah ${minIntervalSeconds} detik untuk mencegah kecurangan dan memvalidasi perpindahan fisik.`,
        'Pos bertanda "Wajib" harus diselesaikan sebelum tim menuju garis finish.',
      ],
      description: description.trim() || 'Rangkaian event checkpoint dengan navigasi dan tantangan tim.',
    });

    onShowToast(`Event "${title}" berhasil dibuat dan ditambahkan ke daftar!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              +
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Buat Event Baru</h3>
              <p className="text-xs text-slate-500">Tambahkan event langsung ke sistem</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Nama Event / Judul Kegiatan: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Amazing Race BUMN 2026, Orienteering Rimba Raya..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Visibilitas Event (Publik vs Private) */}
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
                  Bagikan kode di atas kepada peserta Anda. Saat pendaftaran, peserta harus memilih "Masukkan Kode Event Privat" dan mengetikkan kode ini.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Jenis / Kategori Event:</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="amazing_race">Amazing Race Korporat</option>
                <option value="orienteering">Orienteering Checkpoint</option>
                <option value="outbound">Outbound & Team Building</option>
                <option value="indoor_qr">Indoor QR Scavenger Hunt</option>
                <option value="school">Sekolah & Kampus</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Sub-judul / Penyelenggara:</label>
              <input
                type="text"
                placeholder="Divisi HR & Event Organizer"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
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
                placeholder="Contoh: Kawasan Hutan Pinus, Sentul"
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
                max={480}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
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

          {/* Pengaturan Jeda Minimum Antar-Pos (Anti-Speedrun) */}
          <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                Waktu Jeda Minimum Antar-Pos (Anti-Speedrun):
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={enforceMinInterval}
                  onChange={(e) => setEnforceMinInterval(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                />
                <span>Aktifkan Validasi Jeda</span>
              </label>
            </div>

            {enforceMinInterval && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={1800}
                    step={10}
                    value={minIntervalSeconds}
                    onChange={(e) => setMinIntervalSeconds(Math.max(0, Number(e.target.value)))}
                    className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    Detik ({Math.floor(minIntervalSeconds / 60)} menit {minIntervalSeconds % 60} detik)
                  </span>
                </div>

                {/* Preset shortcuts */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '30 Detik', val: 30 },
                    { label: '1 Menit (60s)', val: 60 },
                    { label: '2 Menit (120s)', val: 120 },
                    { label: '3 Menit (180s)', val: 180 },
                    { label: '5 Menit (300s)', val: 300 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setMinIntervalSeconds(preset.val)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                        minIntervalSeconds === preset.val
                          ? 'bg-orange-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-orange-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Peserta harus menunggu durasi ini setelah check-in pos sebelum dapat memindai atau menyelesaikan pos berikutnya.
                </p>
              </div>
            )}
          </div>

          {/* Pengaturan Auto-Lock Checkpoint (Penutupan Otomatis Pos) */}
          <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Auto-Lock Checkpoint (Penutupan Otomatis Pos):
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={autoLockCheckpointsEnabled}
                  onChange={(e) => setAutoLockCheckpointsEnabled(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                />
                <span>Aktifkan Auto-Lock</span>
              </label>
            </div>

            {autoLockCheckpointsEnabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={600}
                    step={10}
                    value={autoLockCheckpointsMinutes}
                    onChange={(e) => setAutoLockCheckpointsMinutes(Math.max(0, Number(e.target.value)))}
                    className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Menit dari awal perlombaan
                  </span>
                </div>

                {/* Preset shortcuts */}
                <div className="flex flex-wrap gap-1.5">
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
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                        autoLockCheckpointsMinutes === preset.val
                          ? 'bg-red-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-red-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Setelah waktu lomba berjalan melebihi batas ini, seluruh pos akan tertutup secara otomatis dan menolak check-in tambahan dari tim peserta.
                </p>
              </div>
            )}
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
                    Bila dimatikan, angka skor dirahasiakan dan peserta tidak dapat melihat tab perolehan poin.
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
                    Bila dimatikan, opsi unduh piagam disembunyikan sampai disahkan oleh panitia.
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

          <div>
            <label className="font-bold text-slate-700 block mb-1">Deskripsi & Petunjuk Umum:</label>
            <textarea
              rows={3}
              placeholder="Jelaskan gambaran perlombaan dan aturan rute bagi peserta..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 cursor-pointer"
            >
              Simpan & Terbitkan Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
