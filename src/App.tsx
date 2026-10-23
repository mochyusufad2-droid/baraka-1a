import React, { useState } from 'react';
import { Navbar, ActiveView } from './components/common/Navbar';
import { DemoNoticeBanner, RoadmapModal } from './components/common/DemoNoticeBanner';
import { DemoToast } from './components/common/DemoToast';
import { AuthModal } from './components/common/AuthModal';
import { AdminJudgeLoginView } from './components/common/AdminJudgeLoginView';
import { LandingPage } from './components/landing/LandingPage';
import { OrganizerLayout } from './components/organizer/OrganizerLayout';
import { EventListView } from './components/organizer/EventListView';
import { EventDetailView } from './components/organizer/EventDetailView';
import { ParticipantView } from './components/participant/ParticipantView';
import { JudgeDashboardView } from './components/judge/JudgeDashboardView';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { MobileAppPortal } from './components/mobile/MobileAppPortal';
import { OrganizerMenu } from './types';
import { Compass, ShieldCheck, Smartphone, UserCheck, Trophy, Lock, Shield, Key } from 'lucide-react';
import { RaceProvider, useRace, UserRole } from './context/RaceContext';

function AppContent() {
  const [currentView, setCurrentView] = useState<ActiveView>('landing');
  const [organizerSubMenu, setOrganizerSubMenu] = useState<OrganizerMenu>('dashboard');
  const [isViewingEventDetail, setIsViewingEventDetail] = useState<boolean>(false);
  const [mobileInitialRole, setMobileInitialRole] = useState<'participant' | 'judge'>('participant');
  const { setActiveTeamId, hasAccess, currentUserRole, selectedEventId, setSelectedEventId } = useRace();

  // Detect URL parameter on load (e.g. ?view=mobile-app&role=judge)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      const roleParam = params.get('role');
      if (roleParam === 'judge' || roleParam === 'participant') {
        setMobileInitialRole(roleParam);
      }
      if (viewParam === 'mobile-app' || viewParam === 'mobile') {
        setCurrentView('mobile-app');
      }
    }
  }, []);

  // Modal & Toast States
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [roadmapModalOpen, setRoadmapModalOpen] = useState<boolean>(false);

  // Auth & RBAC Modal State
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authTargetRole, setAuthTargetRole] = useState<'organizer' | 'judge'>('organizer');

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleOpenAuthModal = (role: 'organizer' | 'judge') => {
    setAuthTargetRole(role);
    setAuthModalOpen(true);
  };

  const handleOpenEventDetail = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentView('event-detail');
  };

  const handleSelectTeamForParticipant = (teamId: string) => {
    setActiveTeamId(teamId);
    setCurrentView('participant');
    showToast(`Beralih ke mode HP untuk Tim terpilih.`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* 1. Notice Banner: Stage 2 Active State & Features */}
      <DemoNoticeBanner onOpenRoadmapModal={() => setRoadmapModalOpen(true)} />

      {/* 2. Top Navigation Bar */}
      <Navbar
        currentView={currentView}
        onSelectView={(view) => {
          if (view === 'event-detail') {
            setSelectedEventId('evt-01');
          }
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onShowToast={showToast}
        onOpenAuthModal={handleOpenAuthModal}
        activeEventId={selectedEventId}
      />

      {/* 3. Main Body Views Routing */}
      <main className="flex-1">
        {/* VIEW 1: LANDING PAGE */}
        {currentView === 'landing' && (
          <LandingPage
            onSelectView={(view) => {
              if (view === 'organizer' && !hasAccess('organizer')) {
                handleOpenAuthModal('organizer');
                return;
              }
              if (view === 'judge' && !hasAccess('judge')) {
                handleOpenAuthModal('judge');
                return;
              }
              setCurrentView(view);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onShowToast={showToast}
          />
        )}

        {/* VIEW 2: ORGANIZER DASHBOARD (Protected by RBAC) */}
        {currentView === 'organizer' && (
          hasAccess('organizer') ? (
            <OrganizerLayout
              currentSubMenu={organizerSubMenu}
              onSelectSubMenu={(menu) => setOrganizerSubMenu(menu)}
              onOpenEventDetail={handleOpenEventDetail}
              selectedEventId={selectedEventId}
              onBackToEventList={() => setOrganizerSubMenu('events')}
              isViewingEventDetail={false}
              onShowToast={showToast}
              onSwitchToParticipant={() => setCurrentView('participant')}
              onOpenLeaderboard={() => setCurrentView('leaderboard')}
              onSelectTeamForParticipantPreview={handleSelectTeamForParticipant}
              onOpenMobileApp={() => setCurrentView('mobile-app')}
            />
          ) : (
            <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 border-2 border-amber-300 flex items-center justify-center mx-auto shadow-lg">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-extrabold uppercase">
                  PEMBATASAN HAK AKSES (RBAC)
                </span>
                <h2 className="text-2xl font-black text-slate-900">Akses Organizer Hub Dikunci</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Anda belum terautentikasi sebagai Panitia (Admin). Halaman ini memerlukan kata laluan / password resmi penyelenggara.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => handleOpenAuthModal('organizer')}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Key className="w-4 h-4" />
                  <span>Masukkan Password Panitia</span>
                </button>
                <button
                  onClick={() => setCurrentView('landing')}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          )
        )}

        {/* VIEW 3: DAFTAR EVENT */}
        {currentView === 'event-list' && (
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <EventListView
              onOpenEventDetail={handleOpenEventDetail}
              onShowToast={showToast}
            />
          </div>
        )}

        {/* VIEW 4: DETAIL EVENT */}
        {currentView === 'event-detail' && (
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <EventDetailView
              eventId={selectedEventId}
              onBack={() => setCurrentView('event-list')}
              onShowToast={showToast}
              onSwitchToParticipant={() => setCurrentView('participant')}
            />
          </div>
        )}

        {/* VIEW 5: HALAMAN PESERTA (MOBILE-FIRST DENGAN LOGIN BIB & PIN) */}
        {currentView === 'participant' && (
          <ParticipantView
            onShowToast={showToast}
            onOpenLeaderboard={() => setCurrentView('leaderboard')}
          />
        )}

        {/* VIEW 6: DASHBOARD JURI / FASILITATOR (Protected by RBAC) */}
        {currentView === 'judge' && (
          hasAccess('judge') ? (
            <JudgeDashboardView onShowToast={showToast} />
          ) : (
            <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 border-2 border-blue-300 flex items-center justify-center mx-auto shadow-lg">
                <UserCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-extrabold uppercase">
                  PEMBATASAN HAK AKSES (RBAC)
                </span>
                <h2 className="text-2xl font-black text-slate-900">Akses Dashboard Juri Dikunci</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Anda belum terautentikasi sebagai Juri Pos atau Panitia. Silakan masukkan password Juri untuk melakukan penilaian lapangan.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => handleOpenAuthModal('judge')}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl text-xs shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Key className="w-4 h-4" />
                  <span>Masukkan Password Juri Pos</span>
                </button>
                <button
                  onClick={() => setCurrentView('landing')}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          )
        )}

        {/* VIEW 7: HALAMAN LEADERBOARD (PAPAN SKOR LANGSUNG SINKRON) */}
        {currentView === 'leaderboard' && (
          <LeaderboardView onShowToast={showToast} />
        )}

        {/* VIEW 8: DASHBOARD SUPER ADMIN SAAS */}
        {currentView === 'super-admin' && (
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <SuperAdminDashboard onShowToast={showToast} />
          </div>
        )}

        {/* VIEW 8: HALAMAN LOGON STAF & JURI (DEDICATED STAFF PORTAL) */}
        {currentView === 'login' && (
          <AdminJudgeLoginView
            onShowToast={showToast}
            onNavigateToView={(view) => {
              if (view === 'organizer') {
                setCurrentView('organizer');
              } else if (view === 'judge') {
                setCurrentView('judge');
              } else {
                setCurrentView('landing');
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* VIEW 9: APLIKASI MOBILE KHUSUS PESERTA & JURI (PWA / MOBILE SHELL) */}
        {currentView === 'mobile-app' && (
          <MobileAppPortal
            initialRole={mobileInitialRole}
            onShowToast={showToast}
            onOpenLeaderboard={() => setCurrentView('leaderboard')}
            onExitMobilePortal={() => setCurrentView('landing')}
          />
        )}
      </main>

      {/* Auth Modal for RBAC */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        targetRole={authTargetRole}
        onSuccessNavigate={(role) => {
          if (role === 'organizer') {
            setCurrentView('organizer');
          } else if (role === 'judge') {
            setCurrentView('judge');
          }
        }}
        onShowToast={showToast}
      />

      {/* 4. Global Footer */}
      <footer className="bg-[#0b192c] text-slate-400 border-t border-slate-800 text-xs py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold shadow-sm">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-white text-sm">Orienteering & Amazing Race Platform</div>
              <div className="text-[11px] text-slate-400">Anti-Speedrun Jeda Antar-Pos, Cetak Massal BIB & QR Pos, Manajemen Tim Lengkap</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
            <button 
              onClick={() => setCurrentView('landing')} 
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              Beranda
            </button>
            <button 
              onClick={() => { setCurrentView('organizer'); setOrganizerSubMenu('dashboard'); }} 
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              Organizer Hub
            </button>
            <button 
              onClick={() => setCurrentView('mobile-app')} 
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>📱 App HP (Peserta & Juri)</span>
            </button>
            <button 
              onClick={() => setCurrentView('participant')} 
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              Mode Peserta (HP)
            </button>
            <button 
              onClick={() => setCurrentView('judge')} 
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              Dashboard Juri
            </button>
            <button 
              onClick={() => setCurrentView('leaderboard')} 
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              Leaderboard
            </button>
            <button 
              onClick={() => setCurrentView('super-admin')} 
              className="text-orange-400 hover:text-orange-300 font-bold cursor-pointer"
            >
              Super Admin
            </button>
          </div>

          <div className="text-[11px] text-slate-500">
            Sistem interaktif terintegrasi. Data disimpan di LocalStorage peramban.
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      <DemoToast 
        message={toastMessage} 
        onClose={() => setToastMessage(null)} 
      />

      {/* Transparency & Roadmap Modal */}
      <RoadmapModal
        isOpen={roadmapModalOpen}
        onClose={() => setRoadmapModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <RaceProvider>
      <AppContent />
    </RaceProvider>
  );
}
