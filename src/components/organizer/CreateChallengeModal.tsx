import React, { useState } from 'react';
import { Flame, X, Plus, Sparkles, Camera, HelpCircle, Award, Target, Save } from 'lucide-react';
import { Checkpoint } from '../../types';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoints: Checkpoint[];
  onSave: (data: {
    checkpointId: string;
    challengeType: 'qr_only' | 'riddle' | 'photo' | 'physical_game' | 'quiz';
    challengeDescription: string;
    points: number;
    isMandatory: boolean;
  }) => void;
}

export const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({
  isOpen,
  onClose,
  checkpoints,
  onSave,
}) => {
  const [selectedCpId, setSelectedCpId] = useState<string>(checkpoints[0]?.id || '');
  const [challengeType, setChallengeType] = useState<'photo' | 'riddle' | 'physical_game' | 'quiz' | 'qr_only'>('photo');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [points, setPoints] = useState<number>(150);
  const [isMandatory, setIsMandatory] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeDescription.trim()) return;

    onSave({
      checkpointId: selectedCpId,
      challengeType,
      challengeDescription: challengeDescription.trim(),
      points: Number(points) || 100,
      isMandatory,
    });
    onClose();
  };

  const typePresets = [
    { type: 'photo', label: 'Tantangan Foto Bersama', icon: <Camera className="w-4 h-4 text-purple-600" />, desc: 'Foto formasi lengkap dengan objek pos atau yel-yel tim' },
    { type: 'riddle', label: 'Teka-Teki Sandi & Azimuth', icon: <HelpCircle className="w-4 h-4 text-amber-600" />, desc: 'Memecahkan koordinat atau sandi morse/kompas' },
    { type: 'physical_game', label: 'Ketangkasan Fisik Kelompok', icon: <Flame className="w-4 h-4 text-red-600" />, desc: 'Tugas kerja sama fisik, estafet atau ketangkasan kelompok' },
    { type: 'quiz', label: 'Kuis Edukasi & Sejarah', icon: <Award className="w-4 h-4 text-blue-600" />, desc: 'Pertanyaan pilihan ganda atau esai singkat seputar materi' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0b192c] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Buat Misi / Challenge Baru</h3>
              <p className="text-xs text-slate-300">Tugaskan misi khusus pada pos tertentu untuk diselesaikan peserta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Target Checkpoint */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tautkan ke Pos Checkpoint *</label>
            <select
              value={selectedCpId}
              onChange={(e) => setSelectedCpId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {checkpoints.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  Pos #{cp.number}: {cp.name} ({cp.points} Pts)
                </option>
              ))}
            </select>
          </div>

          {/* Challenge Type */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Kategori / Format Tantangan *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {typePresets.map((preset) => (
                <div
                  key={preset.type}
                  onClick={() => setChallengeType(preset.type as any)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    challengeType === preset.type
                      ? 'bg-orange-50/80 border-orange-500 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="mt-0.5">{preset.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 text-xs">{preset.label}</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{preset.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Instruksi & Deskripsi Tugas *</label>
            <textarea
              required
              rows={3}
              value={challengeDescription}
              onChange={(e) => setChallengeDescription(e.target.value)}
              placeholder="Contoh: Berfoto bersama seluruh anggota dengan memegang bendera pos dalam formasi segitiga..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Points & Mandatory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Bobot Nilai Misi (Poin)</label>
              <input
                type="number"
                min={10}
                max={500}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Sifat Misi</label>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 mt-0.5">
                <input
                  type="checkbox"
                  id="mandatory_chk"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="rounded text-orange-500 w-4 h-4"
                />
                <label htmlFor="mandatory_chk" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  {isMandatory ? 'Wajib Dikerjakan' : 'Tugas Opsional (Bonus)'}
                </label>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan & Terapkan Misi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
