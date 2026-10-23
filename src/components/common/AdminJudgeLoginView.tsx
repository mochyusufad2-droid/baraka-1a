import React, { useState } from 'react';
import { 
  Shield, 
  UserCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Key, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  ArrowRight,
  Compass,
  FileSpreadsheet,
  QrCode,
  Megaphone,
  Award,
  Clock,
  LayoutDashboard
} from 'lucide-react';
import { useRace, UserRole } from '../../context/RaceContext';

interface AdminJudgeLoginViewProps {
  onShowToast: (msg: string) => void;
  onNavigateToView: (view: 'organizer' | 'judge' | 'landing') => void;
  defaultRole?: 'organizer' | 'judge';
}

export const AdminJudgeLoginView: React.FC<AdminJudgeLoginViewProps> = ({
  onShowToast,
  onNavigateToView,
  defaultRole = 'organizer',
}) => {
  const { 
    currentUserRole, 
    loginAsRole, 
    logoutRole, 
    adminPassword, 
    judgePassword 
  } = useRace();

  const [activeTab, setActiveTab] = useState<'organizer' | 'judge'>(defaultRole);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (activeTab === 'organizer' && emailInput.trim()) {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.trim(), password: passwordInput }),
        });
        const data = await response.json();
        setIsLoading(false);

        if (response.ok && data.success) {
          localStorage.setItem('admin_token', data.token);
          loginAsRole(activeTab, passwordInput);
          onShowToast(`Berhasil login sebagai staf ${data.user.email} (${data.user.role})!`);
          onNavigateToView(activeTab);
          return;
        } else {
          // Fallback to local demo password if api login fails
          const res = loginAsRole(activeTab, passwordInput);
          if (res.success) {
            onShowToast(res.message);
            onNavigateToView(activeTab);
            return;
          }
          setErrorMsg(data.message || res.message || 'Gagal login. Periksa kembali email dan password yang diberikan Super Admin.');
          return;
        }
      } else {
        setTimeout(() => {
          const res = loginAsRole(activeTab, passwordInput);
          setIsLoading(false);

          if (res.success) {
            onShowToast(res.message);
            onNavigateToView(activeTab);
          } else {
            setErrorMsg(res.message);
          }
        }, 300);
      }
    } catch (err: any) {
      setIsLoading(false);
      const res = loginAsRole(activeTab, passwordInput);
      if (res.success) {
        onShowToast(res.message);
        onNavigateToView(activeTab);
      } else {
        setErrorMsg(err?.message || 'Terjadi kesalahan saat otentikasi server.');
      }
    }
  };

  const handleFillDemoPass = () => {
    if (activeTab === 'organizer') {
      setPasswordInput(adminPassword);
    } else {
      setPasswordInput(judgePassword);
    }
    setErrorMsg(null);
    onShowToast(`Password demo "${activeTab === 'organizer' ? adminPassword : judgePassword}" diisikan otomatis.`);
  };

  return (
    <div className="py-8 px-4 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0b192c] via-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-extrabold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5 text-orange-400" />
            <span>Portal Otentikasi Staf & Resmi Perangkat Lomba (RBAC)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Logon Panitia Admin & Juri Pos
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Halaman masuk resmi untuk Penyelenggara (Organizer Admin) dan Juri Pos Lapangan. Otentikasi terenkripsi melindungi sistem dari manipulasi skor.
          </p>

          {/* Active User Session Status */}
          <div className="pt-2 flex justify-center">
            {currentUserRole !== 'guest' ? (
              <div className="inline-flex items-center gap-3 p-2 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Terautentikasi sebagai: <strong>{currentUserRole === 'organizer' ? 'Panitia / Admin (Organizer)' : 'Juri Pos Lapangan'}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    logoutRole();
                    onShowToast('Berhasil keluar dari sesi Staf.');
                  }}
                  className="ml-2 px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 text-xs font-medium">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span>Status Saat Ini: Belum Terautentikasi (Sesi Tamu)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Login Box + Role Features */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Login Form Container (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-lg space-y-6">
          {/* Active Session Notification (if already logged in) */}
          {currentUserRole !== 'guest' && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sesi Akses Aktif</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full uppercase">
                  {currentUserRole}
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-snug">
                Anda sedang masuk sebagai {currentUserRole === 'organizer' ? 'Panitia Admin' : 'Juri Pos'}. Anda dapat langsung membuka konsol kerja atau berganti ke akun peran lain di bawah ini.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToView(currentUserRole === 'organizer' ? 'organizer' : 'judge')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                >
                  <span>Buka Konsol {currentUserRole === 'organizer' ? 'Organizer Hub' : 'Dashboard Juri'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Role Selection Tabs */}
          <div>
            <label className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block mb-2">
              1. Pilih Peran Akses Staf:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('organizer');
                  setPasswordInput('');
                  setErrorMsg(null);
                }}
                className={`py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'organizer'
                    ? 'bg-[#0b192c] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-4 h-4 text-orange-400" />
                <span>Panitia / Admin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('judge');
                  setPasswordInput('');
                  setErrorMsg(null);
                }}
                className={`py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'judge'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4 text-blue-200" />
                <span>Juri Pos Lapangan</span>
              </button>
            </div>
          </div>

          {/* Form Logon Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'organizer' && (
              <div>
                <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-orange-600" />
                  <span>Email Staf / Admin Client (dari Super Admin):</span>
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Contoh: client@default.com atau email staf"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Masukkan email yang didaftarkan Super Admin (kosongkan jika menggunakan password demo standar).</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-orange-600" />
                  <span>Masukkan Kata Laluan / Password ({activeTab === 'organizer' ? 'Panitia' : 'Juri'}):</span>
                </label>
                {((activeTab === 'organizer' && adminPassword) || (activeTab === 'judge' && judgePassword)) && (
                  <button
                    type="button"
                    onClick={handleFillDemoPass}
                    className="text-[11px] text-orange-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    title="Klik untuk mengisi password konfigurasi lokal"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Gunakan Kredensial Tersimpan</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={activeTab === 'organizer' ? 'Masukkan password panitia / admin' : 'Masukkan password juri pos'}
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>Otentikasi Staf Resmi: Masukkan kredensial yang diterbitkan Super Admin.</span>
                <span className="text-slate-400">Sensitif huruf kapital</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5 animate-in shake duration-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'organizer'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 shadow-orange-500/20'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-600/20'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'Memverifikasi Hak Akses...' : `Otentikasi & Masuk ${activeTab === 'organizer' ? 'Organizer Hub' : 'Dashboard Juri'}`}</span>
            </button>
          </form>

          {/* Quick Helper Badge */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-orange-600" />
              <span>Informasi Keamanan Hak Akses Peran (RBAC)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Kata laluan ini disimpan secara terisolasi pada memori lokal peramban. Panitia Admin dapat mengubah kata laluan resmi Panitia & Juri kapan saja melalui menu <strong>Pengaturan</strong> di Organizer Hub.
            </p>
          </div>
        </div>

        {/* Right Column: Role Features & Access Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Panitia / Admin Capabilities Card */}
          <div className={`p-5 rounded-3xl border transition-all ${
            activeTab === 'organizer' 
              ? 'bg-[#0b192c] text-white border-orange-500/40 shadow-xl ring-2 ring-orange-500/20' 
              : 'bg-white text-slate-800 border-slate-200/90 shadow-sm opacity-80'
          }`}>
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-700/60 mb-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">Hak Akses Panitia / Admin</h3>
                <p className="text-[10px] text-slate-400">Akses Penuh Manajemen Perlombaan</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Buat, edit, dan kelola event orienteering & amazing race</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Petakan titik koordinat pos GPS & impor berkas rute GPX</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Cetak massal nomor dada BIB & stiker barcode QR Pos A4</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Kendalikan Master Clock balapan & siaran darurat ke HP peserta</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Ekspor rekapitulasi nilai akhir ke Excel (.XLSX) & CSV</span>
              </li>
            </ul>
          </div>

          {/* Juri Pos Capabilities Card */}
          <div className={`p-5 rounded-3xl border transition-all ${
            activeTab === 'judge' 
              ? 'bg-gradient-to-br from-blue-950 to-slate-900 text-white border-blue-500/40 shadow-xl ring-2 ring-blue-500/20' 
              : 'bg-white text-slate-800 border-slate-200/90 shadow-sm opacity-80'
          }`}>
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-700/60 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">Hak Akses Juri Pos Lapangan</h3>
                <p className="text-[10px] text-slate-400">Konsol Penilaian & Radar Pos</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Periksa & verifikasi foto unggahan tugas kelompok peserta</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Input skor manual & bonus ketangkasan lapangan</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Terbitkan sanksi penalti poin & penalti waktu pelanggaran</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Pantau lokasi GPS live peserta pada peta radar pos</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
