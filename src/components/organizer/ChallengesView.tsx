import React, { useState } from 'react';
import { 
  Camera, 
  HelpCircle, 
  Award, 
  Flame, 
  Plus, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  Layers,
  MapPin,
  Check,
  X,
  ChevronRight,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { CreateChallengeModal } from './CreateChallengeModal';
import { Checkpoint } from '../../types';

interface ChallengesViewProps {
  onShowToast: (msg: string) => void;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({ onShowToast }) => {
  const { checkpoints, submissions, updateCheckpoint, reviewSubmission } = useRace();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [inspectingPhotoUrl, setInspectingPhotoUrl] = useState<string | null>(null);
  const [inspectingSubTitle, setInspectingSubTitle] = useState<string>('');
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryTeamFilter, setGalleryTeamFilter] = useState<string>('all');

  const photoSubmissions = submissions.filter((s) => s.contentUrl);
  const filteredGallerySubmissions = photoSubmissions.filter((s) => {
    if (galleryTeamFilter === 'all') return true;
    return s.teamName === galleryTeamFilter;
  });
  const uniqueTeamsWithPhotos: string[] = Array.from(new Set(photoSubmissions.map((s) => s.teamName)));

  const photoCount = checkpoints.filter((c) => c.challengeType === 'photo').length;
  const riddleCount = checkpoints.filter((c) => c.challengeType === 'riddle').length;
  const physicalCount = checkpoints.filter((c) => c.challengeType === 'physical_game').length;
  const quizCount = checkpoints.filter((c) => c.challengeType === 'quiz').length;

  const challengeCategories = [
    { type: 'photo', title: 'Tantangan Foto Bersama', icon: <Camera className="w-5 h-5 text-purple-600" />, count: photoCount, points: '100 - 150 Poin' },
    { type: 'riddle', title: 'Teka-Teki Sandi & Logika', icon: <HelpCircle className="w-5 h-5 text-amber-600" />, count: riddleCount, points: '150 - 200 Poin' },
    { type: 'physical_game', title: 'Ketangkasan Fisik Kelompok', icon: <Flame className="w-5 h-5 text-red-600" />, count: physicalCount, points: '200 - 250 Poin' },
    { type: 'quiz', title: 'Kuis Edukasi & Pengetahuan', icon: <Award className="w-5 h-5 text-blue-600" />, count: quizCount, points: '50 - 100 Poin' },
  ];

  const handleCreateChallenge = (data: {
    checkpointId: string;
    challengeType: 'qr_only' | 'riddle' | 'photo' | 'physical_game' | 'quiz';
    challengeDescription: string;
    points: number;
    isMandatory: boolean;
  }) => {
    updateCheckpoint(data.checkpointId, {
      challengeType: data.challengeType,
      challengeDescription: data.challengeDescription,
      points: data.points,
      isMandatory: data.isMandatory,
    });
    const cp = checkpoints.find((c) => c.id === data.checkpointId);
    onShowToast(`Tantangan baru berhasil ditautkan ke ${cp?.name || 'Pos'}! Nilai: ${data.points} Poin.`);
  };

  const handleQuickApprove = (submissionId: string, teamName: string) => {
    reviewSubmission(submissionId, 'approved', 150, 'Disetujui langsung dari panel tantangan.');
    onShowToast(`Submission Tim ${teamName} disetujui (+150 Poin)!`);
  };

  const handleQuickReject = (submissionId: string, teamName: string) => {
    reviewSubmission(submissionId, 'rejected', 0, 'Ditolak: tugas belum sesuai kriteria pos.');
    onShowToast(`Submission Tim ${teamName} ditolak.`);
  };

  const filteredCheckpoints = checkpoints.filter((cp) => {
    if (filterType === 'all') return true;
    return cp.challengeType === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0b192c]">Bank Challenge & Misi</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">
              {checkpoints.length} POS TERHUBUNG
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi tantangan interaktif di pos checkpoint: Misi foto kompak, teka-teki sandi, ketangkasan fisik, dan kuis.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setGalleryModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Galeri Foto Misi ({photoSubmissions.length})</span>
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Challenge Baru</span>
          </button>
        </div>
      </div>

      {/* Categories summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {challengeCategories.map((cat, idx) => (
          <div 
            key={idx} 
            onClick={() => setFilterType(filterType === cat.type ? 'all' : cat.type)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filterType === cat.type
                ? 'bg-orange-50/80 border-orange-500 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
              {cat.icon}
            </div>
            <h4 className="font-bold text-slate-900 text-sm">{cat.title}</h4>
            <div className="text-xs text-slate-500 mt-1">{cat.count} Pos Menggunakan</div>
            <div className="text-xs font-semibold text-orange-600 mt-2">{cat.points}</div>
          </div>
        ))}
      </div>

      {/* Active Missions per Checkpoint List */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Daftar Misi Aktif per Pos Checkpoint</h3>
            <p className="text-xs text-slate-500">Misi yang akan tampil di aplikasi ponsel peserta saat tiba di pos</p>
          </div>
          {filterType !== 'all' && (
            <button
              onClick={() => setFilterType('all')}
              className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
            >
              Tampilkan Semua Tipe
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCheckpoints.map((cp, idx) => (
            <div
              key={`${cp.id}-${idx}`}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 font-mono font-bold text-xs flex items-center justify-center">
                      #{cp.number}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{cp.name}</h4>
                      <p className="text-[11px] text-slate-500">{cp.locationName || 'Lokasi Terbuka'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    cp.isMandatory ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {cp.isMandatory ? 'Wajib' : 'Opsional'}
                  </span>
                </div>

                <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wide">
                      Tipe: {cp.challengeType.toUpperCase()}
                    </span>
                    <span className="font-mono font-extrabold text-orange-600">
                      {cp.points} Poin
                    </span>
                  </div>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {cp.challengeDescription || 'Scan kode barcode pos untuk check-in.'}
                  </p>
                  {cp.clue && (
                    <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                      Clue Pos: "{cp.clue}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 text-xs">
                <span className="text-[11px] font-mono text-slate-500">Kode: {cp.qrCodeValue}</span>
                <button
                  onClick={() => {
                    const newPts = prompt(`Ubah nilai poin untuk ${cp.name}:`, String(cp.points));
                    if (newPts && !isNaN(Number(newPts))) {
                      updateCheckpoint(cp.id, { points: Number(newPts) });
                      onShowToast(`Poin ${cp.name} diubah menjadi ${newPts} Pts.`);
                    }
                  }}
                  className="text-orange-600 hover:text-orange-700 font-bold cursor-pointer"
                >
                  Ubah Poin
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submission queue snapshot with Quick Review */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Antrean Pengumpulan Tugas Tim Terkini</h3>
            <p className="text-xs text-slate-500">Hasil unggahan foto dan jawaban yang masuk dari HP tim</p>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            {submissions.length} Pengumpulan
          </span>
        </div>

        <div className="space-y-3">
          {submissions.map((sub, index) => (
            <div 
              key={`${sub.id}-${index}`}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{sub.teamName}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-medium text-orange-600">{sub.checkpointName}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-[11px] text-slate-500">{sub.submittedAt}</span>
                </div>
                <p className="text-xs text-slate-700 font-medium">
                  {sub.contentText}
                </p>

                {sub.contentUrl && (
                  <div className="flex items-center gap-3 pt-1">
                    <div 
                      onClick={() => {
                        setInspectingPhotoUrl(sub.contentUrl || null);
                        setInspectingSubTitle(`${sub.teamName} - ${sub.checkpointName}`);
                      }}
                      className="relative w-20 h-14 rounded-xl overflow-hidden border border-slate-300 cursor-pointer group shadow-xs"
                    >
                      <img src={sub.contentUrl} alt="Bukti Foto" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                        🔍 Lihat
                      </div>
                    </div>
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-200 font-semibold">
                      📷 Bukti Foto Misi
                    </span>
                  </div>
                )}

                {sub.judgeNote && (
                  <p className="text-[11px] text-slate-500 italic">
                    Catatan Juri: "{sub.judgeNote}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {sub.status === 'pending' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuickApprove(sub.id, sub.teamName)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Setujui (+150)</span>
                    </button>
                    <button
                      onClick={() => handleQuickReject(sub.id, sub.teamName)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Tolak
                    </button>
                  </div>
                ) : (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    sub.status === 'approved' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {sub.status === 'approved' 
                      ? `Disetujui (+${sub.scoreGiven} Poin)` 
                      : 'Ditolak / Minta Ulang'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal for Photo Inspection */}
      {inspectingPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Inspeksi Bukti Foto Juri</h3>
                <p className="text-xs text-purple-600 font-medium">{inspectingSubTitle}</p>
              </div>
              <button
                onClick={() => setInspectingPhotoUrl(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-[60vh] bg-slate-950 flex items-center justify-center">
              <img src={inspectingPhotoUrl} alt="Full Size Bukti" className="max-h-[55vh] object-contain w-full" />
            </div>

            <button
              onClick={() => setInspectingPhotoUrl(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {galleryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Galeri Foto Bukti Misi Peserta</h3>
                  <p className="text-xs text-slate-500">Menampilkan seluruh foto kiriman dari state global race ({photoSubmissions.length} foto)</p>
                </div>
              </div>

              <button
                onClick={() => setGalleryModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/50 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter bar */}
            <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Filter Tim:</span>
                <select
                  value={galleryTeamFilter}
                  onChange={(e) => setGalleryTeamFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800"
                >
                  <option value="all">Semua Tim ({photoSubmissions.length})</option>
                  {uniqueTeamsWithPhotos.map((tName, idx) => (
                    <option key={idx} value={tName}>{tName}</option>
                  ))}
                </select>
              </div>

              <div className="text-slate-500 font-medium">
                Menampilkan <strong className="text-slate-900">{filteredGallerySubmissions.length}</strong> foto bukti misi
              </div>
            </div>

            {/* Gallery Grid Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {filteredGallerySubmissions.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                    📷
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Belum Ada Foto Bukti Misi</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Peserta belum mengunggah foto tantangan dari aplikasi partisipan. Foto yang diunggah akan langsung muncul di sini secara real-time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGallerySubmissions.map((sub, index) => (
                    <div 
                      key={`${sub.id}-${index}`}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        {/* Image Thumbnail */}
                        <div 
                          onClick={() => {
                            setInspectingPhotoUrl(sub.contentUrl || null);
                            setInspectingSubTitle(`${sub.teamName} - ${sub.checkpointName}`);
                          }}
                          className="relative h-48 bg-slate-950 cursor-pointer group overflow-hidden"
                        >
                          <img 
                            src={sub.contentUrl} 
                            alt={`Bukti ${sub.teamName}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1.5">
                            <span>🔍 Perbesar Foto</span>
                          </div>
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-mono font-bold">
                            {sub.checkpointName}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{sub.teamName}</span>
                            <span className="text-[10px] text-slate-400">{sub.submittedAt}</span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 font-medium">
                            {sub.contentText || 'Tidak ada catatan keterangan.'}
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions / Status */}
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.status === 'approved' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : sub.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {sub.status === 'approved' ? 'Disetujui' : sub.status === 'rejected' ? 'Ditolak' : 'Menunggu Juri'}
                        </span>

                        {sub.status === 'pending' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                reviewSubmission(sub.id, 'approved', 150, 'Disetujui dari galeri juri.');
                                onShowToast(`Foto Tim ${sub.teamName} disetujui!`);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => {
                                reviewSubmission(sub.id, 'rejected', 0, 'Ditolak dari galeri juri.');
                                onShowToast(`Foto Tim ${sub.teamName} ditolak.`);
                              }}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 rounded-lg font-semibold text-[11px] cursor-pointer"
                            >
                              Tolak
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Semua data gambar tersinkronisasi otomatis dari state global race.
              </span>
              <button
                onClick={() => setGalleryModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Tutup Galeri
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Challenge Baru */}
      <CreateChallengeModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        checkpoints={checkpoints}
        onSave={handleCreateChallenge}
      />
    </div>
  );
};
