import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Clock, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Flag,
  Flame,
  Award,
  Megaphone,
  Send,
  CloudRain,
  Info,
  AlertTriangle,
  Trash2,
  BellRing
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';

interface LiveRaceControlPanelProps {
  onShowToast: (msg: string) => void;
}

export const LiveRaceControlPanel: React.FC<LiveRaceControlPanelProps> = ({ onShowToast }) => {
  const { 
    raceStatus, 
    raceElapsedSeconds, 
    raceLogs, 
    broadcasts,
    sendBroadcast,
    deleteBroadcast,
    startRace, 
    pauseRace, 
    endRace, 
    resetRaceTimer, 
    teams,
    sosAlerts,
    resolveSos,
    events,
    selectedEventId,
    updateEvent
  } = useRace();

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const showParticipantMap = currentEvent?.showParticipantMap !== false;

  const handleToggleParticipantMap = () => {
    if (!currentEvent) return;
    const nextVal = !showParticipantMap;
    updateEvent(currentEvent.id, { showParticipantMap: nextVal });
    onShowToast(nextVal ? '🗺️ Peta Digital: Diaktifkan di HP peserta.' : '📄 Mode Peta Cetak Fisik: Peta GPS HP disembunyikan.');
  };

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'urgent' | 'weather' | 'clue'>('info');
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getStatusBadge = () => {
    switch (raceStatus) {
      case 'running':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            Sedang Berlangsung (Running)
          </span>
        );
      case 'paused':
        return (
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            Dihentikan Sementara (Paused)
          </span>
        );
      case 'ended':
        return (
          <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-300 border border-slate-600 font-bold text-xs flex items-center gap-1.5 uppercase">
            Perlombaan Selesai (Ended)
          </span>
        );
      case 'not_started':
        return (
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 font-bold text-xs flex items-center gap-1.5 uppercase">
            Siaga di Garis Start (Ready)
          </span>
        );
    }
  };

  const racingCount = teams.filter((t) => t.status === 'racing').length;
  const finishedCount = teams.filter((t) => t.status === 'finished').length;

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) {
      onShowToast('Harap masukkan judul dan pesan pengumuman.');
      return;
    }

    sendBroadcast(broadcastTitle.trim(), broadcastMsg.trim(), broadcastType);
    onShowToast(`Pengumuman "${broadcastTitle}" berhasil disiarkan ke seluruh perangkat peserta!`);
    setBroadcastTitle('');
    setBroadcastMsg('');
    setShowBroadcastForm(false);
  };

  const handlePresetBroadcast = (title: string, msg: string, type: 'info' | 'urgent' | 'weather') => {
    sendBroadcast(title, msg, type);
    onShowToast(`Pesan siaran "${title}" terkirim langsung ke HP seluruh peserta!`);
  };

  return (
    <div className="bg-[#0b192c] rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-6">
      {/* Active SOS Emergency Alerts Banner */}
      {sosAlerts.filter(a => a.status === 'active').length > 0 && (
        <div className="bg-red-950/90 border-2 border-red-500 rounded-2xl p-4 text-white animate-pulse shadow-xl">
          <div className="flex items-center gap-2 text-red-400 font-extrabold text-sm mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
            <span>🚨 PERINGATAN DARURAT (SOS) DARI PESERTA</span>
          </div>
          <div className="space-y-2.5">
            {sosAlerts.filter(a => a.status === 'active').map(alert => (
              <div key={alert.id} className="bg-red-900/70 border border-red-600 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="font-extrabold text-white text-xs flex items-center gap-2">
                    <span>Tim: {alert.teamName}</span>
                    <span className="px-2 py-0.5 rounded bg-red-800 text-red-200 text-[10px] font-mono">BIB #{alert.bibNumber}</span>
                  </div>
                  <div className="text-[11px] text-red-200 mt-1 flex flex-wrap items-center gap-3 font-mono">
                    <span>🕒 {alert.timeString}</span>
                    <span>📍 GPS: [{alert.coordinates.lat.toFixed(5)}, {alert.coordinates.lng.toFixed(5)}]</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`https://www.google.com/maps?q=${alert.coordinates.lat},${alert.coordinates.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow"
                  >
                    Buka Peta Google
                  </a>
                  <button
                    onClick={() => {
                      resolveSos(alert.id);
                      onShowToast(`SOS dari Tim ${alert.teamName} ditandai selesai/teratasi.`);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow"
                  >
                    Tandai Teratasi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Header & Master Timer */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <span className="text-xs text-slate-400 font-mono">PANEL DIREKTUR LOMBA</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Pusat Kendali Balapan Lapangan (Live Race Control)
          </h3>
          <p className="text-xs text-slate-300">
            Kendalikan waktu resmi perlombaan massal, siarkan pengumuman darurat, dan pantau linimasa pergerakan seluruh regu.
          </p>
        </div>

        {/* Master Clock Display */}
        <div className="bg-slate-900/90 px-6 py-3.5 rounded-2xl border border-slate-700/80 text-center shrink-0 shadow-inner">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
            Waktu Balapan Resmi (Master Clock)
          </span>
          <span className="text-3xl sm:text-4xl font-mono font-black text-orange-400 tracking-wider block mt-0.5">
            {formatTimer(raceElapsedSeconds)}
          </span>
        </div>
      </div>

      {/* Action Buttons Toolbar & Race Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Buttons Controls */}
        <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Kendali Jalannya Balapan:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {raceStatus !== 'running' ? (
              <button
                onClick={() => {
                  startRace();
                  onShowToast('Balapan dimulai! Timer berjalan untuk seluruh peserta.');
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Mulai Balapan</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  pauseRace();
                  onShowToast('Balapan dihentikan sementara.');
                }}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/20 transition-all"
              >
                <Pause className="w-4 h-4 fill-white" />
                <span>Jeda Sementara</span>
              </button>
            )}

            <button
              onClick={() => {
                endRace();
                onShowToast('Garis finish ditutup. Seluruh skor dibekukan.');
              }}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20 transition-all"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Selesaikan Balapan</span>
            </button>

            <button
              onClick={() => {
                resetRaceTimer();
                onShowToast('Timer balapan berhasil di-reset.');
              }}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Waktu</span>
            </button>

            <button
              type="button"
              onClick={handleToggleParticipantMap}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm ${
                showParticipantMap
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
                  : 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500'
              }`}
              title="Klik untuk beralih antara Peta Digital dan Mode Peta Cetak Fisik di HP peserta"
            >
              <Radio className="w-4 h-4" />
              <span>Peta Peserta: {showParticipantMap ? 'Digital GPS (ON)' : 'Peta Cetak (OFF)'}</span>
            </button>
          </div>
        </div>

        {/* Live Race Status Metric */}
        <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Tim Berlomba</span>
            <span className="font-extrabold text-orange-400 text-base">{racingCount} Regu</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Capai Finish</span>
            <span className="font-extrabold text-emerald-400 text-base">{finishedCount} Regu</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Total Tim</span>
            <span className="font-extrabold text-white text-base">{teams.length} Regu</span>
          </div>
        </div>
      </div>

      {/* NEW IN STAGE 4: Broadcast Announcement Deck */}
      <div className="bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-orange-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Siaran Pengumuman & Peringatan Lapangan (Live Broadcast)</span>
                <span className="px-2 py-0.2 rounded text-[10px] font-extrabold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {broadcasts.length} Aktif
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Kirim instruksi jalur, peringatan cuaca, atau pengingat waktu yang langsung tampil di layar HP peserta.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowBroadcastForm(!showBroadcastForm)}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{showBroadcastForm ? 'Tutup Formulir' : '+ Buat Siaran Baru'}</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] text-slate-400 font-semibold">Pesan Cepat:</span>
          <button
            onClick={() => handlePresetBroadcast('Peringatan Cuaca: Hujan Ringan', 'Kondisi rute mulai basah. Seluruh peserta dilarang berlari di turunan bebatuan.', 'weather')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
          >
            <CloudRain className="w-3 h-3 text-cyan-400" />
            <span>Hujan di Sektor Alam</span>
          </button>
          <button
            onClick={() => handlePresetBroadcast('Sisa Waktu 30 Menit!', 'Garis finis ditutup tepat waktu. Tim yang terlambat akan dikenakan pengurangan poin.', 'urgent')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Sisa Waktu 30 Menit</span>
          </button>
          <button
            onClick={() => handlePresetBroadcast('Pos 4 Resmi Dibuka', 'Petugas juri di Pos 4 Dermaga Danau Lotus telah siap menyambut kedatangan tim.', 'info')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Info className="w-3 h-3 text-emerald-400" />
            <span>Pos Siaga Terbuka</span>
          </button>
        </div>

        {/* Form Create Broadcast */}
        {showBroadcastForm && (
          <form onSubmit={handleSendBroadcast} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Judul Pengumuman:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Peringatan Jalur Menanjak Terjal..."
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Tingkat Urgensi:
                </label>
                <select
                  value={broadcastType}
                  onChange={(e) => setBroadcastType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="info">Informasi Umum (Hijau)</option>
                  <option value="urgent">Mendesak / Waktu (Merah)</option>
                  <option value="weather">Cuaca / Medan (Biru)</option>
                  <option value="clue">Petunjuk Tambahan (Kuning)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Isi Pesan Siaran ke HP Peserta:
              </label>
              <textarea
                rows={2}
                required
                placeholder="Tuliskan instruksi yang perlu diketahui seluruh tim di lintasan saat ini..."
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowBroadcastForm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Siaran Sekarang</span>
              </button>
            </div>
          </form>
        )}

        {/* Active Broadcasts List */}
        <div className="space-y-2">
          {broadcasts.map((bc) => (
            <div 
              key={bc.id}
              className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs transition-all ${
                bc.type === 'urgent'
                  ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                  : bc.type === 'weather'
                  ? 'bg-blue-950/40 border-blue-800 text-blue-200'
                  : bc.type === 'clue'
                  ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                  : 'bg-slate-800/60 border-slate-700 text-slate-200'
              }`}
            >
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">{bc.title}</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-1.5 py-0.2 rounded">
                    {bc.time}
                  </span>
                  <span className="text-[10px] text-slate-400 italic">
                    oleh {bc.author}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {bc.message}
                </p>
              </div>

              <button
                onClick={() => {
                  deleteBroadcast(bc.id);
                  onShowToast(`Siaran "${bc.title}" telah dihapus.`);
                }}
                className="text-slate-400 hover:text-rose-400 p-1 rounded-md transition-colors cursor-pointer"
                title="Hapus siaran ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Live Event Stream / Log Ticker */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-orange-400 animate-pulse" />
            <h4 className="font-bold text-xs sm:text-sm text-white">Linimasa Peristiwa Langsung (Live Log Stream)</h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Sinkronisasi Waktu Nyata</span>
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {raceLogs.map((log, index) => (
            <div 
              key={`${log.id}-${index}`}
              className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start gap-3 text-xs"
            >
              <span className="font-mono text-[10px] text-orange-400 bg-slate-950 px-2 py-0.5 rounded font-bold shrink-0 mt-0.5">
                {log.time}
              </span>
              <p className="text-slate-200 leading-snug flex-1">
                {log.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
