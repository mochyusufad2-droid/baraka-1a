import * as XLSX from 'xlsx';
import { Team, EventItem } from '../types';

/**
 * Export Leaderboard / Race Results to Excel (.xlsx) file format
 */
export const exportLeaderboardToExcel = (
  teams: Team[],
  event?: EventItem,
  categoryFilter: string = 'all'
): string => {
  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentTimeStr = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';

  const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const filteredTeams = sortedTeams.filter(
    (t) => categoryFilter === 'all' || t.category === categoryFilter
  );

  const eventTitle = event?.title || 'RacePoint Orienteering Event';
  const categoryLabel = categoryFilter === 'all' ? 'Semua Kategori' : categoryFilter;

  // Header metadata rows
  const metaRows = [
    ['REKAPITULASI HASIL KELUARAN & LEADERBOARD OFFISIAL'],
    [`Nama Kegiatan: ${eventTitle}`],
    [`Kategori: ${categoryLabel}`],
    [`Waktu Ekspor: ${currentDateStr}, ${currentTimeStr}`],
    [`Total Peserta Terdaftar: ${filteredTeams.length} Tim`],
    [], // empty row separator
  ];

  // Data table columns
  const tableHeaders = [
    'Peringkat',
    'Nomor BIB',
    'Nama Tim / Regu',
    'Kategori',
    'Ketua Tim',
    'Pos Tuntas',
    'Total Pos',
    'Poin Dasar Pos',
    'Bonus Juri',
    'Penalti Poin',
    'Penalti Waktu (Mnt)',
    'Total Skor Akhir',
    'Durasi (Menit)',
    'Status Tim',
    'Pos Terakhir'
  ];

  const dataRows = filteredTeams.map((t, idx) => [
    idx + 1,
    t.bibNumber,
    t.name,
    t.category,
    t.members[0]?.name || '-',
    t.checkpointsCompleted,
    t.totalCheckpoints,
    t.points,
    t.bonusPoints,
    t.penaltyPoints,
    t.penaltyMinutes || 0,
    t.totalScore,
    t.durationMinutes,
    t.status === 'finished' ? 'Selesai' : t.status === 'racing' ? 'Berlangsung' : t.status,
    t.lastPosName || '-'
  ]);

  // Combine metadata and table
  const worksheetData = [...metaRows, tableHeaders, ...dataRows];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths for optimal reading in Excel
  worksheet['!cols'] = [
    { wch: 10 }, // Peringkat
    { wch: 12 }, // BIB
    { wch: 30 }, // Nama Tim
    { wch: 25 }, // Kategori
    { wch: 22 }, // Ketua Tim
    { wch: 12 }, // Pos Tuntas
    { wch: 12 }, // Total Pos
    { wch: 15 }, // Poin Dasar
    { wch: 12 }, // Bonus Juri
    { wch: 14 }, // Penalti Poin
    { wch: 18 }, // Penalti Waktu
    { wch: 16 }, // Total Skor
    { wch: 15 }, // Durasi
    { wch: 14 }, // Status
    { wch: 24 }  // Pos Terakhir
  ];

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leaderboard Final');

  // File name formatting
  const cleanTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Leaderboard_${cleanTitle}_${dateStamp}.xlsx`;

  // Trigger download
  XLSX.writeFile(workbook, fileName);

  return fileName;
};

/**
 * Export Leaderboard / Race Results to CSV file format with UTF-8 BOM
 */
export const exportLeaderboardToCsv = (
  teams: Team[],
  event?: EventItem,
  categoryFilter: string = 'all'
): string => {
  const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const filteredTeams = sortedTeams.filter(
    (t) => categoryFilter === 'all' || t.category === categoryFilter
  );

  const eventTitle = event?.title || 'RacePoint Orienteering Event';

  const headers = [
    'Peringkat',
    'Nomor_BIB',
    'Nama_Tim',
    'Kategori',
    'Ketua_Tim',
    'Pos_Selesai',
    'Total_Pos',
    'Poin_Dasar_Pos',
    'Bonus_Juri',
    'Penalti_Poin',
    'Penalti_Waktu_Menit',
    'Total_Skor_Akhir',
    'Durasi_Menit',
    'Status_Tim',
    'Pos_Terakhir'
  ];

  const rows = filteredTeams.map((t, idx) => [
    idx + 1,
    `"${t.bibNumber}"`,
    `"${t.name.replace(/"/g, '""')}"`,
    `"${t.category.replace(/"/g, '""')}"`,
    `"${(t.members[0]?.name || '-').replace(/"/g, '""')}"`,
    t.checkpointsCompleted,
    t.totalCheckpoints,
    t.points,
    t.bonusPoints,
    t.penaltyPoints,
    t.penaltyMinutes || 0,
    t.totalScore,
    t.durationMinutes,
    `"${t.status}"`,
    `"${(t.lastPosName || '-').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const cleanTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Hasil_Leaderboard_${cleanTitle}_${dateStamp}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return fileName;
};
