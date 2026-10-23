import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Key, 
  Phone, 
  Award, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  Copy,
  X,
  Mail,
  UserCheck,
  Printer,
  Pencil,
  Trash2,
  Filter,
  ShieldCheck,
  Tag,
  Compass,
  Building2,
  UserPlus
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { Team, TeamMember } from '../../types';
import { EditTeamModal } from './EditTeamModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { BatchBibPrintModal } from './BatchBibPrintModal';
import { ParticipantSimulationPanel } from './ParticipantSimulationPanel';
import { TeamRegistrationModal } from './TeamRegistrationModal';

interface TeamsViewProps {
  onShowToast: (msg: string) => void;
  onSelectTeamForParticipantPreview: (teamId: string) => void;
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
  'Campuran (Mixed)'
];

export const TeamsView: React.FC<TeamsViewProps> = ({
  onShowToast,
  onSelectTeamForParticipantPreview,
}) => {
  const { teams, registerTeam, updateTeam, deleteTeam, events, selectedEventId, isOfficialMode } = useRace();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [batchBibModalOpen, setBatchBibModalOpen] = useState(false);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];

  // Dynamically collect all categories across registered teams + presets
  const allCategories = useMemo(() => {
    const catSet = new Set<string>(PRESET_CATEGORIES);
    teams.forEach((t) => {
      if (t.category && t.category.trim()) {
        catSet.add(t.category.trim());
      }
    });
    return Array.from(catSet);
  }, [teams]);

  // Next suggested BIB
  const nextSuggestedBib = useMemo(() => {
    const nextNum = teams.length + 1;
    const letter = String.fromCharCode(65 + ((nextNum - 1) % 26));
    return `${letter}-${String(nextNum).padStart(2, '0')}`;
  }, [teams.length]);

  // Total members counted across all teams
  const totalMembersCount = useMemo(() => {
    return teams.reduce((acc, t) => acc + (t.members ? t.members.length : 0), 0);
  }, [teams]);

  // Category distribution
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    teams.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + 1;
    });
    return map;
  }, [teams]);

  const handleRegisterTeam = (teamData: {
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
  }) => {
    const result = registerTeam({
      eventId: selectedEventId || 'evt-01',
      name: teamData.name,
      category: teamData.category,
      organization: teamData.organization,
      leaderName: teamData.leaderName,
      leaderPhone: teamData.leaderPhone,
      leaderEmail: teamData.leaderEmail,
      members: teamData.members,
      customBibNumber: teamData.customBibNumber,
      customPinCode: teamData.customPinCode,
      color: teamData.color,
    });

    onShowToast(`Tim "${result.team.name}" berhasil didaftarkan! Nomor BIB: ${result.bibNumber}, PIN Masuk: ${result.pinCode}`);
    setIsAddModalOpen(false);
  };

  const handleSaveEditTeam = (teamId: string, updatedData: Partial<Team>) => {
    updateTeam(teamId, updatedData);
    onShowToast(`Data Tim "${updatedData.name || 'Peserta'}" & susunan anggota berhasil diperbarui!`);
  };

  const handleConfirmDeleteTeam = () => {
    if (deletingTeam) {
      const name = deletingTeam.name;
      deleteTeam(deletingTeam.id);
      onShowToast(`Tim "${name}" berhasil dihapus dari perlombaan.`);
      setDeletingTeam(null);
    }
  };

  const filteredTeams = teams.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.bibNumber.toLowerCase().includes(q) ||
      (t.organization && t.organization.toLowerCase().includes(q)) ||
      (t.members && t.members.some(m => m.name.toLowerCase().includes(q) || (m.role && m.role.toLowerCase().includes(q))));
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'Ketua Tim':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Navigators':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pelari':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Fotografer':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0b192c]">Pengelolaan Pendaftaran Tim & Anggota</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {teams.length} TIM TERDAFTAR
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              {totalMembersCount} ANGGOTA
            </span>
            {isOfficialMode && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                MODE RESMI
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Daftarkan regu peserta, tentukan kategori lomba (korporat, umum, pelajar, dsb.), kelola susunan nama personel anggota, dan cetak nomor dada (BIB) ber-QR.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {!isOfficialMode && (
            <button
              onClick={() => setSimulationModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all"
              title="Generate data dummy peserta massal untuk uji coba performa"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Simulasi Peserta</span>
            </button>
          )}

          <button
            onClick={() => setBatchBibModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all"
            title="Buka panel cetak nomor dada BIB dan kartu peserta A4"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Semua Nomor BIB ({teams.length} Tim)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Daftarkan Tim Baru</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Tim</span>
            <Users className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-[#0b192c]">{teams.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Semua regu terdaftar</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Personel Anggota</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-[#0b192c]">{totalMembersCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Personel dengan role aktif</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Kategori Lomba Aktif</span>
            <Tag className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-[#0b192c]">
            {Object.keys(categoryStats).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Divisi perlombaan</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">BIB Berikutnya</span>
            <Key className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-700">{nextSuggestedBib}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Generate otomatis</div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama tim, nama anggota, nomor BIB, atau instansi..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Kategori:</span>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 shrink-0 cursor-pointer"
            >
              <option value="all">Semua Kategori ({teams.length})</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} {categoryStats[cat] ? `(${categoryStats[cat]})` : '(0)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Filter Cepat:
          </span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-[#0b192c] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({teams.length})
          </button>
          {allCategories.filter(cat => (categoryStats[cat] || 0) > 0).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat} ({categoryStats[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Teams Grid or Empty State */}
      {filteredTeams.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${
            isOfficialMode ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            {isOfficialMode ? <ShieldCheck className="w-8 h-8" /> : <Users className="w-8 h-8" />}
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 mb-2">
            {isOfficialMode && teams.length === 0 ? 'Mode Resmi Aktif: Belum Ada Tim' : 'Tidak Ada Tim Ditemukan'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
            {isOfficialMode && teams.length === 0
              ? 'Seluruh data dummy simulasi telah dibersihkan. Klik tombol di bawah untuk mendaftarkan tim resmi pertama bersama susunan anggotanya.'
              : searchQuery || categoryFilter !== 'all' 
                ? 'Tidak ditemukan tim yang cocok dengan kata kunci pencarian atau filter kategori yang Anda pilih.'
                : 'Belum ada tim yang terdaftar di dalam event ini.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftarkan Tim Baru</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((team, index) => {
            const leaderMember = team.members?.find(m => m.role === 'Ketua Tim') || team.members?.[0];
            const leaderPhone = team.leaderPhone || leaderMember?.phone;

            return (
              <div 
                key={`${team.id}-${index}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-orange-300 hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  {/* Header card with action buttons */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${team.color}`} />
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-base truncate">{team.name}</h3>
                        {team.organization && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{team.organization}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {team.bibNumber}
                      </span>
                      <button
                        onClick={() => setEditingTeam(team)}
                        className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit tim, susunan nama anggota, dan kategori lomba"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingTeam(team)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus tim dari perlombaan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Kategori Lomba Tag */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200 truncate max-w-[200px]">
                      <Tag className="w-3 h-3 text-orange-500 shrink-0" />
                      <span className="truncate">{team.category}</span>
                    </span>

                    {leaderPhone && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{leaderPhone}</span>
                      </span>
                    )}
                  </div>

                  {/* Status and Points */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs mb-3.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Total Skor:</span>
                      <span className="font-extrabold text-orange-600 text-sm font-mono">{team.totalScore} Poin</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Kemajuan Pos:</span>
                      <span className="font-bold text-slate-800">{team.checkpointsCompleted}/{team.totalCheckpoints} Selesai</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Pos Terakhir:</span>
                      <span className="text-slate-700 font-medium truncate max-w-[150px]">{team.lastPosName}</span>
                    </div>
                  </div>

                  {/* Susunan Personel Anggota Regu */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-500" />
                        Susunan Anggota ({team.members?.length || 0}):
                      </span>
                      <button
                        onClick={() => setEditingTeam(team)}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
                      >
                        Kelola
                      </button>
                    </div>

                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {team.members && team.members.length > 0 ? (
                        team.members.map((m, idx) => (
                          <div 
                            key={idx} 
                            className="text-xs bg-slate-50/70 p-1.5 rounded-lg border border-slate-200/60 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-4 h-4 rounded-md bg-slate-200 text-slate-700 font-mono text-[9px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 truncate text-[11px]">{m.name}</span>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${getRoleBadgeClass(m.role)}`}>
                              {m.role}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 italic py-1">Belum ada rincian anggota.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-slate-500">
                      PIN: <strong className="text-slate-800">{team.pinCode || '••••'}</strong>
                    </span>
                    <button
                      onClick={() => {
                        const pin = team.pinCode || '••••';
                        navigator.clipboard.writeText(`BIB: ${team.bibNumber} | PIN: ${pin}`);
                        onShowToast(`Akses login Tim ${team.name} (BIB: ${team.bibNumber}, PIN: ${pin}) disalin!`);
                      }}
                      title="Salin nomor BIB dan PIN"
                      className="p-1 text-slate-400 hover:text-orange-500 rounded transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectTeamForParticipantPreview(team.id)}
                      className="px-3 py-1.5 bg-[#0b192c] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>Buka di HP</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Pendaftaran Tim Komprehensif (Panitia) */}
      <TeamRegistrationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onRegister={handleRegisterTeam}
        availableCategories={allCategories}
        nextSuggestedBib={nextSuggestedBib}
      />

      {/* Modal Edit Tim, Anggota, & Kategori */}
      <EditTeamModal
        isOpen={!!editingTeam}
        team={editingTeam}
        onClose={() => setEditingTeam(null)}
        onSave={handleSaveEditTeam}
      />

      {/* Modal Konfirmasi Hapus Tim */}
      <ConfirmDeleteModal
        isOpen={!!deletingTeam}
        title="Hapus Tim Ini?"
        message={`Apakah Anda yakin ingin menghapus tim "${deletingTeam?.name}" (BIB ${deletingTeam?.bibNumber}) dari perlombaan? Sesi login tim ini akan ditutup.`}
        itemName={deletingTeam?.name}
        itemType="tim"
        confirmText="Ya, Hapus Tim"
        onConfirm={handleConfirmDeleteTeam}
        onCancel={() => setDeletingTeam(null)}
      />

      {/* Modal Cetak Semua Nomor BIB Massal */}
      <BatchBibPrintModal
        isOpen={batchBibModalOpen}
        onClose={() => setBatchBibModalOpen(false)}
        teams={teams}
        currentEvent={currentEvent}
        onShowToast={onShowToast}
      />

      {/* Modal Simulasi Peserta & Uji Performa */}
      {simulationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl">
            <button
              onClick={() => setSimulationModalOpen(false)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer border border-slate-700 shadow-md"
              title="Tutup Panel Simulasi"
            >
              <X className="w-5 h-5" />
            </button>
            <ParticipantSimulationPanel
              onShowToast={onShowToast}
              onSelectTeamForParticipantPreview={(teamId) => {
                setSimulationModalOpen(false);
                onSelectTeamForParticipantPreview(teamId);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
