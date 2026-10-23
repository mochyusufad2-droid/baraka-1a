import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Plus, 
  RefreshCw, 
  CreditCard, 
  History, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Edit3, 
  UserCheck, 
  UserX,
  Lock,
  ArrowRight,
  FileText,
  Mail,
  Send
} from 'lucide-react';
import { ClientAccount, SubscriptionHistoryItem } from '../../types';

interface ClientWithComputed extends ClientAccount {
  computedActive?: boolean;
  computedReason?: string;
  daysRemaining?: number;
}

interface SuperAdminDashboardProps {
  onShowToast: (msg: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onShowToast }) => {
  const [clients, setClients] = useState<ClientWithComputed[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'suspended'>('all');
  
  // Super admin auth token state
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('super_admin_token'));
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapKey, setBootstrapKey] = useState('');
  const [saEmail, setSaEmail] = useState('superadmin@platform.com');
  const [saPassword, setSaPassword] = useState('');

  // Modals state
  const [selectedClient, setSelectedClient] = useState<ClientWithComputed | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [createdStaffCreds, setCreatedStaffCreds] = useState<{ email: string; initialPassword: string; clientName: string } | null>(null);

  // Form states
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDuration, setNewClientDuration] = useState(30);

  // Renewal Form state
  const [renewDuration, setRenewDuration] = useState(30);
  const [paymentAmount, setPaymentAmount] = useState<string>('1500000');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Dates Override Form
  const [overrideStartDate, setOverrideStartDate] = useState('');
  const [overrideExpiresDate, setOverrideExpiresDate] = useState('');

  // History state
  const [historyItems, setHistoryItems] = useState<SubscriptionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Client Detail Slide-Over state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTab, setDetailTab] = useState<'info' | 'history' | 'events'>('info');
  const [clientEvents, setClientEvents] = useState<any[]>([]);
  const [clientEventsLoading, setClientEventsLoading] = useState(false);

  const handleOpenDetail = async (client: ClientWithComputed) => {
    setSelectedClient(client);
    setShowDetailModal(true);
    setDetailTab('info');
    
    // Fetch history
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/history`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        setHistoryItems(data.history);
      }
    } catch (e) {}
    setHistoryLoading(false);

    // Fetch events
    setClientEventsLoading(true);
    try {
      const res = await fetch('/api/admin/events', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        const allEvts = data.events || data || [];
        const filtered = Array.isArray(allEvts) 
          ? allEvts.filter((ev: any) => (ev.clientId || 'client-default') === client.id)
          : [];
        setClientEvents(filtered);
      }
    } catch (e) {
      setClientEvents([]);
    }
    setClientEventsLoading(false);
  };

  // Auto-bootstrap or fetch clients
  useEffect(() => {
    fetchClients();
  }, [adminToken]);

  const handleBootstrapSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBootstrapping(true);
    try {
      const res = await fetch('/api/admin/bootstrap-super-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: saEmail,
          password: saPassword,
          displayName: 'Super Admin Platform',
          bootstrapKey: bootstrapKey.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        setAdminToken(data.token);
        localStorage.setItem('super_admin_token', data.token);
        onShowToast('Sesi Super Admin berhasil diaktifkan!');
      } else {
        onShowToast(data.message || 'Gagal memprovosi Super Admin.');
      }
    } catch (err: any) {
      onShowToast('Kesalahan koneksi server.');
    } finally {
      setIsBootstrapping(false);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clients', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.clients)) {
        setClients(data.clients);
      } else if (res.status === 401 || res.status === 403) {
        // Clear token if invalid
        setAdminToken(null);
      }
    } catch (err) {
      console.error('Fetch clients error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail) {
      onShowToast('Nama dan Email Client wajib diisi.');
      return;
    }
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: newClientName,
          email: newClientEmail,
          phone: newClientPhone,
          durationDays: newClientDuration,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(`Client "${newClientName}" berhasil ditambahkan!`);
        setShowAddModal(false);
        if (data.staffCredentials) {
          setCreatedStaffCreds({
            email: data.staffCredentials.email,
            initialPassword: data.staffCredentials.initialPassword,
            clientName: newClientName,
          });
        }
        setNewClientName('');
        setNewClientEmail('');
        setNewClientPhone('');
        fetchClients();
      } else {
        onShowToast(data.message || 'Gagal membuat akun client.');
      }
    } catch (err) {
      onShowToast('Terjadi kesalahan server saat membuat client.');
    }
  };

  const handleToggleStatus = async (client: ClientWithComputed) => {
    const newStatus = client.status === 'suspended' ? 'active' : 'suspended';
    const confirmMsg = newStatus === 'suspended'
      ? `Apakah Anda yakin ingin MENANGGUHKAN akses client "${client.name}"? Semua event dan peserta milik client ini akan terkunci.`
      : `Apakah Anda ingin MENGAKTIFKAN kembali akses client "${client.name}"?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/clients/${client.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: newStatus,
          notes: `Status diperbarui menjadi ${newStatus.toUpperCase()} via Dashboard Super Admin`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message);
        fetchClients();
      } else {
        onShowToast(data.message || 'Gagal memperbarui status client.');
      }
    } catch (err) {
      onShowToast('Kesalahan server saat mengubah status.');
    }
  };

  const handleRenewSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      const res = await fetch(`/api/admin/clients/${selectedClient.id}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          durationDays: Number(renewDuration),
          paymentAmount: paymentAmount ? Number(paymentAmount) : null,
          paymentRef: paymentRef || `TRX-${Date.now().toString().slice(-6)}`,
          notes: paymentNotes || `Perpanjangan langganan +${renewDuration} hari (Manual Transfer)`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast(data.message);
        setShowRenewModal(false);
        setSelectedClient(null);
        setPaymentRef('');
        setPaymentNotes('');
        fetchClients();
      } else {
        onShowToast(data.message || 'Gagal memperpanjang masa aktif.');
      }
    } catch (err) {
      onShowToast('Terjadi kesalahan server.');
    }
  };

  const handleFetchHistory = async (client: ClientWithComputed) => {
    setSelectedClient(client);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/history`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        setHistoryItems(data.history);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveDatesOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      const res = await fetch(`/api/admin/clients/${selectedClient.id}/dates`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          startDate: overrideStartDate || undefined,
          expiresAt: overrideExpiresDate || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Tanggal masa aktif berhasil diperbarui.');
        setShowDatesModal(false);
        setSelectedClient(null);
        fetchClients();
      } else {
        onShowToast(data.message || 'Gagal memperbarui tanggal.');
      }
    } catch (err) {
      onShowToast('Kesalahan server saat mengubah tanggal.');
    }
  };

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === 'active') return c.computedActive && c.status === 'active';
    if (statusFilter === 'expired') return !c.computedActive && c.status !== 'suspended';
    if (statusFilter === 'suspended') return c.status === 'suspended';

    return true;
  });

  const totalActive = clients.filter((c) => c.computedActive && c.status === 'active').length;
  const totalExpired = clients.filter((c) => !c.computedActive && c.status !== 'suspended').length;
  const totalSuspended = clients.filter((c) => c.status === 'suspended').length;

  // If no Super Admin token, show provisioning / login form
  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Akses Super Admin</h2>
            <p className="text-xs text-slate-500">Provosi atau login untuk mengelola akun client</p>
          </div>
        </div>

        <form onSubmit={handleBootstrapSuperAdmin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Super Admin</label>
            <input
              type="email"
              value={saEmail}
              onChange={(e) => setSaEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={saPassword}
              onChange={(e) => setSaPassword(e.target.value)}
              required
              placeholder="Masukkan password admin"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kunci Otorisasi Server (SUPER_ADMIN_BOOTSTRAP_KEY)</label>
            <input
              type="password"
              value={bootstrapKey}
              onChange={(e) => setBootstrapKey(e.target.value)}
              placeholder="Masukkan server secret key yang telah dikonfigurasi"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              required
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Wajib sesuai dengan environment variable SUPER_ADMIN_BOOTSTRAP_KEY server.</span>
          </div>

          <button
            type="submit"
            disabled={isBootstrapping}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isBootstrapping ? 'Memproses Otorisasi...' : 'Masuk Dashboard Super Admin'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold border border-orange-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dashboard Super Admin Platform</h1>
            <p className="text-xs text-slate-400">Pengelolaan Multi-Client SaaS, Pembayaran Manual, dan Masa Aktif Langganan</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Client Baru</span>
          </button>
          <button
            onClick={() => {
              setAdminToken(null);
              localStorage.removeItem('super_admin_token');
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Keluar Sesi Super Admin"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Akun Client</span>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">{clients.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Client Aktif</span>
            <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1">{totalActive}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Kedaluwarsa (Terkunci)</span>
            <div className="text-2xl font-bold text-rose-600 font-mono tabular-nums mt-1">{totalExpired}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Ditangguhkan (Suspended)</span>
            <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-1">{totalSuspended}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama client, email, atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({clients.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aktif ({totalActive})
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'expired' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kedaluwarsa ({totalExpired})
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === 'suspended' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ditangguhkan ({totalSuspended})
          </button>
        </div>
      </div>

      {/* Main Client Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Informasi Client</th>
                <th className="py-3 px-4">Status Akses</th>
                <th className="py-3 px-4">Masa Aktif & Kedaluwarsa</th>
                <th className="py-3 px-4 text-center">Sisa Hari</th>
                <th className="py-3 px-4 text-right">Aksi Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-500" />
                    <span>Memuat data client SaaS...</span>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <span>Tidak ada data client yang sesuai kriteria pencarian.</span>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isSuspended = client.status === 'suspended';
                  const isActive = client.computedActive && !isSuspended;
                  const isExpired = !isActive && !isSuspended;

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Client Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{client.name}</div>
                        <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5">
                          <span>{client.email}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-[10px] text-slate-400">{client.id}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {isSuspended ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold text-[11px] border border-amber-200">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Ditangguhkan</span>
                          </div>
                        ) : isExpired ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-semibold text-[11px] border border-rose-200">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Kedaluwarsa (Terkunci)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Akses Aktif</span>
                          </div>
                        )}
                      </td>

                      {/* Expiration Dates */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 font-mono text-[11px]">
                          <span className="text-slate-400">s/d</span> {client.expiresAt ? new Date(client.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tidak Diatur'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Mulai: {client.startDate ? new Date(client.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </td>

                      {/* Remaining Days */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-mono font-bold text-sm tabular-nums px-2 py-0.5 rounded-lg ${
                          isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {client.daysRemaining ?? 0} Hari
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right space-x-1">
                        {/* Renew / Extend Button */}
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setShowRenewModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer border border-orange-200"
                          title="Perpanjang / Catat Pembayaran Manual"
                        >
                          <CreditCard className="w-3.5 h-3.5 inline mr-1" />
                          <span>Perpanjang</span>
                        </button>

                        {/* Toggle Suspend Status */}
                        <button
                          onClick={() => handleToggleStatus(client)}
                          className={`px-2.5 py-1.5 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer border ${
                            isSuspended
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                          }`}
                          title={isSuspended ? 'Aktifkan Kembali' : 'Tangguhkan Akses'}
                        >
                          {isSuspended ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                              <span>Aktifkan</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5 inline mr-1" />
                              <span>Tangguhkan</span>
                            </>
                          )}
                        </button>

                        {/* Detail Slide-Over Button */}
                        <button
                          onClick={() => handleOpenDetail(client)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer border border-blue-200"
                          title="Lihat Detail Lengkap & Aktivitas"
                        >
                          <FileText className="w-3.5 h-3.5 inline mr-1" />
                          <span>Detail</span>
                        </button>

                        {/* History Button */}
                        <button
                          onClick={() => handleFetchHistory(client)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer border border-slate-200"
                          title="Lihat Riwayat Perpanjangan"
                        >
                          <History className="w-3.5 h-3.5 inline mr-1" />
                          <span>Riwayat</span>
                        </button>

                        {/* Manual Dates Override */}
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setOverrideStartDate(client.startDate ? client.startDate.slice(0, 10) : '');
                            setOverrideExpiresDate(client.expiresAt ? client.expiresAt.slice(0, 10) : '');
                            setShowDatesModal(true);
                          }}
                          className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-200"
                          title="Ubah Tanggal Manual"
                        >
                          <Edit3 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: ADD CLIENT --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-500" />
                <span>Tambah Client Account Baru</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Organisasi / Perusahaan Client</label>
                <input
                  type="text"
                  placeholder="Contoh: PT Event Outdoor Indonesia"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Kontak Utama Admin Client</label>
                <input
                  type="email"
                  placeholder="admin@eventoutdoor.id"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp (Opsional)</label>
                <input
                  type="text"
                  placeholder="081234567890"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Masa Aktif Awal (Hari)</label>
                <select
                  value={newClientDuration}
                  onChange={(e) => setNewClientDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                >
                  <option value={30}>30 Hari (1 Bulan)</option>
                  <option value={90}>90 Hari (3 Bulan)</option>
                  <option value={180}>180 Hari (6 Bulan)</option>
                  <option value={365}>365 Hari (1 Tahun)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Simpan Akun Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: MANUAL PAYMENT & EXTEND SUBSCRIPTION --- */}
      {showRenewModal && selectedClient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                  <span>Perpanjang Langganan Client</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedClient.name} ({selectedClient.email})</p>
              </div>
              <button onClick={() => setShowRenewModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            {/* Extension Policy Info Callout */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 mb-4 text-slate-600">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>Kebijakan Kalkulasi Perpanjangan UTC Server:</span>
              </div>
              {selectedClient.computedActive ? (
                <p className="text-[11px] text-emerald-700">
                  ✓ Akun masih aktif. Perpanjangan akan **ditambahkan dari tanggal kedaluwarsa sebelumnya** ({selectedClient.expiresAt ? new Date(selectedClient.expiresAt).toLocaleDateString('id-ID') : '-'}). Sisa masa aktif dipertahankan.
                </p>
              ) : (
                <p className="text-[11px] text-amber-700">
                  ⚠ Akun sudah kedaluwarsa/ditangguhkan. Masa aktif baru akan **dihitung mulai waktu sekarang UTC**.
                </p>
              )}
            </div>

            <form onSubmit={handleRenewSubscription} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Durasi Perpanjangan Hari</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[30, 90, 180, 365].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setRenewDuration(days)}
                      className={`py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                        renewDuration === days
                          ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      +{days} Hari
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Pembayaran Manual (Rp)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="1500000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Referensi Transaksi / Bank Transfer</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Contoh: TRX-BCA-88219"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Administrasi Pembayaran</label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Transfer terverifikasi di rekening BCA Mandiri Super Admin"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Konfirmasi Perpanjangan +{renewDuration} Hari
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: SUBSCRIPTION HISTORY --- */}
      {showHistoryModal && selectedClient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-500" />
                  <span>Riwayat Langganan & Pembayaran Manual</span>
                </h3>
                <p className="text-xs text-slate-500">{selectedClient.name} ({selectedClient.id})</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {historyLoading ? (
                <div className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-500" />
                  <span>Memuat riwayat transaksi...</span>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Belum ada riwayat perpanjangan tercatat untuk client ini.
                </div>
              ) : (
                historyItems.map((item) => (
                  <div key={item.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-mono">
                          +{item.extensionDays} HARI
                        </span>
                        <span>{item.notes || 'Perpanjangan Masa Aktif'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                      <div>
                        <span className="text-slate-400">Oleh Super Admin:</span>{' '}
                        <span className="font-medium text-slate-700">{item.extendedByEmail || item.extendedByUid}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Ref Transaksi:</span>{' '}
                        <span className="font-mono font-semibold text-slate-800">{item.paymentRef || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Nominal Transfer:</span>{' '}
                        <span className="font-mono font-bold text-emerald-700">
                          {item.paymentAmount ? `Rp ${Number(item.paymentAmount).toLocaleString('id-ID')}` : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Kedaluwarsa Baru:</span>{' '}
                        <span className="font-mono font-semibold text-slate-900">
                          {new Date(item.newExpiresAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: MANUAL DATE OVERRIDE --- */}
      {showDatesModal && selectedClient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-orange-500" />
                <span>Ubah Tanggal Masa Aktif Manual</span>
              </h3>
              <button onClick={() => setShowDatesModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveDatesOverride} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai (Start Date)</label>
                <input
                  type="date"
                  value={overrideStartDate}
                  onChange={(e) => setOverrideStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Kedaluwarsa (Expires At)</label>
                <input
                  type="date"
                  value={overrideExpiresDate}
                  onChange={(e) => setOverrideExpiresDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDatesModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Simpan Perubahan Tanggal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CLIENT DETAIL SLIDE-OVER MODAL --- */}
      {showDetailModal && selectedClient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-white max-w-xl w-full h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold border border-orange-500/30">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white">{selectedClient.name}</h2>
                  <p className="text-xs text-slate-400 font-mono">{selectedClient.email} · {selectedClient.id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0">
              <button
                onClick={() => setDetailTab('info')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  detailTab === 'info' ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Informasi & Status
              </button>
              <button
                onClick={() => setDetailTab('history')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  detailTab === 'history' ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Riwayat Perpanjangan ({historyItems.length})
              </button>
              <button
                onClick={() => setDetailTab('events')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  detailTab === 'events' ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Event Kelola ({clientEvents.length})
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailTab === 'info' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200 flex items-center justify-between">
                      <span>Ringkasan Langganan</span>
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                        selectedClient.status === 'suspended' ? 'bg-amber-100 text-amber-800' :
                        selectedClient.computedActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {selectedClient.status === 'suspended' ? 'Ditangguhkan' : selectedClient.computedActive ? 'Aktif' : 'Kedaluwarsa'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 block">ID Client</span>
                        <span className="font-mono font-semibold text-slate-800">{selectedClient.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Telepon / WhatsApp</span>
                        <span className="font-medium text-slate-800">{selectedClient.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Tanggal Mulai</span>
                        <span className="font-mono text-slate-800">{selectedClient.startDate ? new Date(selectedClient.startDate).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Tanggal Kedaluwarsa</span>
                        <span className="font-mono text-slate-800 font-bold">{selectedClient.expiresAt ? new Date(selectedClient.expiresAt).toLocaleDateString('id-ID', { dateStyle: 'long' }) : 'Tidak Diatur'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Catatan / Keterangan</span>
                      <p className="text-slate-700 italic mt-0.5">{selectedClient.notes || 'Tidak ada catatan administrasi khusus.'}</p>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-900 block">Aksi Cepat Super Admin</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          setShowRenewModal(true);
                        }}
                        className="py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Perpanjang Langganan</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          handleToggleStatus(selectedClient);
                        }}
                        className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                          selectedClient.status === 'suspended' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                      >
                        {selectedClient.status === 'suspended' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        <span>{selectedClient.status === 'suspended' ? 'Aktifkan Akun' : 'Tangguhkan Akun'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'history' && (
                <div className="space-y-3">
                  {historyLoading ? (
                    <div className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-500" />
                      <span>Memuat riwayat perpanjangan...</span>
                    </div>
                  ) : historyItems.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Belum ada riwayat perpanjangan tercatat untuk client ini.
                    </div>
                  ) : (
                    historyItems.map((item) => (
                      <div key={item.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-mono">
                              +{item.extensionDays} HARI
                            </span>
                            <span>{item.notes || 'Perpanjangan Masa Aktif'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(item.timestamp).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                          <div>
                            <span className="text-slate-400">Oleh:</span>{' '}
                            <span className="font-medium text-slate-700">{item.extendedByEmail || item.extendedByUid}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Ref:</span>{' '}
                            <span className="font-mono font-semibold text-slate-800">{item.paymentRef || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Nominal:</span>{' '}
                            <span className="font-mono font-bold text-emerald-700">
                              {item.paymentAmount ? `Rp ${Number(item.paymentAmount).toLocaleString('id-ID')}` : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Kedaluwarsa Baru:</span>{' '}
                            <span className="font-mono font-semibold text-slate-900">
                              {new Date(item.newExpiresAt).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailTab === 'events' && (
                <div className="space-y-3">
                  {clientEventsLoading ? (
                    <div className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-500" />
                      <span>Memuat daftar event client...</span>
                    </div>
                  ) : clientEvents.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Belum ada event yang dibuat atau dikelola oleh client ini.
                    </div>
                  ) : (
                    clientEvents.map((evt) => (
                      <div key={evt.id || evt.eventId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-sm">{evt.title || evt.name || 'Event Orienteering'}</h4>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                            {evt.status || 'Active'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div>
                            <span className="text-slate-400 block">ID Event:</span>
                            <span className="font-mono">{evt.id || evt.eventId}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Tanggal Mulai:</span>
                            <span>{evt.startDate || evt.date || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STAFF CREDENTIALS GENERATED MODAL --- */}
      {createdStaffCreds && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Kredensial Login Staf Berhasil Dibuat</h3>
                <p className="text-xs text-slate-500">Untuk client: {createdStaffCreds.clientName}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <p className="text-slate-600">
                Gunakan kredensial akses di bawah ini untuk login ke halaman **Login Staf / Admin Client**:
              </p>
              <div className="space-y-2 font-mono">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-sans">Email Staf</span>
                    <span className="font-bold text-slate-800">{createdStaffCreds.email}</span>
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-sans">Password / Kode Akses Awal</span>
                    <span className="font-bold text-emerald-700 text-sm">{createdStaffCreds.initialPassword}</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                ⚠ Catat atau salin password ini sekarang. Password ini digunakan oleh staf client untuk masuk ke sistem manajemen event mereka.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onShowToast(`Simulasi Email terkirim ke ${createdStaffCreds.email}!`);
                  }}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-blue-200 flex items-center gap-1.5"
                  title="Kirim Simulasi Notifikasi Email"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Kirim Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const waText = `Halo Tim Lapangan, berikut kredensial akses Staff/Admin untuk client ${createdStaffCreds.clientName}:\n\nEmail: ${createdStaffCreds.email}\nPassword: ${createdStaffCreds.initialPassword}\n\nSilakan login ke portal.`;
                    navigator.clipboard.writeText(waText);
                    onShowToast('Format pesan WhatsApp berhasil disalin untuk dibagikan ke tim!');
                  }}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-emerald-200 flex items-center gap-1.5"
                  title="Kirim Simulasi WhatsApp"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim WhatsApp</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`Email: ${createdStaffCreds.email}\nPassword: ${createdStaffCreds.initialPassword}`);
                    onShowToast('Kredensial staf berhasil disalin!');
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Salin
                </button>
                <button
                  type="button"
                  onClick={() => setCreatedStaffCreds(null)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
