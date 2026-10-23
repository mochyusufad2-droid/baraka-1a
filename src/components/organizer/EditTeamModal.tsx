import React, { useState, useEffect } from 'react';
import { Users, X, Save, Key, Award, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Team, TeamMember } from '../../types';

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  onSave: (teamId: string, updatedData: Partial<Team>) => void;
}

export const EditTeamModal: React.FC<EditTeamModalProps> = ({
  isOpen,
  onClose,
  team,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Korporat / Perusahaan');
  const [bibNumber, setBibNumber] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [color, setColor] = useState('bg-orange-600');
  const [status, setStatus] = useState<'racing' | 'finished' | 'dnf' | 'ready'>('racing');
  const [bonusPoints, setBonusPoints] = useState(0);
  const [penaltyPoints, setPenaltyPoints] = useState(0);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const STANDARD_CATEGORIES = [
    'Korporat / Perusahaan',
    'Umum & Komunitas',
    'Pelajar & Mahasiswa',
    'Master / Veteran',
    'Divisi Komersial & Bisnis',
    'Divisi Operasional & IT',
    'Divisi Keuangan & Risiko',
    'Divisi Logistik & Umum',
    'Putra (Men)',
    'Putri (Women)',
    'Campuran (Mixed)'
  ];

  useEffect(() => {
    if (team) {
      setName(team.name);
      if (STANDARD_CATEGORIES.includes(team.category)) {
        setCategory(team.category);
        setIsCustomCategory(false);
        setCustomCategoryInput('');
      } else {
        setIsCustomCategory(true);
        setCustomCategoryInput(team.category);
        setCategory('Kategori Kustom (Ketik Baru)...');
      }
      setBibNumber(team.bibNumber);
      setPinCode((team as any).pinCode || '');
      setColor(team.color);
      setStatus(team.status);
      setBonusPoints(team.bonusPoints || 0);
      setPenaltyPoints(team.penaltyPoints || 0);
      setMembers(team.members ? [...team.members] : []);
    }
  }, [team]);

  if (!isOpen || !team) return null;

  const handleMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    setMembers((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const handleAddMember = () => {
    setMembers((prev) => [
      ...prev,
      { name: `Anggota ${prev.length + 1}`, role: 'Anggota' },
    ]);
  };

  const handleRemoveMember = (index: number) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalCategory = isCustomCategory 
      ? (customCategoryInput.trim() || 'Kategori Umum') 
      : category;

    onSave(team.id, {
      name: name.trim(),
      category: finalCategory,
      bibNumber: bibNumber.trim().toUpperCase(),
      pinCode: pinCode.trim(),
      color,
      status,
      bonusPoints: Number(bonusPoints) || 0,
      penaltyPoints: Number(penaltyPoints) || 0,
      members,
    } as any);
    onClose();
  };

  const colorOptions = [
    { label: 'Oranye', value: 'bg-orange-600' },
    { label: 'Biru', value: 'bg-blue-600' },
    { label: 'Hijau Emerald', value: 'bg-emerald-600' },
    { label: 'Ungu', value: 'bg-purple-600' },
    { label: 'Merah Crimson', value: 'bg-rose-600' },
    { label: 'Teal', value: 'bg-cyan-600' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0b192c] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Edit & Kelola Tim</h3>
              <p className="text-xs text-slate-300">Ubah data tim, susunan peserta, BIB, atau penalti</p>
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
          {/* Row 1: Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nama Tim / Regu *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Kategori / Divisi Lomba</label>
              <div className="space-y-1.5">
                <select
                  value={isCustomCategory ? 'Kategori Kustom (Ketik Baru)...' : category}
                  onChange={(e) => {
                    if (e.target.value === 'Kategori Kustom (Ketik Baru)...') {
                      setIsCustomCategory(true);
                    } else {
                      setIsCustomCategory(false);
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                >
                  {STANDARD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="Kategori Kustom (Ketik Baru)...">Kategori Kustom (Ketik Baru)...</option>
                </select>

                {isCustomCategory && (
                  <input
                    type="text"
                    required
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="Ketik nama kategori kustom..."
                    className="w-full px-3 py-2 bg-orange-50/50 border border-orange-400 rounded-xl text-xs font-bold text-orange-950 focus:outline-none focus:ring-2 focus:ring-orange-500 animate-in fade-in"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Row 2: BIB & PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nomor BIB *</label>
              <input
                type="text"
                required
                value={bibNumber}
                onChange={(e) => setBibNumber(e.target.value.toUpperCase())}
                placeholder="A-01"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">PIN Masuk (4 Digit) *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="1234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 tracking-wider"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Status Balapan</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="ready">Ready (Siap)</option>
                <option value="racing">Racing (Sedang Bertanding)</option>
                <option value="finished">Finished (Selesai/Finis)</option>
                <option value="dnf">DNF (Diskualifikasi/Gugur)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Warna & Skor Adjustment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Warna Badge</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {colorOptions.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-6 h-6 rounded-full ${c.value} border-2 transition-all ${
                      color === c.value ? 'border-slate-900 scale-110 shadow-sm' : 'border-transparent'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-emerald-800 block mb-1">+ Bonus Juri (Poin)</label>
              <input
                type="number"
                value={bonusPoints}
                onChange={(e) => setBonusPoints(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-emerald-900 font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-red-800 block mb-1">- Penalti (Poin)</label>
              <input
                type="number"
                value={penaltyPoints}
                onChange={(e) => setPenaltyPoints(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-red-300 rounded-lg text-red-900 font-mono font-bold"
              />
            </div>
          </div>

          {/* Members Roster Management */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">Daftar Anggota Regu ({members.length})</label>
              <button
                type="button"
                onClick={handleAddMember}
                className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Anggota
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {members.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="w-5 text-center font-mono text-xs font-bold text-slate-400">{idx + 1}</span>
                  <input
                    type="text"
                    required
                    value={m.name}
                    onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                    placeholder="Nama anggota"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <select
                    value={m.role}
                    onChange={(e) => handleMemberChange(idx, 'role', e.target.value as any)}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700"
                  >
                    <option value="Ketua Tim">Ketua Tim</option>
                    <option value="Navigators">Navigator (Peta)</option>
                    <option value="Pelari">Pelari (Runner)</option>
                    <option value="Fotografer">Dokumentasi</option>
                    <option value="Anggota">Anggota Regu</option>
                  </select>
                  <input
                    type="tel"
                    value={m.phone || ''}
                    onChange={(e) => handleMemberChange(idx, 'phone', e.target.value)}
                    placeholder="No. WA (opsi)"
                    className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 placeholder:text-slate-400"
                  />
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                      title="Hapus anggota"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
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
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Tim</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
