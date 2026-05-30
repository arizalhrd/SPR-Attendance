/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, Search, Plus, Edit, Trash2, FileSpreadsheet, 
  Upload, X, CheckSquare, SearchX, CheckCircle, ArrowDownToLine 
} from 'lucide-react';
import { Employee, UserRole } from '../types';
import { writeSystemLog } from '../utils';

interface EmployeesProps {
  employees: Employee[];
  currentUser: { id: number; nama: string; role: any; departemen: string };
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (id: number, updated: Partial<Employee>) => void;
  onDeleteEmployee: (id: number) => void;
  onShowToast: (msg: string, type?: string) => void;
}

declare global {
  interface Window {
    XLSX: any;
  }
}

export default function Employees({
  employees,
  currentUser,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onShowToast,
}: EmployeesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('Semua');

  // Form modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nama, setNama] = useState('');
  const [dept, setDept] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [shiftDefault, setShiftDefault] = useState('Pagi');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('karyawan');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');

  // Filter lists
  const departments = ['Semua', ...Array.from(new Set(employees.map(e => e.departemen)))];

  const filtered = employees.filter(emp => {
    const matchSearch = emp.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
               emp.jabatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (emp.username && emp.username.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchDept = selectedDept === 'Semua' || emp.departemen === selectedDept;

    return matchSearch && matchDept;
  });

  const openAddForm = () => {
    setEditId(null);
    setNama('');
    setDept('Produksi');
    setJabatan('Operator');
    setShiftDefault('Pagi');
    setUsername('');
    setPassword('SPRTNG');
    setRole('karyawan');
    setStatus('Aktif');
    setIsFormOpen(true);
  };

  const openEditForm = (emp: Employee) => {
    setEditId(emp.id);
    setNama(emp.nama);
    setDept(emp.departemen);
    setJabatan(emp.jabatan);
    setShiftDefault(emp.shiftDefault);
    setUsername(emp.username || '');
    setPassword(emp.password || '');
    setRole(emp.role);
    setStatus(emp.status);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      onShowToast('Nama karyawan wajib diisi', 'error');
      return;
    }

    if (editId) {
      onUpdateEmployee(editId, {
        nama,
        departemen: dept,
        jabatan,
        shiftDefault,
        username,
        password,
        role,
        status,
      });
      writeSystemLog(currentUser.nama, currentUser.role, 'Karyawan', `Update data karyawan: ${nama}`);
      onShowToast(`Karyawan ${nama} berhasil diperbarui`, 'success');
    } else {
      const generatedId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
      const newEmp: Employee = {
        id: generatedId,
        nama,
        departemen: dept,
        jabatan,
        shiftDefault,
        username: username || nama.toLowerCase().replace(/\s+/g, ''),
        password: password || 'SPRTNG',
        role,
        status,
        saldoCuti: 12,
      };
      onAddEmployee(newEmp);
      writeSystemLog(currentUser.nama, currentUser.role, 'Karyawan', `Tambah karyawan baru: ${nama}`);
      onShowToast(`Karyawan ${nama} berhasil ditambahkan`, 'success');
    }

    setIsFormOpen(false);
  };

  const handleDelete = (emp: Employee) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data karyawan ${emp.nama}?`)) {
      onDeleteEmployee(emp.id);
      writeSystemLog(currentUser.nama, currentUser.role, 'Karyawan', `Menghapus karyawan: ${emp.nama}`);
      onShowToast(`Karyawan ${emp.nama} dihapus dari sistem`, 'warning');
    }
  };

  // Excel / Spreadsheet Integration Simulation using SheetJS or standard CSV downloader
  const handleExportExcel = () => {
    if (window.XLSX) {
      try {
        const mappedData = employees.map(e => ({
          ID: e.id,
          Nama: e.nama,
          Departemen: e.departemen,
          Jabatan: e.jabatan,
          'Shift Default': e.shiftDefault,
          Username: e.username || '',
          Role: e.role,
          Status: e.status,
          'Sisa Cuti': e.saldoCuti
        }));

        const ws = window.XLSX.utils.json_to_sheet(mappedData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Karyawan");

        window.XLSX.writeFile(wb, "Database_Karyawan_SPR.xlsx");
        onShowToast("Berhasil mengekspor database karyawan ke Excel", "success");
      } catch (err) {
        onShowToast("Gagal memproses ekspor Excel", "error");
      }
    } else {
      // CSV Fallback
      let csvContent = "data:text/csv;charset=utf-8,ID,Nama,Departemen,Jabatan,Shift,Status\n";
      employees.forEach(e => {
        csvContent += `${e.id},"${e.nama}","${e.departemen}","${e.jabatan}","${e.shiftDefault}","${e.status}"\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "database_karyawan_spr.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast("Database berhasil diekspor sebagai CSV", "success");
    }
  };

  const handleImportExcelSimulation = () => {
    // Inject mock fresh records simulating reading an Excel ledger file
    const sampleImportData: Employee[] = [
      { id: 201, nama: 'Dedi Kurniawan', departemen: 'Gudang', jabatan: 'Operator Gudang', shiftDefault: 'Gudang', username: 'dedi', password: '123', role: 'karyawan', status: 'Aktif', saldoCuti: 12 },
      { id: 202, nama: 'Fatimah Az-Zahra', departemen: 'QC/QA', jabatan: 'QA Officer', shiftDefault: 'Office', username: 'fatimah', password: '123', role: 'karyawan', status: 'Aktif', saldoCuti: 12 },
    ];

    sampleImportData.forEach(newEmp => {
      if (!employees.some(e => e.nama === newEmp.nama)) {
        onAddEmployee(newEmp);
      }
    });

    writeSystemLog(currentUser.nama, currentUser.role, 'Karyawan', 'Melakukan Import data karyawan dari file excel');
    onShowToast("Impor ledger Excel berhasil! Menambahkan 2 karyawan baru.", "success");
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      {/* Header filter actions toolbar */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <Users className="w-5 h-5 text-brand-500" /> Database Karyawan
            </h3>
            <p className="text-xs text-slate-400">Total terdaftar: {employees.length} karyawan</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs md:text-sm">
            <button
              onClick={handleExportExcel}
              className="flex-1 md:flex-none h-10 px-4 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Excel
            </button>
            <button
              onClick={handleImportExcelSimulation}
              className="flex-1 md:flex-none h-10 px-4 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4 text-blue-405" /> Import Excel
            </button>
            <button
              onClick={openAddForm}
              className="w-full md:w-auto h-10 px-5 bg-brand-500 hover:bg-brand-600 transition-colors text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Karyawan
            </button>
          </div>
        </div>

        {/* Filters inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama, jabatan, username..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-[#0B0C10] border border-[#30363D] text-white focus:border-brand-500 rounded-xl text-xs md:text-sm focus:outline-none transition-all"
            />
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full h-11 px-4 bg-[#0B0C10] border border-[#30363D] text-white focus:border-brand-500 rounded-xl text-xs md:text-sm focus:outline-none transition-all"
            >
              {departments.map((d, index) => (
                <option key={index} value={d}>
                  Departemen: {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Database view (Table on Desktop, Cards on Mobile) */}
      {filtered.length === 0 ? (
        <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#0B0C10] border border-[#30363D] text-slate-450 flex items-center justify-center mx-auto">
            <SearchX className="w-6 h-6 text-slate-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Tidak ada data ditemukan</h4>
            <p className="text-xs text-slate-400">Silakan sesuaikan kriteria kata kunci pencarian Anda.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-[#161B22] border border-[#30363D] rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0B0C10] text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-[#30363D]">
                    <th className="py-4 px-6">ID/Nama</th>
                    <th className="py-4 px-6">Departemen</th>
                    <th className="py-4 px-6">Jabatan</th>
                    <th className="py-4 px-6">Role / Akses</th>
                    <th className="py-4 px-6">Shift Default</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D] text-xs font-medium text-slate-300">
                  {filtered.map(emp => (
                    <tr key={emp.id} className="hover:bg-[#21262D]/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-white leading-snug">{emp.nama}</div>
                        <div className="text-[10px] text-slate-400">ID: SPR-{emp.id}</div>
                      </td>
                      <td className="py-3.5 px-6">{emp.departemen}</td>
                      <td className="py-3.5 px-6 text-slate-400">{emp.jabatan}</td>
                      <td className="py-3.5 px-6">
                        <span className="bg-[#21262D] text-slate-300 border border-[#30363D] px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-300">{emp.shiftDefault}</td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          emp.status === 'Aktif' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/15'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditForm(emp)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-450 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile responsive Cards list (max-width: 768px as requested in prompt) */}
          <div className="block md:hidden space-y-3">
            {filtered.map(emp => (
              <div key={emp.id} className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white leading-snug">{emp.nama}</h4>
                    <span className="text-[10px] text-slate-400">ID: SPR-{emp.id}</span>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    emp.status === 'Aktif' 
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-red-500/15 text-red-400 border border-red-500/20'
                  }`}>
                    {emp.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-2 gap-x-4 border-t border-[#30363D] pt-3 text-xs leading-relaxed text-slate-400">
                  <div>Departemen:<br /><strong className="text-white">{emp.departemen}</strong></div>
                  <div>Jabatan:<br /><strong className="text-white">{emp.jabatan}</strong></div>
                  <div>Akses:<br /><strong className="text-white capitalize">{emp.role}</strong></div>
                  <div>Shift Default:<br /><strong className="text-white">{emp.shiftDefault}</strong></div>
                </div>

                <div className="flex justify-end gap-1 border-t border-[#30363D] pt-2 pb-1.5">
                  <button
                    onClick={() => openEditForm(emp)}
                    className="h-9 px-4 bg-[#21262D] border border-[#30363D] text-white hover:bg-[#30363D] font-semibold rounded-xl flex items-center justify-center gap-1 text-xs cursor-pointer active:bg-slate-800"
                  >
                    <Edit className="w-3.5 h-3.5 text-brand-400" /> Edit Karyawan
                  </button>
                  <button
                    onClick={() => handleDelete(emp)}
                    className="h-9 px-3 bg-red-500/10 border border-red-500/15 text-red-400 font-semibold rounded-xl flex items-center justify-center gap-1 text-xs cursor-pointer active:bg-red-950"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Fullscreen clean dialog form modal on mobile, centered modal on desktop */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm p-0 sm:p-4 animate-fade-in text-white leading-relaxed">
          <div className="bg-[#161B22] border border-[#30363D] w-full h-full sm:h-auto sm:max-w-xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-[#0B0C10] border-b border-[#30363D] text-white p-5 flex items-center justify-between">
              <h4 className="text-sm font-bold tracking-tight">
                {editId ? 'Ubah Informasi Karyawan' : 'Tambah Rekrutmen Baru'}
              </h4>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full bg-[#21262D] border border-[#30363D] flex items-center justify-center text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-450">Nama Lengkap Karyawan</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  placeholder="Contoh: Ahmad"
                  className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-450">Departemen Kerja</label>
                  <input
                    type="text"
                    required
                    value={dept}
                    onChange={e => setDept(e.target.value)}
                    placeholder="Contoh: Produksi"
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-450">Jabatan Akademik/Struktur</label>
                  <input
                    type="text"
                    required
                    value={jabatan}
                    onChange={e => setJabatan(e.target.value)}
                    placeholder="Contoh: Leader Packing"
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-450">Shift Kerja Utama</label>
                  <select
                    value={shiftDefault}
                    onChange={e => setShiftDefault(e.target.value)}
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-3 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value="Pagi">Pagi (07:00-15:00)</option>
                    <option value="Siang">Siang (15:00-23:00)</option>
                    <option value="Malam">Malam (23:00-07:00)</option>
                    <option value="Office">Office (08:00-17:00)</option>
                    <option value="Gudang">Gudang (08:00-16:00)</option>
                    <option value="Security1">Security1 (07:00-19:00)</option>
                    <option value="Security2">Security2 (19:00-07:00)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-450">Hak Akses Sistem (Role)</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-3 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value="karyawan">Karyawan (Absen Biasa)</option>
                    <option value="leader">Leader (Akses Hub/QR)</option>
                    <option value="hrd">HRD System Operator</option>
                    <option value="admin">Admin (Sovereign Access)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-450">Username Login Portal</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Auto generated if empty"
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-450">Password Login</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mekari standard: SPRTNG"
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-450">Status Kepegawaian</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-3 text-xs focus:outline-none focus:border-brand-500"
                >
                  <option value="Aktif">Aktif (Aktif Berkerja)</option>
                  <option value="Nonaktif">Non-Aktif (Berhenti/Keluar)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="h-12 px-6 border border-[#30363D] bg-[#21262D] text-white font-semibold rounded-xl text-xs md:text-sm cursor-pointer hover:bg-[#30363D]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="h-12 px-8 bg-brand-500 hover:bg-brand-600 font-bold text-white rounded-xl text-xs md:text-sm cursor-pointer"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
