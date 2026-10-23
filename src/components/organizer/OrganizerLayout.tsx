import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  MapPin, 
  Users, 
  Flame, 
  Award, 
  Trophy, 
  Settings, 
  Menu, 
  X,
  Compass,
  ChevronRight,
  ShieldCheck,
  Search,
  Bell,
  Smartphone
} from 'lucide-react';
import { OrganizerMenu } from '../../types';
import { DashboardHomeView } from './DashboardHomeView';
import { EventListView } from './EventListView';
import { EventDetailView } from './EventDetailView';
import { CourseCheckpointView } from './CourseCheckpointView';
import { TeamsView } from './TeamsView';
import { ChallengesView } from './ChallengesView';
import { ScoringView } from './ScoringView';
import { ResultsView } from './ResultsView';
import { SettingsView } from './SettingsView';
import { useRace } from '../../context/RaceContext';

interface OrganizerLayoutProps {
  currentSubMenu: OrganizerMenu;
  onSelectSubMenu: (menu: OrganizerMenu) => void;
  onOpenEventDetail: (eventId: string) => void;
  selectedEventId: string;
  onBackToEventList: () => void;
  isViewingEventDetail: boolean;
  onShowToast: (msg: string) => void;
  onSwitchToParticipant: () => void;
  onOpenLeaderboard: () => void;
  onSelectTeamForParticipantPreview: (teamId: string) => void;
  onOpenMobileApp?: () => void;
}

export const OrganizerLayout: React.FC<OrganizerLayoutProps> = ({
  currentSubMenu,
  onSelectSubMenu,
  onOpenEventDetail,
  selectedEventId,
  onBackToEventList,
  isViewingEventDetail,
  onShowToast,
  onSwitchToParticipant,
  onOpenLeaderboard,
  onSelectTeamForParticipantPreview,
  onOpenMobileApp,
}) => {
  const { isOfficialMode } = useRace();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Exact 8 required menu items from user instructions:
  const menuList: { id: OrganizerMenu; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'events', label: 'Event', icon: <Calendar className="w-5 h-5" />, badge: '5' },
    { id: 'checkpoints', label: 'Course dan checkpoint', icon: <MapPin className="w-5 h-5" /> },
    { id: 'teams', label: 'Tim dan peserta', icon: <Users className="w-5 h-5" /> },
    { id: 'challenges', label: 'Challenge', icon: <Flame className="w-5 h-5" /> },
    { id: 'scoring', label: 'Penilaian', icon: <Award className="w-5 h-5" /> },
    { id: 'results', label: 'Hasil', icon: <Trophy className="w-5 h-5" /> },
    { id: 'settings', label: 'Pengaturan', icon: <Settings className="w-5 h-5" /> },
  ];

  const renderContent = () => {
    if (isViewingEventDetail) {
      return (
        <EventDetailView 
          eventId={selectedEventId}
          onBack={onBackToEventList}
          onShowToast={onShowToast}
          onSwitchToParticipant={onSwitchToParticipant}
        />
      );
    }

    switch (currentSubMenu) {
      case 'dashboard':
        return (
          <DashboardHomeView
            onSelectMenu={onSelectSubMenu}
            onOpenEventDetail={onOpenEventDetail}
            onShowToast={onShowToast}
            onOpenLeaderboard={onOpenLeaderboard}
            onSelectTeamForParticipantPreview={onSelectTeamForParticipantPreview}
          />
        );
      case 'events':
        return (
          <EventListView
            onOpenEventDetail={onOpenEventDetail}
            onShowToast={onShowToast}
          />
        );
      case 'checkpoints':
        return <CourseCheckpointView onShowToast={onShowToast} />;
      case 'teams':
        return (
          <TeamsView
            onShowToast={onShowToast}
            onSelectTeamForParticipantPreview={onSelectTeamForParticipantPreview}
          />
        );
      case 'challenges':
        return <ChallengesView onShowToast={onShowToast} />;
      case 'scoring':
        return <ScoringView onShowToast={onShowToast} />;
      case 'results':
        return (
          <ResultsView
            onOpenLeaderboard={onOpenLeaderboard}
            onShowToast={onShowToast}
          />
        );
      case 'settings':
        return <SettingsView onShowToast={onShowToast} />;
      default:
        return (
          <DashboardHomeView
            onSelectMenu={onSelectSubMenu}
            onOpenEventDetail={onOpenEventDetail}
            onShowToast={onShowToast}
          />
        );
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar Desktop */}
      <aside 
        className={`hidden lg:flex flex-col bg-[#0b192c] text-white border-r border-slate-800 transition-all duration-300 shrink-0 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
              <span className="font-bold text-sm tracking-tight text-white uppercase text-[11px] tracking-wider">
                Panel Organizer
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mx-auto cursor-pointer"
            title={sidebarCollapsed ? 'Perluas Menu' : 'Perkecil Menu'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* 8 Required Menu Items */}
        <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
          {menuList.map((item) => {
            const isActive = !isViewingEventDetail && currentSubMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isViewingEventDetail) onBackToEventList();
                  onSelectSubMenu(item.id);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className="shrink-0">{item.icon}</div>
                {!sidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between text-left">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isActive ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Mobile App Launcher */}
        {!sidebarCollapsed && onOpenMobileApp && (
          <div className="px-3 py-2 border-t border-slate-800">
            <button
              onClick={onOpenMobileApp}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>App HP Peserta & Juri</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                PWA
              </span>
            </button>
          </div>
        )}

        {/* Sidebar Footer */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-slate-800 bg-[#071322]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs border border-orange-500/30">
                ADM
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-xs text-white truncate">Ketua Pelaksana</div>
                <div className="text-[10px] text-slate-400 truncate">demo-organizer@race.id</div>
              </div>
            </div>

            {isOfficialMode ? (
              <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Mode Resmi (Live)
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
            ) : (
              <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[10px] font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Mode Demo & Simulasi
                </span>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Mobile Submenu Trigger Bar */}
      <div className="lg:hidden bg-slate-900 text-white p-3 border-b border-slate-800 flex items-center justify-between">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="flex items-center gap-2 text-xs font-bold text-orange-400 bg-slate-800 px-3 py-1.5 rounded-lg cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>Menu Organizer ({menuList.find((m) => m.id === currentSubMenu)?.label})</span>
        </button>
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
          isOfficialMode 
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' 
            : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
        }`}>
          {isOfficialMode ? '🛡️ Resmi (Live)' : '🧪 Demo'}
        </span>
      </div>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="lg:hidden bg-[#0b192c] text-white p-4 border-b border-slate-800 space-y-1 animate-in slide-in-from-top duration-200">
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase">
            <span>Pilih Menu Organizer:</span>
            <button onClick={() => setMobileSidebarOpen(false)} className="p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          {menuList.map((item) => {
            const isActive = !isViewingEventDetail && currentSubMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isViewingEventDetail) onBackToEventList();
                  onSelectSubMenu(item.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium cursor-pointer ${
                  isActive ? 'bg-orange-500 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Panel Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {renderContent()}
      </main>
    </div>
  );
};
