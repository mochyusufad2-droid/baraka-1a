import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Upload, 
  MapPin, 
  Layers, 
  Palette, 
  Eye, 
  Zap, 
  HelpCircle,
  Puzzle,
  Dumbbell,
  Apple,
  Camera,
  Flag,
  Crosshair,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { Checkpoint } from '../../types';

interface MarkerGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoints: Checkpoint[];
  updateCheckpoint: (checkpointId: string, updatedData: Partial<Checkpoint>) => Checkpoint | undefined;
  onShowToast: (msg: string) => void;
  targetCheckpoint?: Checkpoint | null;
}

const PRESET_MARKER_TEMPLATES = [
  {
    typeKey: 'puzzle',
    label: 'Teka-Teki & Puzzle (Riddle)',
    color: '#8B5CF6',
    icon: '🧩',
    shape: 'pin' as const,
    description: 'Cocok untuk pos sandi, teka-teki, dan penalaran logika.'
  },
  {
    typeKey: 'physical',
    label: 'Tugas Fisik & Ketangkasan',
    color: '#10B981',
    icon: '🏋️',
    shape: 'shield' as const,
    description: 'Untuk pos rintangan, ketangkasan fisik, dan outbond.'
  },
  {
    typeKey: 'nutrition',
    label: 'Pos Nutrisi, Air & Logistik',
    color: '#EF4444',
    icon: '🍎',
    shape: 'circle' as const,
    description: 'Stasiun penambahan air minum, snack, dan istirahat.'
  },
  {
    typeKey: 'quiz',
    label: 'Kuis & Pengetahuan Umum',
    color: '#3B82F6',
    icon: '❓',
    shape: 'pin' as const,
    description: 'Pertanyaan teori, peta navigasi, dan wawasan.'
  },
  {
    typeKey: 'photo',
    label: 'Misi Foto & Formasi Regu',
    color: '#EC4899',
    icon: '📸',
    shape: 'square' as const,
    description: 'Formasi unik regu, pemandangan, atau tantangan kreatif.'
  },
  {
    typeKey: 'start_finish',
    label: 'Pos Start / Garis Finis Utama',
    color: '#F59E0B',
    icon: '🚩',
    shape: 'hexagon' as const,
    description: 'Titik keberangkatan awal dan garis akhir balapan.'
  },
  {
    typeKey: 'firstaid',
    label: 'Pos P3K & Medis Darurat',
    color: '#06B6D4',
    icon: '🩺',
    shape: 'circle' as const,
    description: 'Bantuan medis, pertolongan pertama, dan tim evaluasi.'
  },
  {
    typeKey: 'bonus',
    label: 'Pos Rahasia / Bonus Poin',
    color: '#6366F1',
    icon: '⚡',
    shape: 'hexagon' as const,
    description: 'Pos tersembunyi berhadiah poin ekstra besar.'
  }
];

const COLOR_PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
   '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#1E293B', '#0F172A'
];

const EMOJI_OPTIONS = [
  '🧩', '🏋️', '🍎', '❓', '📸', '🚩', '🩺', '⚡', 
  '📍', '🏆', '🧭', '🎯', '🛡️', '⛺', '🚲', '🌲',
  '🔥', '💎', '🔑', '⭐', '🎨', '🚀'
];

export const MarkerGeneratorModal: React.FC<MarkerGeneratorModalProps> = ({
  isOpen,
  onClose,
  checkpoints,
  updateCheckpoint,
  onShowToast,
  targetCheckpoint,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>(
    targetCheckpoint?.markerColor || '#8B5CF6'
  );
  const [selectedIcon, setSelectedIcon] = useState<string>(
    targetCheckpoint?.markerIcon || '🧩'
  );
  const [selectedShape, setSelectedShape] = useState<'pin' | 'circle' | 'square' | 'shield' | 'hexagon'>(
    targetCheckpoint?.markerShape || 'pin'
  );
  const [customImageUrl, setCustomImageUrl] = useState<string>(
    targetCheckpoint?.markerCustomImage || ''
  );
  const [applyTarget, setApplyTarget] = useState<'single' | 'all' | 'by_type'>(
    targetCheckpoint ? 'single' : 'all'
  );
  const [targetCpId, setTargetCpId] = useState<string>(
    targetCheckpoint?.id || (checkpoints[0]?.id || '')
  );
  const [targetType, setTargetType] = useState<string>('photo');

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_MARKER_TEMPLATES[0]) => {
    setSelectedColor(preset.color);
    setSelectedIcon(preset.icon);
    setSelectedShape(preset.shape);
    setCustomImageUrl('');
    onShowToast(`🎨 Template penanda "${preset.label}" diterapkan ke generator.`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) {
        onShowToast('Ukuran berkas gambar terlalu besar. Maksimal 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImageUrl(reader.result as string);
        onShowToast('🖼️ Gambar logo/ikon kustom marker berhasil diunggah.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAndApply = () => {
    const markerData = {
      markerColor: selectedColor,
      markerIcon: selectedIcon,
      markerShape: selectedShape,
      markerCustomImage: customImageUrl || undefined,
    };

    if (applyTarget === 'single') {
      const cpId = targetCpId || targetCheckpoint?.id;
      if (!cpId) return;
      updateCheckpoint(cpId, markerData);
      const targetCp = checkpoints.find(c => c.id === cpId);
      onShowToast(`✅ Penanda kustom berhasil diterapkan pada pos "${targetCp?.name || 'Pos'}".`);
    } else if (applyTarget === 'by_type') {
      let count = 0;
      checkpoints.forEach(cp => {
        if (cp.challengeType === targetType) {
          updateCheckpoint(cp.id, markerData);
          count++;
        }
      });
      onShowToast(`✅ Penanda kustom diterapkan ke ${count} pos dengan tipe tantangan "${targetType}".`);
    } else if (applyTarget === 'all') {
      checkpoints.forEach(cp => {
        updateCheckpoint(cp.id, markerData);
      });
      onShowToast(`✅ Penanda kustom berhasil diterapkan ke seluruh (${checkpoints.length}) pos di rute lomba!`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                Generator Penanda Peta Kustom
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold uppercase">
                  Color-Coded Map Markers
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Rancang ikon dan skema warna peta interaktif untuk setiap kategori pos (puzzle, ketangkasan, nutrisi, P3K)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Preset Templates & Live Preview (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            {/* Live Interactive Map Marker Preview */}
            <div className="bg-[#0b192c] p-5 rounded-2xl border border-slate-800 text-center text-white shadow-inner relative overflow-hidden">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-400 uppercase tracking-widest border border-slate-700">
                Pratinjau Peta
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-3">
                Tampilan Marker di Peta GPS
              </span>

              {/* Marker Render Box */}
              <div className="py-6 flex flex-col items-center justify-center gap-3">
                <div className="relative group cursor-pointer transition-transform hover:scale-110">
                  {/* Outer Glow */}
                  <div 
                    className="absolute inset-0 rounded-full blur-md opacity-60"
                    style={{ backgroundColor: selectedColor }}
                  ></div>

                  {/* Marker Pin Element */}
                  <div 
                    className={`relative flex items-center justify-center shadow-2xl transition-all ${
                      selectedShape === 'circle' ? 'rounded-full' :
                      selectedShape === 'square' ? 'rounded-xl' :
                      selectedShape === 'shield' ? 'rounded-t-2xl rounded-b-md' :
                      selectedShape === 'hexagon' ? 'rounded-lg rotate-45' :
                      'rounded-t-full rounded-br-full -rotate-45'
                    }`}
                    style={{
                      backgroundColor: selectedColor,
                      width: '56px',
                      height: '56px',
                      border: '3px solid #ffffff',
                      boxShadow: `0 8px 20px ${selectedColor}66`,
                    }}
                  >
                    <div className={selectedShape === 'hexagon' ? '-rotate-45' : selectedShape === 'pin' ? 'rotate-45' : ''}>
                      {customImageUrl ? (
                        <img 
                          src={customImageUrl} 
                          alt="Marker Custom Logo" 
                          className="w-8 h-8 rounded-full object-cover border border-white/50"
                        />
                      ) : (
                        <span className="text-2xl drop-shadow">{selectedIcon}</span>
                      )}
                    </div>

                    {/* Checkpoint Number Badge */}
                    <span 
                      className="absolute -bottom-2 -right-2 bg-slate-900 text-white border-2 border-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-extrabold shadow-md font-mono"
                    >
                      P1
                    </span>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <div className="font-extrabold text-sm text-white flex items-center justify-center gap-1.5">
                    <span>Pos 1: Pos Teka-Teki Utama</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Warna: <span className="font-bold" style={{ color: selectedColor }}>{selectedColor}</span> | Bentuk: <span className="capitalize">{selectedShape}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Templates Selector */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-500" />
                Template Jenis Pos Instan:
              </span>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {PRESET_MARKER_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.typeKey}
                    type="button"
                    onClick={() => handleApplyPreset(tmpl)}
                    className="p-2.5 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group flex items-start gap-2"
                  >
                    <span 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 text-white font-bold shadow-sm"
                      style={{ backgroundColor: tmpl.color }}
                    >
                      {tmpl.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-[11px] text-slate-900 truncate group-hover:text-purple-700">
                        {tmpl.label}
                      </div>
                      <div className="text-[9px] text-slate-500 line-clamp-1">
                        {tmpl.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Customization Controls (7 cols) */}
          <div className="md:col-span-7 space-y-4 text-xs">
            {/* Color Selector */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-purple-600" />
                  Pilih Warna Marker (Color Code):
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-mono font-bold uppercase text-slate-800"
                  />
                </div>
              </div>

              {/* Color Presets Palette */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {COLOR_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setSelectedColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-7 h-7 rounded-xl transition-transform cursor-pointer border-2 ${
                      selectedColor.toLowerCase() === hex.toLowerCase()
                        ? 'scale-110 border-slate-900 ring-2 ring-purple-400 shadow-md'
                        : 'border-white hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Shape & Icon Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Marker Shape */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">
                  Bentuk Dasar Pin Marker:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'pin', label: 'Pin Tetes' },
                    { id: 'circle', label: 'Lingkaran' },
                    { id: 'shield', label: 'Perisai' },
                    { id: 'square', label: 'Kotak' },
                    { id: 'hexagon', label: 'Hexagon' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedShape(s.id as any)}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        selectedShape === s.id
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symbol / Emoji Icon Picker */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 block">
                    Ikon / Simbol Pos:
                  </span>
                  <input
                    type="text"
                    maxLength={2}
                    value={selectedIcon}
                    onChange={(e) => setSelectedIcon(e.target.value)}
                    className="w-10 px-1 py-0.5 bg-white border border-slate-300 rounded text-center font-bold text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setSelectedIcon(emoji);
                        setCustomImageUrl('');
                      }}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center cursor-pointer transition-all ${
                        selectedIcon === emoji && !customImageUrl
                          ? 'bg-purple-200 border border-purple-500 scale-110'
                          : 'bg-white border border-slate-200 hover:bg-purple-50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Logo / Image Upload Option */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-purple-600" />
                  Unggah Gambar / Logo Kustom (Opsional):
                </span>
                {customImageUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomImageUrl('')}
                    className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                  >
                    Hapus Gambar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex-1 px-3 py-2 bg-white border border-slate-300 hover:border-purple-400 rounded-xl cursor-pointer text-slate-600 text-xs font-medium flex items-center justify-center gap-2 transition-colors">
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>{customImageUrl ? 'Ganti Logo Marker' : 'Pilih File Logo (PNG / JPG / SVG)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Application Scope Target */}
            <div className="p-3.5 bg-purple-50/80 rounded-2xl border border-purple-200 space-y-2.5">
              <span className="font-extrabold text-purple-950 block text-xs">
                Terapkan Penanda Ini Ke:
              </span>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="radio"
                    name="applyTarget"
                    checked={applyTarget === 'single'}
                    onChange={() => setApplyTarget('single')}
                    className="accent-purple-600 w-4 h-4"
                  />
                  <span>Hanya Pada Satu Pos Spesifik:</span>
                </label>

                {applyTarget === 'single' && (
                  <select
                    value={targetCpId}
                    onChange={(e) => setTargetCpId(e.target.value)}
                    className="w-full ml-6 px-3 py-2 bg-white border border-purple-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {checkpoints.map(cp => (
                      <option key={cp.id} value={cp.id}>
                        {cp.name} (Pos #{cp.number})
                      </option>
                    ))}
                  </select>
                )}

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="radio"
                    name="applyTarget"
                    checked={applyTarget === 'by_type'}
                    onChange={() => setApplyTarget('by_type')}
                    className="accent-purple-600 w-4 h-4"
                  />
                  <span>Semua Pos Berdasarkan Tipe Tantangan:</span>
                </label>

                {applyTarget === 'by_type' && (
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full ml-6 px-3 py-2 bg-white border border-purple-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="photo">Misi Foto & Formasi (photo)</option>
                    <option value="riddle">Teka-Teki & Sandi (riddle)</option>
                    <option value="physical_game">Permainan Fisik (physical_game)</option>
                    <option value="qr_only">Scan QR Saja (qr_only)</option>
                    <option value="quiz">Kuis Теоri (quiz)</option>
                  </select>
                )}

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="radio"
                    name="applyTarget"
                    checked={applyTarget === 'all'}
                    onChange={() => setApplyTarget('all')}
                    className="accent-purple-600 w-4 h-4"
                  />
                  <span>Seluruh Pos Checkpoint ({checkpoints.length} Pos) di Rute Lomba</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAndApply}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-extrabold flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>Simpan & Terapkan Marker</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
