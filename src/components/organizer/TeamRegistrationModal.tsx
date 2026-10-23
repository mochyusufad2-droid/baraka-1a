import React, { useState } from 'react';
import { 
  Users, 
  X, 
  Plus, 
  Trash2, 
  Phone, 
  Mail, 
  Award, 
  Tag, 
  Compass, 
  Key, 
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { Team, TeamMember, TeamMemberRole } from '../../types';

interface TeamRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (teamData: {
    name: string;
    category: string;
    leaderName: string;
    leaderPhone?: string;
    leaderEmail?: string;
    organization?: string;
    members: TeamMember[];
    customBibNumber?: string;
    customPinCode?: string;
    color?: string;
  }) => void;
  availableCategories?: string[];
  nextSuggestedBib?: string;
}

const PRESET_CATEGORIES = [
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
  'Campuran (Mixed)',
  'Kategori Kustom (Ketik Baru)...'
];

const MEMBER_ROLES: { value: TeamMemberRole; label: string; desc: string }[] = [
  { value: 'Ketua Tim', label: 'Ketua Tim', desc: 'Pemegang kendali & narahubung regu' },
  { value: 'Navigators', label: 'Navigator (Peta & Kompas)', desc: 'Spesialis membaca peta dan arah' },
  { value: 'Pelari', label: 'Pelari (Runner)', desc: 'Pengambil titik pos cepat' },
  { value: 'Fotografer', label: 'Dokumentasi / Misi', desc: 'Penanggung jawab bukti foto & kuis' },
  { value: 'Anggota', label: 'Anggota Regu', desc: 'Personel pendukung formasi tim' },
];

const COLOR_OPTIONS = [
  { label: 'Oranye Terang', value: 'bg-orange-600' },
  { label: 'Biru Royal', value: 'bg-blue-600' },
  { label: 'Hijau Zamrud', value: 'bg-emerald-600' },
  { label: 'Ungu Elektrik', value: 'bg-purple-600' },
  { label: 'Merah Crimson', value: 'bg-rose-600' },
  { label: 'Teal Samudra', value: 'bg-teal-600' },
  { label: 'Indigo Gelap', value: 'bg-indigo-600' },
  { label: 'Kuning Amber', value: 'bg-amber-600' },
];

export const TeamRegistrationModal: React.FC<TeamRegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegister,
  availableCategories = PRESET_CATEGORIES,
  nextSuggestedBib = 'A-01'
}) => {
  // Form fields
  const [teamName, setTeamName] = useState('');
  const [organization, setOrganization] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(PRESET_CATEGORIES[0]);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].value);
  
  // Leader info
  const [leaderName, setLeaderName] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');

  // Additional members list (starting with 2 sample member slots ready to fill)
  const [additionalMembers, setAdditionalMembers] = useState<TeamMember[]>([
    { name: '', role: 'Navigators', phone: '' },
    { name: '', role: 'Anggota', phone: '' },
  ]);

  // Custom BIB & PIN options
  const [useCustomBibPin, setUseCustomBibPin] = useState(false);
  const [customBib, setCustomBib] = useState('');
  const [customPin, setCustomPin] = useState('');

  if (!isOpen) return null;

  const handleAddMemberSlot = () => {
    setAdditionalMembers(prev => [
      ...prev,
      { name: '', role: 'Anggota', phone: '' }
    ]);
  };

  const handleRemoveMemberSlot = (index: number) => {
    setAdditionalMembers(prev => prev.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    setAdditionalMembers(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const finalCategory = selectedCategory === 'Kategori Kustom (Ketik Baru)...' 
    ? (customCategoryInput.trim() || 'Kategori Umum') 
    : selectedCategory;

  const totalMembersCount = 1 + additionalMembers.filter(m => m.name.trim().length > 0).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !leaderName.trim() || !leaderPhone.trim()) {
      return;
    }

    const leaderMember: TeamMember = {
      name: leaderName.trim(),
      role: 'Ketua Tim',
      phone: leaderPhone.trim()
    };

    const validMembers: TeamMember[] = [
      leaderMember,
      ...additionalMembers
        .filter(m => m.name.trim().length > 0)
        .map(m => ({
          name: m.name.trim(),
          role: m.role || 'Anggota',
          phone: m.phone?.trim() || undefined
        }))
    ];

    onRegister({
      name: teamName.trim(),
      category: finalCategory,
      organization: organization.trim() || undefined,
      leaderName: leaderName.trim(),
      leaderPhone: leaderPhone.trim(),
      leaderEmail: leaderEmail.trim() || undefined,
      members: validMembers,
      customBibNumber: useCustomBibPin && customBib.trim() ? customBib.trim().toUpperCase() : undefined,
      customPinCode: useCustomBibPin && customPin.trim() ? customPin.trim() : undefined,
      color: selectedColor,
    });

    // Reset fields
    setTeamName('');
    setOrganization('');
    setLeaderName('');
    setLeaderPhone('');
    setLeaderEmail('');
    setAdditionalMembers([
      { name: '', role: 'Navigators', phone: '' },
      { name: '', role: 'Anggota', phone: '' },
    ]);
    setUseCustomBibPin(false);
    setCustomBib('');
    setCustomPin('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0b192c] via-slate-900 to-indigo-950 p-5 sm:p-6 text-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold shadow-inner shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-400/30 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-orange-400" />
                  Organizer Team Hub
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white">
                  Pendaftaran & Formasi Anggota Tim
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Daftarkan nama regu, tentukan kategori lomba, dan susun personel anggota tim secara lengkap.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          
          {/* SECTION 1: Identitas Tim & Kategori Lomba */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-500" />
                1. Identitas Tim & Kategori Lomba
              </h4>
              <span className="text-[11px] font-semibold text-slate-400">Wajib Diisi *</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Tim / Regu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Contoh: Garuda Merah Perkasa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Asal Instansi / Perusahaan / Komunitas <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Contoh: PT Bank Mandiri (Persero) Tbk"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-xs sm:text-sm text-slate-900 bg-slate-50 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            {/* Kategori Lomba Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori Lomba / Divisi Pertandingan <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                  >
                    {PRESET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>

                {selectedCategory === 'Kategori Kustom (Ketik Baru)...' ? (
                  <input
                    type="text"
                    required
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="Ketik nama kategori kustom Anda..."
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-xs sm:text-sm font-bold text-orange-900 bg-orange-50/40 outline-none animate-in fade-in"
                  />
                ) : (
                  <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
                    <span>Terdaftar di: <strong className="text-slate-800">{selectedCategory}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Warna Badge & Custom BIB/PIN */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Warna Identitas Bendera Tim:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSelectedColor(c.value)}
                      className={`w-6 h-6 rounded-full ${c.value} border-2 transition-all cursor-pointer ${
                        selectedColor === c.value 
                          ? 'border-slate-900 scale-110 shadow-sm ring-2 ring-slate-400' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomBibPin}
                    onChange={(e) => setUseCustomBibPin(e.target.checked)}
                    className="rounded text-orange-600 w-4 h-4"
                  />
                  <span>Tentukan BIB & PIN Sendiri</span>
                </label>
                {!useCustomBibPin && (
                  <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                    Otomatis: BIB {nextSuggestedBib} + PIN 4-digit acak
                  </span>
                )}
              </div>
            </div>

            {useCustomBibPin && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">Nomor BIB Kustom:</label>
                  <input
                    type="text"
                    required={useCustomBibPin}
                    value={customBib}
                    onChange={(e) => setCustomBib(e.target.value.toUpperCase())}
                    placeholder="Contoh: A-01"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">PIN Masuk Kustom (4-6 digit):</label>
                  <input
                    type="text"
                    required={useCustomBibPin}
                    value={customPin}
                    onChange={(e) => setCustomPin(e.target.value)}
                    placeholder="Contoh: 1234"
                    maxLength={6}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Data Ketua Regu & Kontak Narahubung */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              2. Data Ketua Regu (Leader)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Ketua Tim <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="Nama ketua tim"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp / HP Aktif <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={leaderPhone}
                    onChange={(e) => setLeaderPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm font-medium text-slate-900 bg-slate-50 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Penanggung Jawab <span className="text-slate-400 font-normal">(Opsional untuk pengiriman sertifikat)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={leaderEmail}
                  onChange={(e) => setLeaderEmail(e.target.value)}
                  placeholder="ketua.tim@email.com (opsional)"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm text-slate-900 bg-slate-50 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Susunan Nama Anggota Regu (Daftar Dinamis) */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  3. Susunan Personel Anggota Regu
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tambahkan nama anggota regu dan tentukan peran spesifik di lapangan.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  {totalMembersCount} Personel
                </span>
                <button
                  type="button"
                  onClick={handleAddMemberSlot}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Anggota</span>
                </button>
              </div>
            </div>

            {/* Fixed Row: Leader Card */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <span className="font-extrabold text-xs text-slate-900 block">
                    {leaderName.trim() || 'Nama Ketua Tim'} (Ketua Regu)
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    Role Utama • {leaderPhone.trim() || 'No. Kontak Utama'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 uppercase">
                Ketua Tim
              </span>
            </div>

            {/* Dynamic Member Slots */}
            <div className="space-y-2.5">
              {additionalMembers.map((member, idx) => (
                <div 
                  key={idx} 
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center font-mono text-[10px] font-bold">
                        {idx + 2}
                      </span>
                      Anggota Tambahan #{idx + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveMemberSlot(idx)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Hapus baris anggota ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                        placeholder={`Nama Anggota ${idx + 2}`}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <select
                        value={member.role}
                        onChange={(e) => handleMemberChange(idx, 'role', e.target.value)}
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                      >
                        {MEMBER_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleAddMemberSlot}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Anggota Lainnya ke Regu
              </button>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Batalkan
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-orange-500/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan & Daftarkan Tim</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
