/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Settings as SettingsIcon, Building, Clock, MapPin, 
  Share2, Camera, ShieldAlert, Sliders, Database, 
  Download, Upload, Play, AlertOctagon, UserCheck, 
  HelpCircle, Trash2, Edit, Plus, FileText, Smartphone 
} from 'lucide-react';
import { SystemSettings, SystemLog } from '../types';
import { writeSystemLog } from '../utils';

interface SettingsProps {
  settings: SystemSettings;
  currentUser: { id: number; nama: string; role: any; departemen: string };
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onShowToast: (msg: string, type?: string) => void;
}

export default function Settings({
  settings,
  currentUser,
  onUpdateSettings,
  onShowToast,
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Read system audit logs
  const logsList: SystemLog[] = JSON.parse(localStorage.getItem('system_logs') || '[]');

  const saveSettingsSegment = (updatedPart: Partial<SystemSettings>) => {
    const updated = { ...settings, ...updatedPart };
    onUpdateSettings(updated);
    writeSystemLog(currentUser.nama, currentUser.role, 'Settings', 'Memperbarui Pengaturan Sistem');
    onShowToast('Pengaturan telah berhasil disimpan', 'success');
  };

  // Corporate Profile states
  const [compName, setCompName] = useState(settings.company.nama);
  const [compAlmt, setCompAlmt] = useState(settings.company.alamat);
  const [compTel, setCompTel] = useState(settings.company.telepon);
  const [compMail, setCompMail] = useState(settings.company.email);
  const [compWeb, setCompWeb] = useState(settings.company.website);
  const [compNpwp, setCompNpwp] = useState(settings.company.npwp);
  const [compDir, setCompDir] = useState(settings.company.direktur);
  const [compLogo, setCompLogo] = useState(settings.company.logo);

  const handleCompanySave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsSegment({
      company: {
        nama: compName,
        alamat: compAlmt,
        telepon: compTel,
        email: compMail,
        website: compWeb,
        npwp: compNpwp,
        direktur: compDir,
        logo: compLogo,
      }
    });
  };

  // Backup / Restore Simulation actions
  const handleDownloadBackup = () => {
    try {
      const backupObj = {
        settings,
        employees: JSON.parse(localStorage.getItem('employees') || '[]'),
        attendance: JSON.parse(localStorage.getItem('attendance') || '[]'),
        logsList,
        backupDate: new Date().toISOString()
      };

      const datStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", datStr);
      downloadAnchor.setAttribute("download", `BACKUP_HRIS_ATTENDPRO_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      writeSystemLog(currentUser.nama, currentUser.role, 'Backup', 'Mengekspor Cadangan (Backup) sistem berhasil');
      onShowToast('Cadangan berhasil diunduh sebagai file JSON!', 'success');
    } catch (e) {
      onShowToast('Gagal memproses cadangan', 'error');
    }
  };

  const handleRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.settings && parsed.employees) {
          onUpdateSettings(parsed.settings);
          localStorage.setItem('employees', JSON.stringify(parsed.employees));
          localStorage.setItem('attendance', JSON.stringify(parsed.attendance || []));
          if (parsed.logsList) {
            localStorage.setItem('system_logs', JSON.stringify(parsed.logsList));
          }
          writeSystemLog(currentUser.nama, currentUser.role, 'Restore', 'Melakukan pemulihan data (Restore)');
          onShowToast('Data sistem berhasil dipulihkan dengan sukses!', 'success');
          
          // Fast refresh
          setTimeout(() => window.location.reload(), 1000);
        } else {
          onShowToast('Validasi Gagal: File JSON tidak memiliki format skema AttendPro.', 'error');
        }
      } catch (err) {
        onShowToast('Format file JSON rusak, gagal memulihkan.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const menuItems = [
    { label: 'Profil Perusahaan', icon: Building },
    { label: 'Pengaturan Shift', icon: Clock },
    { label: 'Metode & Toleransi Absen', icon: Sliders },
    { label: 'Lokasi Geofencing', icon: MapPin },
    { label: 'Selfie & Biometrik', icon: Camera },
    { label: 'Lembur & Cuti', icon: Sliders },
    { label: 'Hari Libur Nasional', icon: Sliders },
    { label: 'Integrasi Sheets API', icon: Share2 },
    { label: 'Backup & Restore', icon: Database },
    { label: 'Log Aktivitas Sistem', icon: ShieldAlert },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in text-xs md:text-sm text-white">
      {/* Sidebar Tabs left on Desktop, Horizontal Scroll on Mobile */}
      <div className="lg:col-span-1 space-y-2 flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 gap-2 border-b lg:border-b-0 border-[#30363D]">
        {menuItems.map((menu, index) => {
          const Icon = menu.icon;
          return (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold whitespace-nowrap transition-all text-left w-full cursor-pointer ${
                activeTab === index 
                  ? 'bg-[#21262D] text-white border border-[#30363D] shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-[#161B22]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 text-brand-405" />
              <span>{menu.label}</span>
            </button>
          );
        })}
      </div>

      {/* Primary configuration details viewports */}
      <div className="lg:col-span-3 bg-[#161B22] border border-[#30363D] rounded-3xl p-6 shadow-sm min-h-[480px]">
        {activeTab === 0 && (
          <form onSubmit={handleCompanySave} className="space-y-4">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-[#30363D] flex items-center gap-2">
              <Building className="w-4 h-4 text-brand-500" /> Profil Organisasi & Perusahaan
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Nama Perusahaan / Organisasi</label>
                <input
                  type="text" required
                  value={compName} onChange={e => setCompName(e.target.value)}
                  className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Email Hubungan</label>
                  <input
                    type="email" required
                    value={compMail} onChange={e => setCompMail(e.target.value)}
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Nomor Telepon Kantor</label>
                  <input
                    type="text" required
                    value={compTel} onChange={e => setCompTel(e.target.value)}
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Website URL</label>
                  <input
                    type="text" required
                    value={compWeb} onChange={e => setCompWeb(e.target.value)}
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Nomor Pokok Wajib Pajak (NPWP)</label>
                  <input
                    type="text" required
                    value={compNpwp} onChange={e => setCompNpwp(e.target.value)}
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Direktur Utama</label>
                <input
                  type="text" required
                  value={compDir} onChange={e => setCompDir(e.target.value)}
                  className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">URL / Path Logo Perusahaan</label>
                  <input
                    type="text" required
                    value={compLogo} onChange={e => setCompLogo(e.target.value)}
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-500">Gunakan logo default: <strong className="text-slate-400">/company_logo.png</strong></span>
                </div>
                <div className="flex items-center gap-3 bg-[#0B0C10] border border-[#30363D] p-3 rounded-xl">
                  <div className="w-12 h-12 rounded-full border border-[#30363D] bg-slate-950 p-[3px] flex items-center justify-center shrink-0 shadow-inner">
                    <img src={compLogo} alt="Logo Preview" className="w-full h-full object-cover rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Preview Logo</span>
                    <span className="text-[10px] text-slate-500 block truncate">File: {compLogo}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Alamat Fisik Legal</label>
                <textarea
                  required rows={3}
                  value={compAlmt} onChange={e => setCompAlmt(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-[#30363D] text-white rounded-xl p-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                className="h-11 px-6 bg-brand-500 text-white font-bold rounded-xl text-xs hover:bg-brand-600 cursor-pointer"
              >
                Simpan Profil Perusahaan
              </button>
            </div>
          </form>
        )}

        {activeTab === 1 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-[#30363D]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-500" /> Pengaturan Shift Operasional
              </h3>
              <button
                onClick={() => onShowToast('CRUD Shift terkunci pada mode demo', 'info')}
                className="py-1 px-3 bg-brand-505/10 text-brand-400 font-bold border border-brand-500/15 rounded-lg text-[10px] cursor-pointer"
              >
                + Tambah Shift
              </button>
            </div>

            <div className="space-y-3">
              {settings.shifts.map(shift => (
                <div key={shift.id} className="p-4 bg-[#0B0C10] border border-[#30363D] rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">{shift.name}</span>
                    <span className="text-[10px] text-slate-500">Jam Kerja: {shift.start} - {shift.end} WIB</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded font-bold uppercase">
                      AUTO CALCULATED
                    </span>
                    <span className="text-slate-700">|</span>
                    <span className="text-xs text-slate-400 font-semibold">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-[#30363D] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-505" /> Aturan & Batas Toleransi Absen
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Toleransi Terlambat (Menit)</label>
                  <input
                    type="number"
                    value={settings.attendanceRules.toleransiTerlambat}
                    onChange={e => saveSettingsSegment({
                      attendanceRules: {
                        ...settings.attendanceRules,
                        toleransiTerlambat: parseInt(e.target.value) || 10
                      }
                    })}
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-sm focus:outline-none focus:border-brand-500"
                  />
                  <small className="text-[10px] text-slate-500 block">Sanksi "Terlambat" dimulai setelah melewati menit ini.</small>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Toleransi Terlambat Berat (Menit)</label>
                  <input
                    type="number"
                    value={settings.attendanceRules.terlambatBerat}
                    onChange={e => saveSettingsSegment({
                      attendanceRules: {
                        ...settings.attendanceRules,
                        terlambatBerat: parseInt(e.target.value) || 30
                      }
                    })}
                    className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-sm focus:outline-none focus:border-brand-500"
                  />
                  <small className="text-[10px] text-slate-500 block">Status terklasifikasi sebagai mangkir berat.</small>
                </div>
              </div>

              {/* NEW setting for Attendance centralization requested by user */}
              <div className="bg-[#0B0C10] border border-[#30363D] rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-white block">Metode Pelaksanaan Absensi (Metode Check-In)</span>
                <p className="text-[10px] text-slate-400">
                  Konfigurasikan apakah absensi / check-in dilakukan oleh karyawan itu sendiri secara mandiri atau secara terpusat (sentralisasi) diisi oleh Team Leader:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => saveSettingsSegment({
                      attendanceRules: {
                        ...settings.attendanceRules,
                        attendanceMethod: 'Mandiri'
                      }
                    })}
                    className={`p-4 border rounded-2xl flex flex-col items-start gap-1 cursor-pointer text-left transition-all ${
                      (settings.attendanceRules.attendanceMethod || 'Mandiri') === 'Mandiri'
                        ? 'bg-brand-500/10 border-brand-500 text-white'
                        : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <strong className="text-xs font-bold">📱 Karyawan Mandiri (Self Check-in)</strong>
                    <span className="text-[10px] text-slate-500">
                      Karyawan melakukan check-in & check-out secara mandiri melalui smartphone masing-masing dengan verifikasi GPS/Foto.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => saveSettingsSegment({
                      attendanceRules: {
                        ...settings.attendanceRules,
                        attendanceMethod: 'Sentralisasi'
                      }
                    })}
                    className={`p-4 border rounded-2xl flex flex-col items-start gap-1 cursor-pointer text-left transition-all ${
                      settings.attendanceRules.attendanceMethod === 'Sentralisasi'
                        ? 'bg-brand-500/10 border-brand-500 text-white'
                        : 'bg-[#161B22] border-[#30363D] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <strong className="text-xs font-bold">👥 Sentralisasi melalui Team Leader</strong>
                    <span className="text-[10px] text-slate-500">
                      Proses absensi seluruh anggota kelompok didelegasikan terpusat kepada Leader divisi masing-masing untuk mencegah kecurangan.
                    </span>
                  </button>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-[11px] text-amber-400 leading-relaxed">
                <p className="font-bold flex items-center gap-1 mb-1">
                  <AlertOctagon className="w-4 h-4 text-amber-500" /> PERHITUNGAN PENALTI & ATURAN ABSENSI
                </p>
                Sanksi keterlambatan di bawah 10 menit dikesampingkan dengan klasifikasi Hadir Toleransi. Terlambat berat di atas 30 menit otomatis memotong bonus harian (sesuai SOP operasional internal).
              </div>
            </div>
          </div>
        )}

        {activeTab === 3 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-[#30363D]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-500" /> Multi-Lokasi Kantor & Geofences
              </h3>
              <button
                onClick={() => onShowToast('Silakan atur koordinat target di bawah ini melalui edit', 'info')}
                className="py-1 px-3 bg-brand-500/10 text-brand-400 font-bold border border-brand-500/15 rounded-lg text-[10px] cursor-pointer"
              >
                + Tambah Geofence
              </button>
            </div>

            <div className="space-y-3 font-medium">
              {settings.locations.map(loc => (
                <div key={loc.id} className="p-4 bg-[#0B0C10] border border-[#30363D] rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-white block">{loc.nama}</span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      LAT: {loc.latitude} | LNG: {loc.longitude}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 text-[10px] font-semibold px-2 py-0.5 rounded">
                      Radius Aman: {loc.radius} meter
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 4 && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-[#30363D] flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand-500" /> Deteksi Biometri Capture Selfie Wajib
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-[#0B0C10] border border-[#30363D] rounded-xl">
                <div>
                  <span className="text-xs font-bold text-white block">Wajib Selfie Check-In</span>
                  <span className="text-[10px] text-slate-500">Kehadiran masuk wajib validasi foto</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.selfie.wajibSelfieCheckIn}
                  onChange={e => saveSettingsSegment({
                    selfie: { ...settings.selfie, wajibSelfieCheckIn: e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-[#30363D] bg-[#0b0c10] text-[#6366f1] focus:ring-[#6366f1] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#0B0C10] border border-[#30363D] rounded-xl">
                <div>
                  <span className="text-xs font-bold text-white block">Wajib Selfie Check-Out</span>
                  <span className="text-[10px] text-slate-500">Kehadiran pulang wajib validasi foto</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.selfie.wajibSelfieCheckOut}
                  onChange={e => saveSettingsSegment({
                    selfie: { ...settings.selfie, wajibSelfieCheckOut: e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-[#30363D] bg-[#0b0c10] text-[#6366f1] focus:ring-[#6366f1] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#0B0C10] border border-[#30363D] rounded-xl">
                <div>
                  <span className="text-xs font-bold text-white block">Biometric Capture Kamera Depan</span>
                  <span className="text-[10px] text-slate-500">Paksakan kamera depan ponsel aktif otomatis</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.selfie.kameraDepan}
                  onChange={e => saveSettingsSegment({
                    selfie: { ...settings.selfie, kameraDepan: e.target.checked }
                  })}
                  className="w-5 h-5 rounded border-[#30363D] bg-[#0b0c10] text-[#6366f1] focus:ring-[#6366f1] cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 5 && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-[#30363D] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" /> Kuota Cuti & Lembur Operasional
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#0B0C10] border border-[#30363D] rounded-xl space-y-3">
                <span className="text-xs font-bold text-white block">Konfigurasi Hak Cuti</span>
                <div className="divide-y divide-[#30363D] text-[11px] leading-relaxed text-slate-400">
                  <div className="py-2 flex justify-between"><span>Cuti Tahunan Standard:</span><span className="font-bold text-white">12 Hari / Th</span></div>
                  <div className="py-2 flex justify-between"><span>Cuti Melahirkan:</span><span className="font-bold text-white">90 Hari / Th</span></div>
                </div>
              </div>

              <div className="p-4 bg-[#0B0C10] border border-[#30363D] rounded-xl space-y-3">
                <span className="text-xs font-bold text-white block">Toleransi Lembur Standard</span>
                <div className="divide-y divide-[#30363D] text-[11px] leading-relaxed text-slate-400">
                  <div className="py-2 flex justify-between"><span>Minimal Pengajuan:</span><span className="font-bold text-white">1 Jam</span></div>
                  <div className="py-2 flex justify-between"><span>Maksimal Pengajuan:</span><span className="font-bold text-white">5 Jam</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 6 && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-[#30363D] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" /> Daftar Lampiran Hari Libur Nasional 2026
            </h3>

            <div className="space-y-2 font-medium">
              {settings.holidays.map(hol => (
                <div key={hol.id} className="p-3 bg-[#0B0C10] border border-[#30363D] rounded-xl flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-200">{hol.nama}</span>
                  <span className="text-slate-500 font-mono">{hol.tanggal}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 7 && (
          <form onSubmit={e => { e.preventDefault(); onShowToast('Preferensi Integrasi & Notifikasi berhasil disimpan', 'success'); }} className="space-y-6">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-[#30363D] flex items-center gap-2">
              <Share2 className="w-4 h-4 text-brand-500" /> Integrasi & Preferensi Notifikasi Smartphone
            </h3>

            {/* Notification sound and channel controllers */}
            <div className="p-4 bg-[#0B0C10] border border-[#30363D] rounded-2xl space-y-4">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" /> 📣 Pusat Notifikasi & Alarm Suara
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Nyalakan fungsi notifikasi layaknya aplikasi pada smartphone. Jika suara notifikasi aktif, portal absensi HRIS akan membunyikan alarm chime indah setiap kali terjadi aktivitas pengajuan, status kehadiran, pembaruan izin/sakit, maupun keputusan HRD.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <label className="flex items-center justify-between p-3.5 bg-[#161B22] border border-[#30363D] rounded-xl cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">🔊 Suara Notifikasi</span>
                    <span className="text-[9px] text-slate-500 font-medium">Berdengung chime aktif</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notification?.soundActive ?? true}
                    onChange={e => saveSettingsSegment({
                      notification: {
                        ...settings.notification,
                        soundActive: e.target.checked
                      }
                    })}
                    className="w-4 h-4 rounded text-brand-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-[#161B22] border border-[#30363D] rounded-xl cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">💬 WhatsApp Gateway</span>
                    <span className="text-[9px] text-slate-500 font-medium">Kirim notifikasi SMS/WA</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notification?.waActive ?? true}
                    onChange={e => saveSettingsSegment({
                      notification: {
                        ...settings.notification,
                        waActive: e.target.checked
                      }
                    })}
                    className="w-4 h-4 rounded text-brand-505"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-[#161B22] border border-[#30363D] rounded-xl cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">📧 Laporan Email API</span>
                    <span className="text-[9px] text-slate-500 font-medium">Laporan kehadiran otomatis</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notification?.emailActive ?? true}
                    onChange={e => saveSettingsSegment({
                      notification: {
                        ...settings.notification,
                        emailActive: e.target.checked
                      }
                    })}
                    className="w-4 h-4 rounded text-brand-505"
                  />
                </label>
              </div>

              {/* Individual notification trigger items */}
              <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Pemicu Bunyi Notifikasi & Broadcast:</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.keys(settings.notification?.triggers || {}).map((triggerKey) => {
                    const formattedLabels: Record<string, string> = {
                      checkIn: '📥 Check-In Hadir',
                      checkOut: '📤 Check-Out Pulang',
                      terlambat: '⚠️ Keterlambatan Absen',
                      izin: '📝 Pengajuan Izin',
                      sakit: '🤒 Surat Sakit Tim',
                      approval: '✅ Persetujuan Status'
                    };
                    return (
                      <label key={triggerKey} className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(settings.notification?.triggers as any)?.[triggerKey] ?? true}
                          onChange={e => {
                            const updatedTriggers = {
                              ...(settings.notification?.triggers || {}),
                              [triggerKey]: e.target.checked
                            };
                            saveSettingsSegment({
                              notification: {
                                ...settings.notification,
                                triggers: updatedTriggers as any
                              }
                            });
                          }}
                          className="accent-brand-500"
                        />
                        <span>{formattedLabels[triggerKey] || triggerKey}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Google Sheets WebApp Webhook (GAS)</label>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={settings.integration.googleSheetsUrl}
                  onChange={e => saveSettingsSegment({
                    integration: {
                      ...settings.integration,
                      googleSheetsUrl: e.target.value
                    }
                  })}
                  className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">WhatsApp Gateway Token Node</label>
                <input
                  type="text"
                  placeholder="Simulasi WA API Key"
                  value={settings.integration.waGateway}
                  onChange={e => saveSettingsSegment({
                    integration: {
                      ...settings.integration,
                      waGateway: e.target.value
                    }
                  })}
                  className="w-full min-h-[48px] bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="h-11 px-5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 cursor-pointer"
                >
                  Simpan Pengaturan Notifikasi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Kirim pesan tes broadcast & bunyikan alarm smartphone?')) {
                      onShowToast('Tes chirp broadcast terkirim! 🔊 Chime berbunyi.', 'success');
                    }
                  }}
                  className="h-11 px-4 bg-[#21262D] border border-[#30363D] text-[#C5C6C7] hover:text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  🔊 Tes Alarm Suara
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === 8 && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-[#30363D] flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" /> Backup Harian, Mingguan & Bulanan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 border border-dashed border-[#30363D] rounded-2xl space-y-3 bg-[#0B0C10] flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">Ekspor Seluruh Basis Data (Download JSON)</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">Mengemas konfigurasi perusahaan, log karyawan, data perizinan, dan histori absensi ke format cadangan tunggal (.json).</p>
                </div>
                <button
                  onClick={handleDownloadBackup}
                  className="w-full h-11 bg-[#21262D] text-white hover:bg-[#30363D] font-bold border border-[#30363D] rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4 text-brand-500" /> Cadangkan Sekarang (Backup)
                </button>
              </div>

              <div className="p-5 border border-dashed border-[#30363D] rounded-2xl space-y-3 bg-[#0B0C10] flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">Pemulihan Cadangan File JSON (Restore)</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">Ganti rujukan database local saat ini dengan database cadangan yang tersimpan sebelumnya.</p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleRestoreUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-11 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 hover:bg-indigo-500/20 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Pemulihan Sekarang (Restore)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 9 && (
          <div className="space-y-4 font-medium text-xs">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-[#30363D] flex items-center gap-2 font-sans">
              <ShieldAlert className="w-4 h-4 text-red-500" /> Log Aktivitas & Jejak Audit Sistem
            </h3>

            {logsList.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Belum ada jejak aktivitas.</p>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[360px] pr-2 divide-y divide-[#30363D] leading-relaxed">
                {logsList.map(log => (
                  <div key={log.id} className="py-2.5 flex justify-between items-start text-xs border-b border-[#21262d]/40">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-200 block">
                        {log.action} <span className="text-[10px] bg-[#21262D] border border-[#30363D] px-1.5 rounded text-slate-400 uppercase">{log.role}</span>
                      </span>
                      <p className="text-slate-400 font-sans mt-0.5">{log.details}</p>
                      <span className="text-[10px] text-slate-500 font-mono">{log.ip} | {log.device}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono text-right shrink-0">{log.date} {log.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
