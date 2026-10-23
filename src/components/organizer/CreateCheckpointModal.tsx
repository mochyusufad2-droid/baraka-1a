import React, { useState, useEffect } from 'react';
import { X, MapPin, Flag, Award, HelpCircle, QrCode, Compass, Navigation } from 'lucide-react';
import { Checkpoint } from '../../types';
import { CheckpointQrThumbnail } from '../common/CheckpointQrThumbnail';
import { MapLocationPickerModal } from './MapLocationPickerModal';

interface CreateCheckpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (checkpointData: Partial<Checkpoint>) => void;
  onShowToast: (msg: string) => void;
  nextNumber: number;
  initialCoords?: { lat: number; lng: number };
  initialLocationName?: string;
  existingCheckpoints?: Checkpoint[];
}

export const CreateCheckpointModal: React.FC<CreateCheckpointModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onShowToast,
  nextNumber,
  initialCoords = { lat: -6.6388, lng: 106.8864 },
  initialLocationName = '',
  existingCheckpoints = [],
}) => {
  const [name, setName] = useState(`Pos ${nextNumber}: `);
  const [locationName, setLocationName] = useState(initialLocationName);
  const [points, setPoints] = useState(150);
  const [challengeType, setChallengeType] = useState<Checkpoint['challengeType']>('photo');
  const [clue, setClue] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(0);

  // GPS Map Coordinates state
  const [lat, setLat] = useState<number>(initialCoords.lat || -6.6388);
  const [lng, setLng] = useState<number>(initialCoords.lng || 106.8864);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setName(`Pos ${nextNumber}: `);
      if (initialCoords) {
        setLat(initialCoords.lat);
        setLng(initialCoords.lng);
      }
      if (initialLocationName) {
        setLocationName(initialLocationName);
      }
    }
  }, [isOpen, initialCoords, initialLocationName, nextNumber]);

  if (!isOpen) return null;

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
      challengeDescription: challengeDescription.trim() || 'Scan QR code pos dan lapor ke petugas.',
      isMandatory,
      autoLockMinutes: autoLockMinutes > 0 ? Number(autoLockMinutes) : undefined,
      coordinates: {
        lat: Number(lat),
        lng: Number(lng),
      },
    });

    onShowToast(`Pos "${name}" berhasil ditambahkan dengan lokasi koordinat [${lat.toFixed(5)}, ${lng.toFixed(5)}]!`);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                #{nextNumber}
              </span>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Tambah Pos Checkpoint Baru</h3>
                <p className="text-xs text-slate-500">Tentukan lokasi di peta interaktif & buat pos kontrol</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
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
                placeholder="Contoh: Pos 7: Dermaga Danau Lotus..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
              />
            </div>

            {/* Interactive Remote Map Picker Banner */}
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-orange-500/40 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  <span className="font-extrabold text-xs text-white">Penentu Lokasi & Koordinat Peta</span>
                </div>
                <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded font-mono font-bold border border-orange-500/30">
                  Tanpa Harus di Lokasi
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Anda dapat menentukan koordinat pos dari mana saja! Klik tombol di bawah untuk memilih lokasi langsung pada peta interaktif Leaflet.
              </p>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="font-mono text-[11px] text-slate-200 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 truncate">
                  📍 <span className="text-orange-400 font-bold">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <Compass className="w-4 h-4 text-slate-950" />
                  <span>Pilih di Peta Interaktif</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Patokan / Area Lokasi Fisik:</label>
                  <span className="text-slate-400 font-normal text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">Opsional</span>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: Tepi Kolam Ikan, Gazebo 3"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Nilai Pos (Reward):</label>
                  <span className="font-mono font-bold text-orange-600 text-xs bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    +{points} Poin
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    step={10}
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <div className="flex items-center gap-1">
                    {[50, 100, 150, 200].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPoints(p)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          points === p 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        +{p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Jenis Tantangan di Pos:</label>
                <select
                  value={challengeType}
                  onChange={(e) => setChallengeType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="qr_only">Scan QR Code Saja</option>
                  <option value="photo">Foto Formasi Tim</option>
                  <option value="riddle">Teka-Teki Sandi & Azimuth</option>
                  <option value="physical_game">Tantangan Ketangkasan Fisik</option>
                  <option value="quiz">Kuis Pengetahuan</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kewajiban Pos:</label>
                <select
                  value={isMandatory ? 'yes' : 'no'}
                  onChange={(e) => setIsMandatory(e.target.value === 'yes')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="yes">Wajib Dikunjungi (Mandatory)</option>
                  <option value="no">Pos Pilihan / Opsional (Bonus)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Petunjuk Rute (Clue) untuk Peserta:</label>
                <span className="text-slate-400 font-normal text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">Opsional</span>
              </div>
              <textarea
                rows={2}
                placeholder="Contoh: Temukan batu prasasti dekat pohon beringin kembar... (opsional, boleh dikosongkan)"
                value={clue}
                onChange={(e) => setClue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tugas / Misi untuk Juri Pos:</label>
              <textarea
                rows={2}
                placeholder="Tugas apa yang harus diverifikasi juri di pos ini..."
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

            {/* Live Preview Box of Dummy QR Code */}
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-orange-500/30 flex items-center gap-3.5">
              <div className="p-1 bg-white rounded-xl shrink-0 shadow-sm">
                <CheckpointQrThumbnail
                  value={`QR-POS0${nextNumber}-${Math.abs((name + locationName).split('').reduce((acc, char) => acc + char.charCodeAt(0), 200)) % 900 + 100}`}
                  size={70}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1 overflow-hidden">
                <div className="flex items-center gap-1.5 text-orange-400 font-bold text-[11px]">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Pratinjau Gambar QR Code Dummy</span>
                </div>
                <div className="font-mono text-[10px] text-slate-300 truncate">
                  Nilai Barcode: <strong className="text-white">QR-POS0{nextNumber}-...</strong>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Gambar QR Code dummy akan langsung dihasilkan otomatis begitu pos ini disimpan untuk dicetak/didownload.
                </p>
              </div>
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
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <QrCode className="w-4 h-4" />
                <span>Simpan Pos & Tampilkan QR Dummy</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Map Location Picker Sub-Modal */}
      <MapLocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialCoords={{ lat, lng }}
        initialLocationName={locationName}
        existingCheckpoints={existingCheckpoints}
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
