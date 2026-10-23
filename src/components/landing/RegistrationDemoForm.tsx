import React, { useState } from 'react';
import { 
  UserPlus, 
  CheckCircle2, 
  Calendar, 
  Users, 
  Phone, 
  Mail, 
  Building, 
  ShieldCheck, 
  ArrowRight, 
  Smartphone, 
  Sparkles, 
  AlertCircle,
  Plus,
  Trash2,
  Ticket
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';

interface RegistrationDemoFormProps {
  onShowToast: (msg: string) => void;
  onRegisteredSuccess?: (teamData: { id: string; name: string; bibNumber: string; pinCode: string }) => void;
}

export const RegistrationDemoForm: React.FC<RegistrationDemoFormProps> = ({
  onShowToast,
  onRegisteredSuccess,
}) => {
  const { events, registerTeam } = useRace();
  const publicEvents = events.filter((evt) => evt.visibility !== 'private');
  
  const [eventAccessMode, setEventAccessMode] = useState<'public' | 'private'>('public');
  const [selectedEventId, setSelectedEventId] = useState<string>(publicEvents[0]?.id || events[0]?.id || 'evt-01');
  const [privateCodeInput, setPrivateCodeInput] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');
  const [category, setCategory] = useState<string>('Korporat / Perusahaan');
  const [leaderName, setLeaderName] = useState<string>('');
  const [leaderPhone, setLeaderPhone] = useState<string>('');
  const [leaderEmail, setLeaderEmail] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [members, setMembers] = useState<string[]>(['', '']); // 2 default extra members

  const matchedPrivateEvent = events.find(
    (evt) => evt.eventCode && evt.eventCode.trim().toUpperCase() === privateCodeInput.trim().toUpperCase()
  );
  
  // Registration result card state
  const [registrationResult, setRegistrationResult] = useState<{
    submitted: boolean;
    teamId: string;
    eventName: string;
    teamName: string;
    bibNumber: string;
    pinCode: string;
    category: string;
    leaderName: string;
    leaderEmail: string;
    totalMembers: number;
  } | null>(null);

  // Validation errors state
  const [errors, setErrors] = useState<{
    teamName?: string;
    leaderName?: string;
    leaderPhone?: string;
    leaderEmail?: string;
    eventCode?: string;
  }>({});

  // Show inline success alert banner
  const [successBannerMsg, setSuccessBannerMsg] = useState<string | null>(null);

  const handleAddMember = () => {
    if (members.length < 5) {
      setMembers([...members, '']);
    } else {
      onShowToast('Maksimum 5 anggota tim tambahan per regu dalam format demo ini.');
    }
  };

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, value: string) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
  };

  const validateForm = () => {
    const newErrors: { teamName?: string; leaderName?: string; leaderPhone?: string; leaderEmail?: string; eventCode?: string } = {};

    // 0. Validasi Event Akses Privat
    if (eventAccessMode === 'private') {
      if (!privateCodeInput.trim()) {
        newErrors.eventCode = 'Harap masukkan Kode Event Privat Anda.';
      } else if (!matchedPrivateEvent) {
        newErrors.eventCode = `Kode Event "${privateCodeInput.trim()}" tidak ditemukan. Harap periksa kembali kode dari panitia.`;
      }
    }

    // 1. Validasi Nama Tim
    if (!teamName.trim()) {
      newErrors.teamName = 'Nama Tim / Regu wajib diisi.';
    }

    // 2. Validasi Nama Lengkap (Peserta / Ketua)
    if (!leaderName.trim()) {
      newErrors.leaderName = 'Nama Lengkap Ketua / Peserta wajib diisi.';
    }

    // 3. Validasi Nomor WhatsApp / HP (WAJIB)
    if (!leaderPhone.trim()) {
      newErrors.leaderPhone = 'Nomor WhatsApp / HP wajib diisi.';
    }

    // 4. Validasi Email (OPSIONAL)
    if (leaderEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(leaderEmail.trim())) {
        newErrors.leaderEmail = 'Format email tidak valid (contoh: peserta@email.com).';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Jalankan validasi dasar
    const isValid = validateForm();
    if (!isValid) {
      if (eventAccessMode === 'private' && !matchedPrivateEvent) {
        onShowToast('Pendaftaran gagal: Kode Event Privat belum valid atau tidak ditemukan.');
      } else {
        onShowToast('Pendaftaran belum lengkap: Harap lengkapi Nama Tim, Ketua, dan No. WhatsApp Anda.');
      }
      return;
    }

    const targetEventId = eventAccessMode === 'private' && matchedPrivateEvent 
      ? matchedPrivateEvent.id 
      : selectedEventId;

    const event = events.find((evt) => evt.id === targetEventId) || matchedPrivateEvent || events[0];
    const registered = registerTeam({
      eventId: targetEventId,
      name: teamName.trim(),
      category,
      leaderName: leaderName.trim(),
      leaderPhone,
      leaderEmail: leaderEmail.trim(),
      organization,
      members: members.filter((m) => m.trim().length > 0),
    });

    const resultData = {
      submitted: true,
      teamId: registered.team.id,
      eventName: event?.title || 'Amazing Race Event',
      teamName: teamName.trim(),
      bibNumber: registered.bibNumber,
      pinCode: registered.pinCode,
      category,
      leaderName: leaderName.trim(),
      leaderEmail: leaderEmail.trim(),
      totalMembers: 1 + members.filter((m) => m.trim().length > 0).length,
    };

    setRegistrationResult(resultData);
    setSuccessBannerMsg(`Selamat! Pendaftaran Tim "${teamName.trim()}" berhasil dikonfirmasi untuk event "${event?.title}".`);
    setErrors({});
    onShowToast(`Pendaftaran Berhasil! Tim "${teamName}" telah terdaftar dengan Nomor BIB: ${registered.bibNumber}`);
  };

  const handleResetForm = () => {
    setRegistrationResult(null);
    setSuccessBannerMsg(null);
    setTeamName('');
    setLeaderName('');
    setLeaderPhone('');
    setLeaderEmail('');
    setOrganization('');
    setMembers(['', '']);
    setErrors({});
  };

  return (
    <section id="registration-section" className="scroll-mt-20">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#0b192c] via-slate-900 to-blue-950 p-6 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulasi Demo • Pendaftaran Peserta</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Formulir Pendaftaran Peserta & Tim
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Uji coba alur registrasi tim untuk bergabung ke salah satu event perlombaan yang tersedia.
              </p>
            </div>

            <div className="shrink-0">
              <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] font-mono text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Tahap 1: Pratinjau Input</span>
              </span>
            </div>
          </div>
        </div>

        {/* Form Body or Success Confirmation Ticket */}
        <div className="p-6 sm:p-8">
          {registrationResult ? (
            /* SUCCESS TICKET CONFIRMATION */
            <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
              {/* Prominent Success Confirmation Box */}
              <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-6 text-center space-y-3 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-3 py-1 rounded-full border border-emerald-300">
                    ✓ Pendaftaran Terverifikasi
                  </span>
                  <h4 className="text-xl sm:text-2xl font-black text-emerald-950 mt-2">
                    Pendaftaran Peserta Berhasil Dikonfirmasi!
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-emerald-900 max-w-lg mx-auto leading-relaxed">
                  Selamat, Tim <strong>"{registrationResult.teamName}"</strong> resmi terdaftar untuk <strong>"{registrationResult.eventName}"</strong>. Rincian konfirmasi telah dikaitkan dengan email <strong>{registrationResult.leaderEmail}</strong>.
                </p>
              </div>

              {/* Digital Race Pass / BIB Card */}
              <div className="bg-gradient-to-br from-[#0b192c] to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-wider block">
                      TIKET RESMI BALAPAN • LIVE ACCESS
                    </span>
                    <h5 className="font-extrabold text-base text-white mt-0.5">
                      {registrationResult.eventName}
                    </h5>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">NOMOR BIB</span>
                    <span className="font-mono font-black text-2xl text-orange-400">
                      {registrationResult.bibNumber}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">Nama Tim</span>
                    <strong className="text-white text-sm truncate block mt-0.5">
                      {registrationResult.teamName}
                    </strong>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">Ketua Regu</span>
                    <strong className="text-white text-sm truncate block mt-0.5">
                      {registrationResult.leaderName}
                    </strong>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">Email Kontak</span>
                    <strong className="text-slate-200 text-xs truncate block mt-0.5">
                      {registrationResult.leaderEmail}
                    </strong>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">PIN Akses HP</span>
                    <strong className="text-orange-400 font-mono text-sm block mt-0.5">
                      {registrationResult.pinCode}
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-[11px] text-slate-300 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>
                    Total Anggota: <strong>{registrationResult.totalMembers} Orang</strong> • Kategori: <strong>{registrationResult.category}</strong>. Gunakan PIN di atas untuk masuk ke aplikasi mobile.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    if (onRegisteredSuccess) {
                      onRegisteredSuccess({
                        id: registrationResult.teamId,
                        name: registrationResult.teamName,
                        bibNumber: registrationResult.bibNumber,
                        pinCode: registrationResult.pinCode,
                      });
                    } else {
                      onShowToast('Buka menu Peserta (HP) di navigasi atas untuk melihat balapan tim Anda!');
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Coba Masuk ke Tampilan HP Peserta</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleResetForm}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  Daftar Tim Lainnya (Form Baru)
                </button>
              </div>
            </div>
          ) : (
            /* REGISTRATION FORM INPUT WITH VALIDATION */
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Error Summary Banner (If Validation Fails) */}
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-xs text-red-900 flex items-start gap-3 animate-in fade-in duration-150">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-extrabold text-red-900 text-sm">Pendaftaran Belum Lengkap</h5>
                    <p className="text-red-700 mt-0.5">Harap periksa dan lengkapi kolom yang wajib diisi:</p>
                    <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-red-800 font-semibold text-[11px]">
                      {errors.eventCode && <li><strong>Kode Event Privat:</strong> {errors.eventCode}</li>}
                      {errors.teamName && <li><strong>Nama Tim:</strong> {errors.teamName}</li>}
                      {errors.leaderName && <li><strong>Nama Ketua / Peserta:</strong> {errors.leaderName}</li>}
                      {errors.leaderPhone && <li><strong>No. WhatsApp / HP:</strong> {errors.leaderPhone}</li>}
                      {errors.leaderEmail && <li><strong>Email Kontak:</strong> {errors.leaderEmail}</li>}
                    </ul>
                  </div>
                </div>
              )}

              {/* Notice Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Formulir Registrasi:</strong> Masukkan identitas regu di bawah. Kolom bertanda bintang (<span className="text-red-500 font-bold">*</span>) wajib diisi untuk verifikasi akun tim.
                </div>
              </div>

              {/* Grid 1: Event Selection & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Pilih Event yang Ingin Diikuti: <span className="text-red-500">*</span>
                    </label>
                  </div>

                  {/* Toggle Mode Event Akses: Publik vs Privat */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEventAccessMode('public');
                        if (publicEvents.length > 0 && !publicEvents.find(e => e.id === selectedEventId)) {
                          setSelectedEventId(publicEvents[0].id);
                        }
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        eventAccessMode === 'public'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🌐 Event Publik ({publicEvents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventAccessMode('private')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        eventAccessMode === 'private'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🔒 Kode Event Privat
                    </button>
                  </div>

                  {eventAccessMode === 'public' ? (
                    <div>
                      <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm font-medium rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all cursor-pointer"
                      >
                        {publicEvents.map((evt) => (
                          <option key={evt.id} value={evt.id}>
                            {evt.title} ({evt.location.split(',')[0]})
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Menampilkan event publik terpublikasi resmi.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={privateCodeInput}
                          onChange={(e) => {
                            setPrivateCodeInput(e.target.value);
                            if (errors.eventCode) setErrors((prev) => ({ ...prev, eventCode: undefined }));
                          }}
                          placeholder="Ketik Kode Event (misal: INDOOR-99, PRV-1234)..."
                          className={`w-full bg-slate-50 border text-slate-900 font-mono font-bold uppercase text-xs sm:text-sm rounded-xl p-3 placeholder-slate-400 focus:outline-none focus:bg-white transition-all ${
                            errors.eventCode
                              ? 'border-red-500 ring-2 ring-red-400 bg-red-50/20'
                              : 'border-indigo-300 focus:ring-2 focus:ring-indigo-500'
                          }`}
                        />
                      </div>

                      {/* Live feedback box for private code */}
                      {matchedPrivateEvent ? (
                        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-950 flex items-start gap-2.5 animate-in fade-in duration-150">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold text-emerald-900 block text-[11px] uppercase tracking-wider">
                              ✓ Event Privat Ditemukan!
                            </span>
                            <strong className="text-emerald-950 text-sm block mt-0.5">{matchedPrivateEvent.title}</strong>
                            <span className="text-[11px] text-emerald-800 block">
                              📍 {matchedPrivateEvent.location} • Penyelenggara: {matchedPrivateEvent.organizerName}
                            </span>
                          </div>
                        </div>
                      ) : privateCodeInput.trim().length > 0 ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-[11px] text-red-800 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>Kode Event "{privateCodeInput}" tidak ditemukan. Pastikan kode sama persis dengan yang diberikan panitia.</span>
                        </div>
                      ) : (
                        <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-2.5 text-[11px] text-indigo-900 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>Masukkan kode event dari panitia. Coba kode demo event privat: <strong className="font-mono text-indigo-950">INDOOR-99</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Kategori / Divisi Tim: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm font-medium rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="Korporat / Perusahaan">Korporat / Divisi Perusahaan</option>
                    <option value="Umum & Komunitas">Umum & Komunitas Orienteering</option>
                    <option value="Pelajar & Mahasiswa">Pelajar & Mahasiswa (Kampus/Sekolah)</option>
                    <option value="Keluarga & Fun Race">Keluarga & Fun Race</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Menentukan kelompok klasemen leaderboard Anda.
                  </p>
                </div>
              </div>

              {/* Grid 2: Team Identity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Nama Tim / Regu: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Rajawali Petir, Tim Biru Mandiri..."
                    value={teamName}
                    onChange={(e) => {
                      setTeamName(e.target.value);
                      if (errors.teamName) setErrors((prev) => ({ ...prev, teamName: undefined }));
                    }}
                    className={`w-full bg-slate-50 border text-slate-800 text-xs sm:text-sm rounded-xl p-3 placeholder-slate-400 focus:outline-none focus:bg-white transition-all ${
                      errors.teamName
                        ? 'border-red-500 ring-2 ring-red-400 bg-red-50/20'
                        : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                    }`}
                  />
                  {errors.teamName && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{errors.teamName}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Instansi / Perusahaan / Kampus:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: PT Bank Mandiri, Universitas Indonesia..."
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl p-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Grid 3: Ketua Tim & Kontak */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                  <UserPlus className="w-4 h-4 text-orange-500" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Data Ketua Tim (Penanggung Jawab HP Navigasi)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nama Lengkap Ketua / Peserta: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Lengkap Anda"
                      value={leaderName}
                      onChange={(e) => {
                        setLeaderName(e.target.value);
                        if (errors.leaderName) setErrors((prev) => ({ ...prev, leaderName: undefined }));
                      }}
                      className={`w-full bg-white border text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none transition-all ${
                        errors.leaderName
                          ? 'border-red-500 ring-2 ring-red-400 bg-red-50/20'
                          : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                      }`}
                    />
                    {errors.leaderName && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{errors.leaderName}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nomor WhatsApp / HP: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0812-xxxx-xxxx"
                      value={leaderPhone}
                      onChange={(e) => {
                        setLeaderPhone(e.target.value);
                        if (errors.leaderPhone) setErrors((prev) => ({ ...prev, leaderPhone: undefined }));
                      }}
                      className={`w-full bg-white border text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none transition-all ${
                        errors.leaderPhone
                          ? 'border-red-500 ring-2 ring-red-400 bg-red-50/20'
                          : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                      }`}
                    />
                    {errors.leaderPhone && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{errors.leaderPhone}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Email Kontak <span className="text-slate-400 font-normal">(Opsional)</span>:
                    </label>
                    <input
                      type="email"
                      placeholder="ketuatim@email.com (opsional)"
                      value={leaderEmail}
                      onChange={(e) => {
                        setLeaderEmail(e.target.value);
                        if (errors.leaderEmail) setErrors((prev) => ({ ...prev, leaderEmail: undefined }));
                      }}
                      className={`w-full bg-white border text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none transition-all ${
                        errors.leaderEmail
                          ? 'border-red-500 ring-2 ring-red-400 bg-red-50/20'
                          : 'border-slate-300 focus:ring-2 focus:ring-orange-500'
                      }`}
                    />
                    {errors.leaderEmail && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{errors.leaderEmail}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Team Members Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      Anggota Tim Tambahan (Opsional)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Satu regu biasanya beranggotakan 2 sampai 5 peserta.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-orange-500" />
                    <span>Tambah Anggota</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                        {idx + 2}
                      </span>
                      <input
                        type="text"
                        placeholder={`Nama Anggota ${idx + 2}`}
                        value={member}
                        onChange={(e) => handleMemberChange(idx, e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
                      />
                      {members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Simulasi registrasi instan tanpa biaya atau kartu kredit.</span>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Kirim Pendaftaran (Demo)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
