/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Filter, FileDown, Search, ArrowRight,
  Database, RefreshCw, XCircle, FileSpreadsheet, Eye, FileText,
  Share2, LogOut, CheckCircle, ExternalLink, ShieldCheck, HeartPulse
} from 'lucide-react';
import { AttendanceRecord, Employee } from '../types';
import { 
  initGoogleAuth, 
  googleSignIn, 
  googleLogout, 
  createNewSpreadsheet, 
  syncAllRecordsToSheet 
} from '../googleSheetsService';

interface ReportsProps {
  attendanceRecords: AttendanceRecord[];
  employees: Employee[];
  onShowToast: (msg: string, type?: string) => void;
}

export default function Reports({
  attendanceRecords,
  employees,
  onShowToast,
}: ReportsProps) {
  const [filterEmp, setFilterEmp] = useState('Semua');
  const [filterDept, setFilterDept] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterShift, setFilterShift] = useState('Semua');
  const [filterDate, setFilterDate] = useState('');

  // Google Sheets state management
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sheetsId, setSheetsId] = useState<string>(() => localStorage.getItem('spr_hris_sheets_id') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);

  // Initialize and listen to Google Auth changes
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        onShowToast('Akun Google berhasil terhubung dengan Google Sheets!', 'success');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Gagal masuk menggunakan Google', 'error');
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      setAccessToken(null);
      onShowToast('Akun Google berhasil dinonaktifkan', 'info');
    } catch (err: any) {
      onShowToast('Gagal mengeluarkan akun Google', 'error');
    }
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      onShowToast('Silakan sambungkan Google terlebih dahulu', 'warning');
      return;
    }
    setIsCreatingSheet(true);
    try {
      const sheetId = await createNewSpreadsheet(accessToken, 'PT Selancar Panen Raya - Laporan Absensi HRIS');
      setSheetsId(sheetId);
      localStorage.setItem('spr_hris_sheets_id', sheetId);
      onShowToast('Google Spreadsheet baru sukses dibuat & ditautkan!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal membuat Google Spreadsheet baru', 'error');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleManualSheetLink = (idOrUrl: string) => {
    let sheetId = idOrUrl.trim();
    if (sheetId.includes('/d/')) {
      const parts = sheetId.split('/d/');
      if (parts[1]) {
        sheetId = parts[1].split('/')[0];
      }
    }
    setSheetsId(sheetId);
    if (sheetId) {
      localStorage.setItem('spr_hris_sheets_id', sheetId);
      onShowToast('ID Google Sheet berhasil dikonfigurasi!', 'success');
    } else {
      localStorage.removeItem('spr_hris_sheets_id');
      onShowToast('Tautan Google Sheet dihapus', 'info');
    }
  };

  const handleSyncToSheets = async () => {
    if (!accessToken) {
      onShowToast('Silakan sambungkan Google terlebih dahulu', 'warning');
      return;
    }
    if (!sheetsId) {
      onShowToast('Silakan tentukan spreadsheet ID atau buat spreadsheet baru terlebih dahulu', 'warning');
      return;
    }

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin melakukan sinkronisasi ${filtered.length} baris data absensi? Seluruh data absensi di tab 'Sheet1' pada Google Sheet Anda akan ditimpa.`
    );
    if (!confirmed) return;

    setIsSyncing(true);
    try {
      const syncedCount = await syncAllRecordsToSheet(accessToken, sheetsId, filtered);
      onShowToast(`Sinkronisasi sukses! ${syncedCount} baris data berhasil disalin ke Google Spreadsheet.`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal mensinkronkan data absensi ke Google Sheet', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Extract unique departments and employee names for search filter dropdowns
  const departments = ['Semua', ...Array.from(new Set(employees.map(e => e.departemen)))];
  const statuses = ['Semua', 'Hadir', 'Terlambat', 'Terlambat Berat', 'Izin', 'Sakit', 'Alpha'];
  const shifts = ['Semua', 'Pagi', 'Siang', 'Malam', 'Office', 'Gudang', 'Security1', 'Security2'];

  const filtered = attendanceRecords.slice().reverse().filter(rec => {
    const matchEmp = filterEmp === 'Semua' || rec.nama === filterEmp;
    const matchDept = filterDept === 'Semua' || rec.departemen === filterDept;
    const matchStatus = filterStatus === 'Semua' || rec.status === filterStatus;
    const matchShift = filterShift === 'Semua' || rec.shift === filterShift;
    const matchDate = !filterDate || rec.date === filterDate;

    return matchEmp && matchDept && matchStatus && matchShift && matchDate;
  });

  const handleResetFilters = () => {
    setFilterEmp('Semua');
    setFilterDept('Semua');
    setFilterStatus('Semua');
    setFilterShift('Semua');
    setFilterDate('');
    onShowToast('Penyaring pencarian berhasil di-reset', 'info');
  };

  const downloadXlsx = () => {
    if (window.XLSX) {
      try {
        const mappedData = filtered.map(r => ({
          Nama: r.nama,
          Departemen: r.departemen,
          Jabatan: r.jabatan,
          Tanggal: r.date,
          Shift: r.shift || '',
          'Jam Masuk': r.checkInTime || '',
          'Jam Keluar': r.checkOutTime || '',
          Durasi: r.duration || '',
          Status: r.status,
          Keterangan: r.note || '',
          'Status Kerja': r.workStatus || ''
        }));

        const ws = window.XLSX.utils.json_to_sheet(mappedData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Layanan Absensi");

        window.XLSX.writeFile(wb, "Laporan_Absensi_SPR_HRIS.xlsx");
        onShowToast("Berhasil mengunduh dokumen Excel", "success");
      } catch (err) {
        onShowToast("Gagal memproses ekspor Excel", "error");
      }
    } else {
      onShowToast("SheetJS tidak tersedia. Sedang mengunduh format CSV...", "warning");
      let csv = "Nama,Departemen,Tanggal,Shift,CheckIn,CheckOut,Status,Keterangan\n";
      filtered.forEach(r => {
        csv += `"${r.nama}","${r.departemen}","${r.date}","${r.shift}","${r.checkInTime}","${r.checkOutTime}","${r.status}","${r.note}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", "Laporan_Absensi_SPR.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadPdf = () => {
    const { jsPDF } = (window as any).jspdf || {};
    if (jsPDF) {
      try {
        const doc = new jsPDF();
        doc.setFont("Inter", "bold");
        doc.setFontSize(14);
        doc.text("PT. SELANCAR PANEN RAYA - LAPORAN ABSENSI KARYAWAN", 14, 15);
        doc.setFontSize(9);
        doc.setFont("Inter", "normal");
        doc.text(`Dicetak pada tanggal: ${new Date().toLocaleDateString('id')}`, 14, 21);

        const rows = filtered.map(r => [
          r.nama,
          r.date,
          r.shift || '',
          r.checkInTime || '-',
          r.checkOutTime || '-',
          r.status,
          r.workStatus || '-'
        ]);

        (doc as any).autoTable({
          head: [['Nama Karyawan', 'Tanggal', 'Shift', 'Masuk', 'Keluar', 'Status', 'Selesai']],
          body: rows,
          startY: 25,
          styles: { fontSize: 8 },
          theme: 'grid',
        });

        doc.save("Laporan_Absensi_HRIS_SPR.pdf");
        onShowToast("Berhasil mendistribusikan laporan PDF", "success");
      } catch (err) {
        onShowToast("Gagal mengekspos data ke PDF", "error");
      }
    } else {
      onShowToast("Layanan ekspor PDF sedang sibuk. Silakan gunakan Excel.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      {/* Exporter Filter panel */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#30363D]">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-brand-500" /> Pusat Laporan Absensi
            </h3>
            <p className="text-xs text-slate-400">Penyaring, peninjau, dan pengekspor log kehadiran real-time.</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto text-xs md:text-sm">
            <button
              onClick={downloadXlsx}
              className="flex-1 md:flex-none h-11 px-4 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 font-bold hover:bg-emerald-500/20 transition-colors text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Download Excel
            </button>
            <button
              onClick={downloadPdf}
              className="flex-1 md:flex-none h-11 px-4 bg-red-500/10 border border-red-500/15 text-red-400 font-bold hover:bg-red-500/20 transition-colors text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Cetak PDF
            </button>
          </div>
        </div>

        {/* Dynamic filters form inputs layout */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Karyawan</label>
            <select
              value={filterEmp}
              onChange={e => setFilterEmp(e.target.value)}
              className="w-full h-10 px-2 bg-[#0B0C10] border border-[#30363D] rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="Semua">Semua</option>
              {employees.map(e => (
                <option key={e.id} value={e.nama}>{e.nama}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Departemen</label>
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="w-full h-10 px-2 bg-[#0B0C10] border border-[#30363D] rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
            >
              {departments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Status Kehadiran</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full h-10 px-2 bg-[#0B0C10] border border-[#30363D] rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
            >
              {statuses.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Shift Kerja</label>
            <select
              value={filterShift}
              onChange={e => setFilterShift(e.target.value)}
              className="w-full h-10 px-2 bg-[#0B0C10] border border-[#30363D] rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
            >
              {shifts.map((sh, i) => (
                <option key={i} value={sh}>{sh}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 col-span-2 md:col-span-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Tanggal Spesifik</label>
            <div className="flex gap-1.5">
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="w-full h-10 px-2 bg-[#0B0C10] border border-[#30363D] text-white rounded-xl text-xs focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleResetFilters}
                className="h-10 px-2 border border-[#30363D] bg-[#21262D] rounded-xl text-[10px] font-semibold hover:bg-[#30363D] shrink-0 cursor-pointer text-slate-300 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Google Sheets Live Sync Panel */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#30363D] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Sinkronisasi Google Sheets Real-time
                {googleUser && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Aktif
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-400">Sinkronisasikan data log absensi langsung ke akun Google Spreadsheet Anda.</p>
            </div>
          </div>
          {googleUser && (
            <button
              onClick={handleGoogleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 hover:border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Putuskan Keluar
            </button>
          )}
        </div>

        {!googleUser ? (
          <div className="p-5 bg-[#0B0C10] border border-[#30363D] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-5 animate-fade-in">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs font-bold text-white block">Hubungkan Akun Google HRD</span>
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-xl">
                Untuk memakai fitur integrasi ini, silakan klik tombol di samping untuk masuk menggunakan akun Google Anda. Aplikasi akan memperoleh izin aman untuk membuat & memperbarui spreadsheet laporan absensi PT Selancar Panen Raya Anda.
              </p>
            </div>
            
            <button
              onClick={handleGoogleLogin}
              className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs cursor-pointer shadow-lg transition-all transform hover:scale-[1.02] duration-200 shrink-0"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Linked account profile info card */}
              <div className="md:col-span-4 p-4 bg-[#0B0C10] border border-[#30363D] rounded-2xl flex items-center gap-3">
                {googleUser.photoURL ? (
                  <img src={googleUser.photoURL} alt="Google User Photo" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full border border-[#30363D] object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-[#30363D]">
                    {googleUser.displayName?.charAt(0) || 'G'}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">{googleUser.displayName || 'Pengguna Google'}</span>
                  <span className="text-[10px] text-slate-400 block truncate">{googleUser.email}</span>
                </div>
              </div>

              {/* Sheet configuration and target selection */}
              <div className="md:col-span-8 p-4 bg-[#0B0C10] border border-[#30363D] rounded-2xl space-y-3">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-[#21262D] pb-2.5">
                  <span className="text-xs font-bold text-white text-[11px]">ID Google Spreadsheet Tujuan</span>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={handleCreateNewSheet}
                      disabled={isCreatingSheet}
                      className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#30363D] text-white font-bold rounded-lg text-[10px] cursor-pointer transition-colors shadow-sm shrink-0"
                    >
                      {isCreatingSheet ? 'Sedang Membuat...' : '✨ Buat Spreadsheet Baru'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sheetsId}
                      onChange={e => handleManualSheetLink(e.target.value)}
                      placeholder="Masukkan ID Spreadsheet (contoh: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ) atau URL"
                      className="flex-1 h-9 px-3 bg-[#161B22] border border-[#30363D] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                    />
                    {sheetsId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${sheetsId}/edit`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="h-9 px-3 bg-[#21262D] border border-[#30363D] rounded-lg text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Buka Sheet
                      </a>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    Setiap kali Anda menekan tombol sinkronisasi di bawah, baris-baris data dari tabel absensi di bawah ini akan diunggah bersih ke worksheet pertama (Sheet1).
                  </p>
                </div>
              </div>
            </div>

            {/* Sync control block */}
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <span className="text-xs font-bold text-semibold text-emerald-400 flex items-center justify-center md:justify-start gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Koneksi Google API Diotorisasi & Siap Sedia
                </span>
                <p className="text-[10px] text-slate-400">
                  Data yang disinkronisasi: <strong className="text-white">{filtered.length} baris</strong> sesuai pencarian/pemicu aktif di halaman filter saat ini.
                </p>
              </div>

              <button
                onClick={handleSyncToSheets}
                disabled={isSyncing || !sheetsId}
                className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-[#30363D] disabled:text-slate-500 disabled:cursor-not-allowed font-bold text-white rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition-all transform hover:scale-[1.01]"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sedang Menyinkronkan...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    Sinkronisasikan Ke Google Sheets Now!
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main filter response logs */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-3xl overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <XCircle className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-semibold">Tidak ada riwayat absensi berkesesuaian kriteria penyaring.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-medium text-xs">
              <thead>
                <tr className="bg-[#0B0C10] text-[#8b949e] font-bold uppercase tracking-wider border-b border-[#30363D]">
                  <th className="py-4 px-6">Identitas Karyawan</th>
                  <th className="py-4 px-6">Tanggal Absensi</th>
                  <th className="py-4 px-6">Shift Terpilih</th>
                  <th className="py-4 px-6">Rincian Durasi</th>
                  <th className="py-4 px-6">Status Kehadiran</th>
                  <th className="py-4 px-6">Alur Geofence</th>
                  <th className="py-4 px-6">Check Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D] text-slate-300">
                {filtered.map(rec => {
                  const labelColors = {
                    Hadir: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
                    Terlambat: 'bg-amber-500/10 text-amber-400 border border-amber-500/15',
                    'Terlambat Berat': 'bg-orange-500/15 text-orange-405 border border-orange-500/20',
                    Izin: 'bg-sky-500/10 text-sky-400 border border-sky-500/15',
                    Sakit: 'bg-red-500/10 text-red-400 border border-red-500/15',
                    Alpha: 'bg-purple-500/10 text-purple-400 border border-purple-500/15',
                  };
                  const color = labelColors[rec.status] || 'bg-[#21262D] text-slate-300 border border-[#30363D]';

                  return (
                    <tr key={rec.id} className="hover:bg-[#21262D]/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <strong className="text-white">{rec.nama}</strong>
                        <div className="text-[10px] text-slate-400">{rec.departemen} - {rec.jabatan}</div>
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-400">{rec.date}</td>
                      <td className="py-3.5 px-6 text-slate-300">{rec.shift || '-'}</td>
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-200">
                          {rec.checkInTime || '-'} s/d {rec.checkOutTime || '-'}
                        </div>
                        {rec.duration && (
                          <div className="text-[10px] text-slate-500">Total: {rec.duration}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${color}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-400 text-[11px] truncate max-w-sm">
                        {rec.locationName ? (
                          <span className="flex items-center gap-1 text-slate-300">📍 {rec.locationName}</span>
                        ) : '-'}
                      </td>
                      <td className="py-3.5 px-6">
                        {rec.workStatus ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            rec.workStatus === 'Selesai' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' 
                              : 'bg-orange-500/10 text-orange-400 border-orange-500/15'
                          }`}>
                            {rec.workStatus}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
