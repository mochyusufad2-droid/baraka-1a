import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Award, 
  HelpCircle, 
  QrCode, 
  Save, 
  Trash2, 
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Compass
} from 'lucide-react';
import { Checkpoint } from '../../types';
import { CheckpointQrThumbnail } from '../common/CheckpointQrThumbnail';
import { MapLocationPickerModal } from './MapLocationPickerModal';

interface EditCheckpointModalProps {
  isOpen: boolean;
  checkpoint: Checkpoint | null;
  onClose: () => void;
  onSubmit: (updatedData: Partial<Checkpoint>) => void;
  onDeleteRequest: (checkpoint: Checkpoint) => void;
  onShowToast: (msg: string) => void;
  existingCheckpoints?: Checkpoint[];
}

export const EditCheckpointModal: React.FC<EditCheckpointModalProps> = ({
  isOpen,
  checkpoint,
  onClose,
  onSubmit,
  onDeleteRequest,
  onShowToast,
  existingCheckpoints = [],
}) => {
  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [points, setPoints] = useState<number>(150);
  const [challengeType, setChallengeType] = useState<Checkpoint['challengeType']>('qr_only');
  const [clue, setClue] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(0);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [lat, setLat] = useState<number>(-6.6350);
  const [lng, setLng] = useState<number>(106.8850);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  useEffect(() => {
    if (checkpoint) {
      setName(checkpoint.name);
      setLocationName(checkpoint.locationName);
      setPoints(checkpoint.points);
      setChallengeType(checkpoint.challengeType);
      setClue(checkpoint.clue);
      setChallengeDescription(checkpoint.challengeDescription);
      setIsMandatory(checkpoint.isMandatory);
      setAutoLockMinutes(checkpoint.autoLockMinutes ?? 0);
      setQrCodeValue(checkpoint.qrCodeValue);
      setLat(checkpoint.coordinates?.lat || -6.6350);
      setLng(checkpoint.coordinates?.lng || 106.8850);
    }
  }, [checkpoint]);

  if (!isOpen || !checkpoint) return null;

  const handleGenerateNewBarcode = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newCode = `QR-POS0${checkpoint.number}-${randomSuffix}`;
    setQrCodeValue(newCode);
    onShowToast(`Nilai barcode baru diperbarui menjadi "${newCode}".`);
  };

  const handlePointPreset = (val: number) => {
    setPoints(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('Harap isi Nama Pos Checkpoint.');
      return;
    }

    onSubmit({
      name: name.trim(),
      locationName: locationName.trim(),
      points: Number(points),
      challengeType,
      clue: clue.trim(),
      challengeDescription: challengeDescription.trim(),
      isMandatory,
      autoLockMinutes: autoLockMinutes > 0 ? Number(autoLockMinutes) : undefined,
      qrCodeValue: qrCodeValue.trim() || checkpoint.qrCodeValue,
      coordinates: {
        lat: Number(lat),
        lng: Number(lng),
      },
    });

    onShowToast(`Pos "${name}" dan lokasi [${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}] berhasil diperbarui!`);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-orange-500/30">
                #{checkpoint.number}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-lg">Edit Pos & Nilai Checkpoint</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    ID: {checkpoint.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Sesuaikan titik koordinat lokasi di peta interaktif & bobot poin</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Nama Pos */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nama Pos Checkpoint: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Interactive Remote Map Location Section */}
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-orange-500/40 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  <span className="font-extrabold text-xs text-white">Koordinat Pos di Peta Interaktif</span>
                </div>
                <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded font-mono font-bold border border-orange-500/30">
                  Remote Map Picker
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="font-mono text-[11px] text-slate-200 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 truncate">
                  📍 <span className="text-orange-400 font-bold">{Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <Compass className="w-4 h-4 text-slate-950" />
                  <span>Ubah Titik di Peta Interaktif</span>
                </button>
              </div>
            </div>

            {/* Nilai Pos / Points (Featured Control) */}
            <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Award className="w-4 h-4 text-orange-600" />
                  <span>Nilai Pos (Reward Points untuk Tim):</span>
                </label>
                <span className="font-mono font-extrabold text-base text-orange-600 bg-white px-3 py-1 rounded-lg border border-orange-200 shadow-2xs">
                  +{points} Poin
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={10}
                  max={1000}
                  step={10}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-32 px-3 py-2 bg-white border border-orange-300 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {/* Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-medium">Pilihan Cepat:</span>
                  {[50, 100, 150, 200, 250, 300].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePointPreset(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                        points === preset
                          ? 'bg-orange-500 text-white'
                          : 'bg-white text-slate-700 hover:bg-orange-100 border border-orange-200'
                      }`}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Poin ini akan otomatis dihadiahkan ke total skor tim saat peserta berhasil check-in di pos ini.
              </p>
            </div>

            {/* Lokasi & Koordinat Manual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Lokasi Fisik / Patokan Pos:</label>
                  <span className="text-slate-400 font-normal text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">Opsional</span>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: Tepi Kolam Ikan, Gazebo 3 (opsional)"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jenis Tantangan di Pos:</label>
                <select
                  value={challengeType}
                  onChange={(e) => setChallengeType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                >
                  <option value="qr_only">Scan QR Code Saja</option>
                  <option value="photo">Foto Formasi Tim</option>
                  <option value="riddle">Teka-Teki Sandi & Azimuth</option>
                  <option value="physical_game">Tantangan Ketangkasan Fisik</option>
                  <option value="quiz">Kuis Pengetahuan</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Koordinat Latitude (Lintang):</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Koordinat Longitude (Bujur):</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Clue & Mission */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Petunjuk Rute (Clue) untuk Peserta:</label>
                <span className="text-slate-400 font-normal text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">Opsional</span>
              </div>
              <textarea
                rows={2}
                placeholder="Petunjuk atau teka-teki rute bagi peserta (opsional, boleh dikosongkan)"
                value={clue}
                onChange={(e) => setClue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Deskripsi Tugas / Misi di Pos:</label>
              <input
                type="text"
                value={challengeDescription}
                onChange={(e) => setChallengeDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Auto-Lock Khusus Pos Ini */}
            <div className="p-3 bg-red-50/80 border border-red-200 rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span className="text-red-600 font-extrabold">🔒</span>
                  <span>Batas Auto-Lock Khusus Pos Ini (Opsional):</span>
                </label>
                <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                  0 = Ikuti Default Event
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min={0}
                  max={600}
                  placeholder="0 (Ikuti Event)"
                  value={autoLockMinutes || ''}
                  onChange={(e) => setAutoLockMinutes(Math.max(0, Number(e.target.value)))}
                  className="w-28 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <span className="text-xs text-slate-600">
                  {autoLockMinutes > 0 ? `Menit (Tertutup di M+${autoLockMinutes})` : 'Menit dari awal lomba (Dikosongkan/0 = Mengikuti aturan event)'}
                </span>
              </div>
            </div>

            {/* Barcode & Dummy QR Live Preview */}
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-orange-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white rounded-xl shrink-0 shadow-sm">
                  <CheckpointQrThumbnail
                    value={qrCodeValue || 'DUMMY-SAMPLE'}
                    size={64}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs font-bold text-slate-200">Kode Nilai Barcode QR Pos</span>
                  </div>
                  <input
                    type="text"
                    value={qrCodeValue}
                    onChange={(e) => setQrCodeValue(e.target.value)}
                    className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs w-48 sm:w-56 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateNewBarcode}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-[11px] font-semibold border border-white/20 flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                title="Buat ulang kode acak baru"
              >
                <RefreshCw className="w-3 h-3 text-orange-400" />
                <span>Acak Ulang</span>
              </button>
            </div>

            {/* Pos Wajib Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-isMandatory"
                checked={isMandatory}
                onChange={(e) => setIsMandatory(e.target.checked)}
                className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-400 cursor-pointer"
              />
              <label htmlFor="edit-isMandatory" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Pos Wajib (Peserta tidak bisa finis tanpa mengunjungi pos ini)
              </label>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeleteRequest(checkpoint);
                }}
                className="px-3.5 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Pos Ini</span>
              </button>

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
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Map Location Picker Sub-Modal */}
      <MapLocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialCoords={{ lat: Number(lat), lng: Number(lng) }}
        initialLocationName={locationName}
        existingCheckpoints={existingCheckpoints.filter((c) => c.id !== checkpoint.id)}
        onShowToast={onShowToast}
        onSelectLocation={(selected) => {
          setLat(selected.lat);
          setLng(selected.lng);
          if (selected.locationName) {
            setLocationName(selected.locationName);
          }
        }}
      />
    </>
  );
};
