import React, { useState } from 'react';
import { 
  Users, 
  MapPin, 
  Clock, 
  Award, 
  AlertTriangle, 
  ArrowUpRight, 
  Play, 
  ChevronRight, 
  Activity,
  CheckCircle2,
  Calendar,
  Compass,
  Navigation,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { OrganizerMenu } from '../../types';
import { LiveRaceControlPanel } from './LiveRaceControlPanel';
import { InteractiveCheckpointMap } from './InteractiveCheckpointMap';
import { SimulationModePanel } from './SimulationModePanel';
import { ParticipantSimulationPanel } from './ParticipantSimulationPanel';
import { OfficialModeModal } from './OfficialModeModal';

interface DashboardHomeViewProps {
  onSelectMenu: (menu: OrganizerMenu) => void;
  onOpenEventDetail: (eventId: string) => void;
  onShowToast: (msg: string) => void;
  onOpenLeaderboard?: () => void;
  onSelectTeamForParticipantPreview?: (teamId: string) => void;
}

export const DashboardHomeView: React.FC<DashboardHomeViewProps> = ({
  onSelectMenu,
  onOpenEventDetail,
  onShowToast,
  onOpenLeaderboard,
  onSelectTeamForParticipantPreview,
}) => {
  const { 
    events, 
    teams, 
    checkpoints, 
    createCheckpoint, 
    updateCheckpoint, 
    deleteCheckpoint,
    isOfficialMode,
    activateOfficialMode,
    switchToDemoMode
  } = useRace();
  const [showMapSection, setShowMapSection] = useState(true);
  const [simulationTab, setSimulationTab] = useState<'participants' | 'scan_judge' | 'both'>('participants');
  const [simulationExpanded, setSimulationExpanded] = useState(true);
  const [officialModalOpen, setOfficialModalOpen] = useState(false);
  const activeEvent = events[0] || {
    id: 'evt-01',
    title: 'Amazing Race Event',
    date: 'Hari Ini',
    timeRange: '08:00 - 13:00 WIB',
    location: 'Area Terbuka',
  };

  const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const topTeam = sortedTeams[0] || teams[0];
  const simulatedTeamsCount = teams.filter(
    (t) => t.id.startsWith('sim-team-') || (t as any).isSimulated === true
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Active Event Banner */}
      <div className={`rounded-2xl p-6 text-white shadow-md border transition-all ${
        isOfficialMode 
          ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/40 shadow-emerald-950/20' 
          : 'bg-gradient-to-r from-[#0b192c] via-slate-900 to-blue-950 border-slate-800'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {isOfficialMode ? (
                <>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    MODE RESMI / LIVE EVENT
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-200 font-mono border border-emerald-700/50">
                    DATA BERSIH HARI-H
                  </span>
                </>
              ) : (
                <>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    Mode Demo & Uji Coba
                  </span>
                  <span className="text-xs text-orange-400 font-mono">DUMMY PRESET</span>
                </>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              {activeEvent.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-orange-400" /> {activeEvent.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-400" /> {activeEvent.timeRange}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-orange-400" /> {activeEvent.location}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Tombol Utama Mode Resmi */}
            {!isOfficialMode ? (
              <button
                onClick={() => setOfficialModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2 border border-emerald-400/40 cursor-pointer animate-pulse"
                title="Bersihkan seluruh data dummy dan siapkan event nyata untuk hari-H"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>Mode Resmi (Siap Hari-H)</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (window.confirm('Beralih kembali ke Mode Demo? Data preset simulasi akan dipulihkan untuk pengujian.')) {
                    switchToDemoMode();
                    onShowToast('Mode Demo diaktifkan. Data simulasi dipulihkan.');
                  }
                }}
                className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title="Kembalikan ke mode simulasi & preset dummy untuk pengujian"
              >
                Beralih ke Demo
              </button>
            )}

            <button
              onClick={() => onOpenEventDetail(activeEvent.id)}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Kelola Event</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Race Control Deck */}
      <LiveRaceControlPanel onShowToast={onShowToast} />

      {/* Simulation & Benchmark Suite (Participant Load Generator & Interactive QR Scan / Judge) */}
      <div id="simulation-suite-section" className="space-y-3">
        {isOfficialMode ? (
          <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 text-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Mode Resmi Aktif — Data Dummy Dikunci
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                    Proteksi Hari-H
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Generator tim dummy disembunyikan agar data perlombaan resmi tetap bersih dan akurat.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Ingin beralih kembali ke Mode Demo untuk mencoba simulasi peserta?')) {
                    switchToDemoMode();
                    onShowToast('Mode Demo diaktifkan. Data simulasi dipulihkan.');
                  }
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                Beralih ke Mode Demo
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab & Collapse Navigation Header */}
            <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSimulationTab('participants');
                    setSimulationExpanded(true);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    simulationTab === 'participants'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Simulasi Peserta (Data Dummy)</span>
                  {simulatedTeamsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500 text-white font-mono font-bold leading-none">
                      {simulatedTeamsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSimulationTab('scan_judge');
                    setSimulationExpanded(true);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    simulationTab === 'scan_judge'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulasi Scan QR & Juri</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSimulationTab('both');
                    setSimulationExpanded(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all hidden md:flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    simulationTab === 'both'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title="Tampilkan kedua panel simulasi sekaligus"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Keduanya</span>
                </button>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 px-1">
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Mode Uji Coba Pra-Event
                </span>
                <button
                  type="button"
                  onClick={() => setSimulationExpanded(!simulationExpanded)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>{simulationExpanded ? 'Sembunyikan Panel' : 'Buka Panel Simulasi'}</span>
                  {simulationExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Panel Container */}
            {simulationExpanded && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {(simulationTab === 'participants' || simulationTab === 'both') && (
                  <ParticipantSimulationPanel
                    onShowToast={onShowToast}
                    onOpenLeaderboard={onOpenLeaderboard || (() => onSelectMenu('results'))}
                    onSelectTeamForParticipantPreview={onSelectTeamForParticipantPreview}
                  />
                )}

                {(simulationTab === 'scan_judge' || simulationTab === 'both') && (
                  <SimulationModePanel 
                    onShowToast={onShowToast} 
                    onOpenLeaderboard={onOpenLeaderboard || (() => onSelectMenu('results'))} 
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Key Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => onSelectMenu('teams')}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
          title="Buka menu Tim & Kelola Pendaftaran Peserta"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tim Terdaftar</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0b192c]">
            {teams.length} <span className="text-xs font-normal text-slate-500">Tim Aktif</span>
          </div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Kelola Pendaftaran
            </span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Checkpoint</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0b192c]">
            {checkpoints.length} <span className="text-xs font-normal text-slate-500">Pos Kontrol</span>
          </div>
          <div className="text-[11px] text-orange-600 font-semibold mt-1 flex items-center gap-1">
            <span>Kode QR Siap Dicetak</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Durasi Berjalan</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0b192c]">
            01:45 <span className="text-xs font-normal text-slate-500">/ 03:00 Jam</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Target selesai: 13:00 WIB
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Pemimpin Klasemen</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-extrabold text-[#0b192c] truncate">
            {topTeam?.name || 'Belum Ada'}
          </div>
          <div className="text-[11px] text-amber-600 font-bold mt-1">
            {topTeam ? `${topTeam.totalScore} Poin (${topTeam.checkpointsCompleted} pos)` : '0 Poin'}
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Map Section for Orienteering Checkpoint Visual Mapping */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                Pemetaan Visual Titik Pos Orienteering (Peta Interaktif Leaflet)
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-extrabold uppercase">
                  {checkpoints.length} Pos Terpasang
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Petakan titik lat/lng pos secara visual di lokasi event: Klik lokasi pada peta untuk menambah titik pos baru secara langsung, atau drag marker di peta untuk menggeser koordinat posisi pos secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSelectMenu('checkpoints')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5 text-orange-600" />
              <span>Kelola Rute Complete</span>
            </button>
            <button
              onClick={() => setShowMapSection(!showMapSection)}
              className="px-3 py-2 bg-[#0b192c] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {showMapSection ? 'Sembunyikan Peta' : 'Tampilkan Peta'}
            </button>
          </div>
        </div>

        {showMapSection && (
          <div className="animate-in fade-in duration-200">
            <InteractiveCheckpointMap
              checkpoints={checkpoints}
              gpxRouteData={activeEvent?.gpxRouteData}
              createCheckpoint={createCheckpoint}
              updateCheckpoint={updateCheckpoint}
              deleteCheckpoint={deleteCheckpoint}
              onShowToast={onShowToast}
            />
          </div>
        )}
      </div>

      {/* Grid: Live Progress by Teams & Checkpoint Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Real-time Team Racing Progress */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Progress Tim di Lintasan</h3>
              <p className="text-xs text-slate-500">Status pencapaian pos checkpoint terupdate secara real-time</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectMenu('teams')}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Daftarkan Tim</span>
              </button>
              <button
                onClick={() => onSelectMenu('teams')}
                className="text-xs font-semibold text-slate-600 hover:text-orange-600 flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100"
              >
                <span>Semua Tim ({teams.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {sortedTeams.slice(0, 5).map((team, idx) => {
              const progressPct = Math.min(100, Math.round((team.checkpointsCompleted / team.totalCheckpoints) * 100));
              return (
                <div key={team.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-slate-100 font-mono text-xs font-bold text-slate-600 flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{team.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {team.bibNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{team.category}</span>
                        <span>•</span>
                        <span className="text-orange-600 font-medium">{team.lastPosName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:w-64">
                    <div className="flex-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                        <span>{team.checkpointsCompleted}/{team.totalCheckpoints} Pos</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-slate-900 text-sm font-mono">{team.totalScore}</div>
                      <div className="text-[10px] text-slate-400">Poin</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Quick Shortcuts & Alert Center */}
        <div className="space-y-5">
          {/* Pos Status Overview */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Pos Checkpoint Aktif ({checkpoints.length})</h3>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {checkpoints.map((cp, idx) => (
                <div key={`${cp.id}-${idx}`} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="font-medium text-slate-700 truncate max-w-[170px]">{cp.name}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold shrink-0">
                    +{cp.points} Pts
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onSelectMenu('checkpoints')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Kelola Pos & Cetak QR
            </button>
          </div>

          {/* Quick Menu Launcher */}
          <div className="bg-[#0b192c] text-white rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-white">Aksi Cepat Organizer:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button 
                onClick={() => onSelectMenu('events')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-left font-medium transition-colors cursor-pointer"
              >
                + Buat Event
              </button>
              <button 
                onClick={() => onSelectMenu('checkpoints')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-left font-medium transition-colors cursor-pointer"
              >
                Cetak Stiker QR
              </button>
              <button 
                onClick={() => onSelectMenu('challenges')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-left font-medium transition-colors cursor-pointer"
              >
                Antrean Tugas
              </button>
              <button 
                onClick={() => onSelectMenu('results')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-left font-medium transition-colors cursor-pointer"
              >
                Podium Skor
              </button>
              <button 
                onClick={() => {
                  if (isOfficialMode) {
                    onShowToast('Mode Resmi sedang aktif. Seluruh data dummy terkunci.');
                  } else {
                    setOfficialModalOpen(true);
                  }
                }}
                className={`col-span-2 p-2.5 rounded-xl text-left font-semibold transition-all cursor-pointer border flex items-center justify-between shadow-xs ${
                  isOfficialMode
                    ? 'bg-gradient-to-r from-emerald-950/90 to-teal-950/90 hover:from-emerald-900 hover:to-teal-900 border-emerald-500/40 text-emerald-100'
                    : 'bg-gradient-to-r from-emerald-900/80 to-slate-900 hover:from-emerald-800 hover:to-slate-800 border-emerald-500/30 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>{isOfficialMode ? 'Mode Resmi: Siap Lomba Hari-H' : 'Aktifkan Mode Resmi (Live Event)'}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {isOfficialMode ? 'LIVE' : 'BERSIHKAN DUMMY'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Official Mode Modal Dialog */}
      <OfficialModeModal
        isOpen={officialModalOpen}
        onClose={() => setOfficialModalOpen(false)}
        currentEventTitle={activeEvent.title}
        currentLocation={activeEvent.location}
        onConfirm={(options) => {
          activateOfficialMode(options);
          onShowToast(`Mode Resmi Diaktifkan: Event "${options.title}" siap dijalankan.`);
        }}
      />
    </div>
  );
};
