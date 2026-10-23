import React, { useState } from 'react';
import { 
  Compass, 
  LayoutDashboard, 
  Trophy, 
  UserCheck, 
  Smartphone, 
  Home, 
  Menu, 
  X,
  Calendar,
  Layers,
  Lock,
  LogOut,
  Shield,
  Key,
  RefreshCw,
  WifiOff,
  AlertCircle,
  Building2
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';

export type ActiveView = 
  | 'landing' 
  | 'organizer' 
  | 'event-list'
  | 'event-detail' 
  | 'participant' 
  | 'judge' 
  | 'leaderboard'
  | 'super-admin'
  | 'login'
  | 'mobile-app';

interface NavbarProps {
  currentView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onShowToast: (msg: string) => void;
  onOpenAuthModal?: (role: 'organizer' | 'judge') => void;
  activeEventId?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  onShowToast,
  onOpenAuthModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { 
    currentUserRole, 
    logoutRole, 
    hasAccess, 
    syncStatus, 
    firebaseUser, 
    signInWithGoogle, 
    signOutFirebase 
  } = useRace();

  const handleNavClick = (viewId: ActiveView) => {
    if (viewId === 'organizer') {
      if (!hasAccess('organizer')) {
        onShowToast('🔒 Akses Organizer Hub dikunci. Silakan masukkan password Panitia (Admin).');
        onSelectView('login');
        return;
      }
    } else if (viewId === 'judge') {
      if (!hasAccess('judge')) {
        onShowToast('🔒 Akses Dashboard Juri dikunci. Silakan masukkan password Juri atau Admin.');
        onSelectView('login');
        return;
      }
    }
    onSelectView(viewId);
  };

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; badge?: string; requiresRole?: 'organizer' | 'judge' }[] = [
    { id: 'landing', label: 'Beranda', icon: <Home className="w-4 h-4" /> },
    { id: 'super-admin', label: 'Super Admin', icon: <Building2 className="w-4 h-4 text-orange-400" />, badge: 'SaaS' },
    { id: 'login', label: 'Login Staf', icon: <Key className="w-4 h-4 text-orange-400" /> },
    { id: 'organizer', label: 'Organizer Hub', icon: <LayoutDashboard className="w-4 h-4" />, badge: '8 Menu', requiresRole: 'organizer' },
    { id: 'event-list', label: 'Daftar Event', icon: <Calendar className="w-4 h-4" /> },
    { id: 'event-detail', label: 'Detail Event', icon: <Layers className="w-4 h-4" /> },
    { id: 'mobile-app', label: 'App HP Peserta & Juri', icon: <Smartphone className="w-4 h-4 text-emerald-400" />, badge: 'PWA' },
    { id: 'participant', label: 'Peserta (HP)', icon: <Smartphone className="w-4 h-4" />, badge: 'Mobile' },
    { id: 'judge', label: 'Dashboard Juri', icon: <UserCheck className="w-4 h-4" />, requiresRole: 'judge' },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0b192c] border-b border-slate-800 shadow-lg text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div 
            onClick={() => onSelectView('landing')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight flex items-center gap-1.5">
                <span>RacePoint</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Platform
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Orienteering & Amazing Race
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const isLocked = item.requiresRole && !hasAccess(item.requiresRole);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {isLocked && (
                    <Lock className="w-3 h-3 text-amber-400 ml-0.5 shrink-0" />
                  )}
                  {item.badge && !isLocked && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action: Cloud Sync Status, Google Auth & Role Badge */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Quick Launch Mobile App Portal */}
            <button
              onClick={() => onSelectView('mobile-app')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                currentView === 'mobile-app'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-emerald-500/20'
                  : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60'
              }`}
              title="Buka Aplikasi Mobile khusus Peserta & Juri Pos"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>📱 App HP</span>
            </button>

            {/* Realtime Sync Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs shadow-inner">
              {syncStatus === 'synced' && (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold" title="Cloud Firestore aktif dan tersinkronisasi realtime">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="hidden xl:inline text-[11px]">Firestore Sync</span>
                </span>
              )}
              {syncStatus === 'syncing' && (
                <span className="flex items-center gap-1.5 text-sky-400 font-semibold" title="Menyinkronkan data dengan Cloud Firestore...">
                  <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                  <span className="hidden xl:inline text-[11px]">Sinkron...</span>
                </span>
              )}
              {syncStatus === 'offline' && (
                <span className="flex items-center gap-1.5 text-rose-400 font-semibold" title="Koneksi terputus. Mode offline aktif.">
                  <WifiOff className="w-3 h-3 text-rose-400" />
                  <span className="hidden xl:inline text-[11px]">Offline</span>
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold" title="Kendala sinkronisasi jaringan.">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  <span className="hidden xl:inline text-[11px]">Pending</span>
                </span>
              )}
            </div>

            {/* Google Auth Integration */}
            {firebaseUser ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200">
                {firebaseUser.photoURL ? (
                  <img src={firebaseUser.photoURL} alt="User" className="w-5 h-5 rounded-full object-cover border border-slate-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-orange-500 text-[10px] font-bold flex items-center justify-center text-white">
                    {firebaseUser.displayName?.[0] || firebaseUser.email?.[0] || 'G'}
                  </div>
                )}
                <span className="hidden xl:inline max-w-[90px] truncate text-[11px] font-medium">
                  {firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0]}
                </span>
                <button
                  onClick={async () => {
                    await signOutFirebase();
                    onShowToast('Akun Google berhasil keluar.');
                  }}
                  className="text-slate-400 hover:text-white ml-1 p-0.5 rounded cursor-pointer"
                  title="Keluar Akun Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={async () => {
                  const res = await signInWithGoogle();
                  if (res.success) {
                    onShowToast(res.message || 'Login Google berhasil!');
                  } else {
                    onShowToast(res.message || 'Gagal login Google.');
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                title="Masuk dengan Google untuk otorisasi Cloud Firestore"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.8 0 12s.7 3.2 1.9 5.6l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16C3.7 19.8 7.5 23 12 23z" />
                </svg>
                <span className="hidden sm:inline text-[11px]">Google</span>
              </button>
            )}

            {currentUserRole === 'organizer' && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-extrabold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-orange-400" />
                  <span>Panitia (Admin)</span>
                </span>
                <button
                  onClick={() => {
                    logoutRole();
                    onSelectView('landing');
                    onShowToast('🔒 Anda telah keluar dari sesi Admin Panitia.');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Keluar Sesi Admin"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {currentUserRole === 'judge' && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-extrabold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Juri Pos</span>
                </span>
                <button
                  onClick={() => {
                    logoutRole();
                    onSelectView('landing');
                    onShowToast('🔒 Anda telah keluar dari sesi Juri Pos.');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Keluar Sesi Juri"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {(currentUserRole === 'guest' || currentUserRole === 'participant') && (
              <button
                onClick={() => onOpenAuthModal && onOpenAuthModal('organizer')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Login Staf</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            {/* Mobile Sync Indicator */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px]">
              {syncStatus === 'synced' && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
              {syncStatus === 'syncing' && <RefreshCw className="w-2.5 h-2.5 animate-spin text-sky-400" />}
              {syncStatus === 'offline' && <WifiOff className="w-2.5 h-2.5 text-rose-400" />}
              {syncStatus === 'error' && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#071322] border-b border-slate-800 px-4 pt-2 pb-4 space-y-2 animate-in slide-in-from-top duration-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 flex items-center justify-between">
            <span>Peran Saat Ini: {currentUserRole.toUpperCase()}</span>
            {(currentUserRole === 'organizer' || currentUserRole === 'judge') && (
              <button
                onClick={() => {
                  logoutRole();
                  setMobileMenuOpen(false);
                  onSelectView('landing');
                  onShowToast('🔒 Anda telah keluar dari sesi.');
                }}
                className="text-orange-400 text-[10px] font-extrabold underline cursor-pointer"
              >
                Logout
              </button>
            )}
          </div>

          {/* Mobile Google Auth */}
          <div className="px-3 py-2 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
            {firebaseUser ? (
              <div className="flex items-center gap-2">
                {firebaseUser.photoURL ? (
                  <img src={firebaseUser.photoURL} alt="User" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-orange-500 text-[10px] font-bold flex items-center justify-center text-white">
                    {firebaseUser.email?.[0] || 'G'}
                  </div>
                )}
                <span className="text-xs text-slate-300 font-medium truncate max-w-[150px]">
                  {firebaseUser.email}
                </span>
              </div>
            ) : (
              <button
                onClick={async () => {
                  const res = await signInWithGoogle();
                  if (res.success) onShowToast(res.message || 'Login Google berhasil!');
                }}
                className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>Login dengan Akun Google</span>
              </button>
            )}
          </div>

          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const isLocked = item.requiresRole && !hasAccess(item.requiresRole);

            return (
              <button
                key={item.id}
                onClick={() => {
                  handleNavClick(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {isLocked ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 font-bold">
                    <Lock className="w-3 h-3" /> Lock
                  </span>
                ) : item.badge ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-300">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          {(currentUserRole === 'guest' || currentUserRole === 'participant') && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenAuthModal) onOpenAuthModal('organizer');
              }}
              className="w-full mt-2 py-2.5 px-3 bg-orange-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>Login Password Admin / Juri</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
