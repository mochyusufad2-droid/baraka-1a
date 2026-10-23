import React, { useState } from 'react';
import { Shield, UserCheck, Lock, Eye, EyeOff, Key, X, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { useRace, UserRole } from '../../context/RaceContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole?: 'organizer' | 'judge';
  onSuccessNavigate?: (role: UserRole) => void;
  onShowToast: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  targetRole = 'organizer',
  onSuccessNavigate,
  onShowToast
}) => {
  const { loginAsRole, adminPassword, judgePassword } = useRace();
  const [activeTab, setActiveTab] = useState<'organizer' | 'judge'>(targetRole);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync activeTab if targetRole changes when opening
  React.useEffect(() => {
    setActiveTab(targetRole);
    setPasswordInput('');
    setErrorMsg(null);
  }, [targetRole, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const result = loginAsRole(activeTab, passwordInput);
    if (result.success) {
      onShowToast(result.message);
      if (onSuccessNavigate) {
        onSuccessNavigate(activeTab);
      }
      onClose();
    } else {
      setErrorMsg(result.message);
    }
  };

  const fillDemoPassword = () => {
    if (activeTab === 'organizer') {
      setPasswordInput(adminPassword);
    } else {
      setPasswordInput(judgePassword);
    }
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-white relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-[#0b192c] via-slate-900 to-blue-950 border-b border-slate-800 text-center space-y-2 pt-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/10">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            Verifikasi Kata Laluan / Password
          </h3>
          <p className="text-xs text-slate-300">
            Akses ke halaman ini dibatasi oleh Sistem Pembatasan Hak Akses (RBAC). Masukkan kata laluan resmi Anda.
          </p>

          {/* Role Selection Tabs */}
          <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 mt-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('organizer');
                setPasswordInput('');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'organizer'
                  ? 'bg-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Panitia (Admin)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('judge');
                setPasswordInput('');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'judge'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Juri Pos</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-300 flex items-start gap-2.5 animate-in shake duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Password Akses {activeTab === 'organizer' ? 'Panitia / Admin' : 'Juri Pos'}:</span>
              <span className="text-[10px] text-orange-400 font-mono">Sensitif Kapital</span>
            </label>

            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={activeTab === 'organizer' ? 'Masukkan password admin...' : 'Masukkan password juri...'}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Demo Helper */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-orange-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Password Demo Bawaan:</span>
              </div>
              <button
                type="button"
                onClick={fillDemoPassword}
                className="text-[11px] font-extrabold text-orange-400 hover:underline cursor-pointer"
              >
                Isi Otomatis
              </button>
            </div>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg flex items-center justify-between">
              <span>{activeTab === 'organizer' ? 'Panitia (Admin)' : 'Juri Pos'}:</span>
              <span className="text-emerald-400 font-bold font-mono">
                {activeTab === 'organizer' ? adminPassword : judgePassword}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verifikasi & Masuk</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
