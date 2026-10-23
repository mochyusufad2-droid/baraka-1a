import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Flag, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  ArrowRight,
  Sparkles,
  CheckCircle,
  FileText,
  Pencil,
  Trash2,
  BookOpen
} from 'lucide-react';
import { useRace } from '../../context/RaceContext';
import { EventItem, EventStatus } from '../../types';
import { CreateEventModal } from './CreateEventModal';
import { EditEventModal } from './EditEventModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface EventListViewProps {
  onOpenEventDetail: (eventId: string) => void;
  onShowToast: (msg: string) => void;
}

export const EventListView: React.FC<EventListViewProps> = ({
  onOpenEventDetail,
  onShowToast,
}) => {
  const { events, createEvent, updateEvent, deleteEvent } = useRace();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);

  const filteredEvents = events.filter((evt) => {
    const matchesFilter = filterStatus === 'all' || evt.status === filterStatus;
    const matchesSearch = 
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.organizerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            Sedang Berlangsung
          </span>
        );
      case 'draft':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1">
            <FileText className="w-3 h-3 text-amber-700" />
            Konsep (Draft)
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-slate-500" />
            Telah Selesai
          </span>
        );
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'orienteering': return 'Orienteering Alam';
      case 'amazing_race': return 'Amazing Race Korporat';
      case 'outbound': return 'Outbound & Team Building';
      case 'school': return 'Sekolah & Komunitas';
      case 'indoor_qr': return 'Indoor QR Game';
      default: return 'Event Petualangan';
    }
  };

  const handleConfirmDelete = () => {
    if (deletingEvent) {
      const title = deletingEvent.title;
      deleteEvent(deletingEvent.id);
      onShowToast(`Event "${title}" berhasil dihapus.`);
      setDeletingEvent(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0b192c]">Daftar Event</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {events.length} EVENT TERDATA
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola seluruh rangkaian perlombaan, aturan lomba, sistem pembobotan nilai, dan rute checkpoint.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Event Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama event, lokasi, atau panitia..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { id: 'all', label: 'Semua Status' },
            { id: 'active', label: 'Sedang Berjalan' },
            { id: 'draft', label: 'Draft' },
            { id: 'completed', label: 'Selesai' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-[#0b192c] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredEvents.map((evt) => (
          <div 
            key={evt.id}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
          >
            <div>
              {/* Event Card Header */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {getEventTypeLabel(evt.eventType)}
                    </span>
                    {evt.visibility === 'private' ? (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold flex items-center gap-1" title={`Kode Event Privat: ${evt.eventCode}`}>
                        🔒 Privat: <span className="font-mono">{evt.eventCode || 'PRV'}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium flex items-center gap-1">
                        🌐 Publik
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getStatusBadge(evt.status)}
                    <button
                      onClick={() => setEditingEvent(evt)}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
                      title="Edit event & aturan lomba"
                    >
                      <Pencil className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                    <button
                      onClick={() => setDeletingEvent(evt)}
                      className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                      title="Hapus event ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                  {evt.title}
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  {evt.subtitle}
                </p>

                <p className="text-xs text-slate-600 line-clamp-2 mt-3 leading-relaxed">
                  {evt.description}
                </p>
              </div>

              {/* Event Meta Details */}
              <div className="px-5 py-3 bg-slate-50/70 border-y border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>{evt.date} • {evt.timeRange}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="truncate">{evt.location}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <strong>{evt.totalTeams || 0}</strong> Tim
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Flag className="w-3.5 h-3.5 text-orange-600" />
                    <strong>{evt.totalCheckpoints}</strong> Pos
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <strong>{evt.timeLimitMinutes}</strong> Menit
                  </span>
                </div>
              </div>
            </div>

            {/* Event Actions Footer */}
            <div className="p-4 bg-white flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 italic truncate max-w-[150px]">
                {evt.organizerName}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingEvent(evt)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3 text-blue-600" />
                  <span>Kelola Event</span>
                </button>
                <button
                  onClick={() => onOpenEventDetail(evt.id)}
                  className="px-3.5 py-1.5 bg-[#0b192c] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Buka Event</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Buat Event Baru */}
      <CreateEventModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={(data) => createEvent(data)}
        onShowToast={onShowToast}
      />

      {/* Modal Edit Event */}
      <EditEventModal
        isOpen={!!editingEvent}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onSubmit={(updatedData) => {
          if (editingEvent) {
            updateEvent(editingEvent.id, updatedData);
          }
        }}
        onDeleteRequest={(evt) => {
          setDeletingEvent(evt);
        }}
        onShowToast={onShowToast}
      />

      {/* Modal Konfirmasi Hapus Event */}
      <ConfirmDeleteModal
        isOpen={!!deletingEvent}
        title="Hapus Event Ini?"
        message={`Apakah Anda yakin ingin menghapus event "${deletingEvent?.title}"? Rangkaian pos dan data tim di event ini akan dihapus.`}
        itemName={deletingEvent?.title}
        itemType="event"
        confirmText="Hapus Event"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingEvent(null)}
      />
    </div>
  );
};
