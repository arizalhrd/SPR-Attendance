/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { 
  Users, UserCheck, Clock, Calendar, AlertTriangle, 
  HelpCircle, Megaphone, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { Employee, AttendanceRecord, Announcement, SystemSettings } from '../types';

interface DashboardProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  announcements: Announcement[];
  settings: SystemSettings;
  currentUser: { id: number; nama: string; role: any; departemen: string };
  onNavigate: (tab: string) => void;
}

declare global {
  interface Window {
    Chart: any;
  }
}

export default function Dashboard({ 
  employees, 
  attendanceRecords, 
  announcements, 
  settings,
  currentUser,
  onNavigate
}: DashboardProps) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<any>(null);

  // Stats calculation
  const totalEmployees = employees.filter(e => e.status === 'Aktif').length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = attendanceRecords.filter(r => r.date === todayStr);

  const totalHadir = todayRecords.filter(r => r.status === 'Hadir').length;
  const totalTerlambat = todayRecords.filter(r => r.status === 'Terlambat' || r.status === 'Terlambat Berat').length;
  const totalIzin = todayRecords.filter(r => r.status === 'Izin').length;
  const totalSakit = todayRecords.filter(r => r.status === 'Sakit').length;
  const totalAlpha = todayRecords.filter(r => r.status === 'Alpha').length;

  const totalAbsenExcused = totalIzin + totalSakit + totalAlpha;
  const totalBelumAbsen = Math.max(0, totalEmployees - (totalHadir + totalTerlambat + totalAbsenExcused));

  // Determine user shift default rule
  const userEmp = employees.find(e => e.id === currentUser.id);
  const userShiftDefault = userEmp ? userEmp.shiftDefault : 'Office';
  const shiftRule = settings.shifts.find(s => s.name === userShiftDefault) || settings.shifts[0];

  useEffect(() => {
    if (chartRef.current && window.Chart) {
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
      });

      const hadirData = last7Days.map(dPrefix => {
        return attendanceRecords.filter(r => r.date === dPrefix && (r.status === 'Hadir' || r.status === 'Terlambat')).length;
      });

      const terlambatData = last7Days.map(dPrefix => {
        return attendanceRecords.filter(r => r.date === dPrefix && (r.status === 'Terlambat' || r.status === 'Terlambat Berat')).length;
      });

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new window.Chart(ctx, {
          type: 'bar',
          data: {
            labels: last7Days.map(d => {
              const parts = d.split('-');
              return `${parts[2]}/${parts[1]}`;
            }),
            datasets: [
              {
                label: 'Hadir/On-Time',
                data: hadirData,
                backgroundColor: '#6366f1', // Indigo premium
                borderRadius: 4,
              },
              {
                label: 'Terlambat',
                data: terlambatData,
                backgroundColor: '#f59e0b', // Amber custom
                borderRadius: 4,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 12,
                  color: '#C5C6C7',
                  font: { size: 11, family: 'Inter' }
                }
              }
            },
            scales: {
              x: { 
                grid: { display: false },
                ticks: { color: '#8892b0' }
              },
              y: { 
                beginAtZero: true, 
                ticks: { stepSize: 1, color: '#8892b0' },
                grid: { color: '#30363D' }
              }
            }
          }
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [attendanceRecords]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Visual greeting card */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-[#161B22] border border-[#30363D] rounded-3xl p-6 text-white relative overflow-hidden shadow-lg">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 to-transparent pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <span className="text-[11px] bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-full py-1 px-3 font-semibold uppercase tracking-wider">
            {currentUser.role.toUpperCase()} PORTAL
          </span>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white mt-2">
            Selamat Datang, {currentUser.nama}!
          </h2>
          <p className="text-slate-300 text-xs md:text-sm max-w-xl">
            Sistem absensi terintegrasi {settings.company.nama}. Pastikan melakukan Check-In harian sebelum toleransi jam masuk berakhir.
          </p>
        </div>
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4 shadow-sm hover:border-[#6366f1]/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Karyawan Aktif</span>
            <div className="w-8 h-8 rounded-lg bg-[#21262D] text-[#6366f1] flex items-center justify-center border border-[#30363D]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-white">{totalEmployees}</div>
          <p className="text-[10px] text-slate-500 mt-1">Status aktif di sistem</p>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4 shadow-sm hover:border-[#6366f1]/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Hadir Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-white">{totalHadir}</div>
          <p className="text-[10px] text-slate-500 mt-1">Sudah check-in tepat waktu</p>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4 shadow-sm hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Terlambat</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-white">{totalTerlambat}</div>
          <p className="text-[10px] text-slate-500 mt-1">Setelah toleransi {settings.attendanceRules.toleransiTerlambat}m</p>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-4 shadow-sm hover:border-slate-500 transition-all col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Belum Absen</span>
            <div className="w-8 h-8 rounded-lg bg-[#21262D] text-slate-400 flex items-center justify-center border border-[#30363D]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-white">{totalBelumAbsen}</div>
          <p className="text-[10px] text-slate-500 mt-1">Menunggu Check-In / Izin</p>
        </div>
      </div>

      {/* Grid: Shift summary + Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Chart performance card */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-sm text-white">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-brand-500" /> Tren Kehadiran 7 Hari Terakhir
            </h3>
            <div className="h-60 relative w-full">
              <canvas ref={chartRef} className="max-h-[250px]" />
            </div>
          </div>

          {/* Quick buttons helper */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-white">Menu Cepat HR</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <button
                onClick={() => onNavigate('Kehadiran')}
                className="p-3 text-center bg-[#21262D] rounded-xl hover:bg-[#30363D] font-medium text-brand-400 border border-[#30363D] cursor-pointer transition-all"
              >
                Absensi Hari Ini
              </button>
              <button
                onClick={() => onNavigate('Kehadiran')}
                className="p-3 text-center bg-[#21262D] rounded-xl hover:bg-[#30363D] font-medium text-indigo-400 border border-[#30363D] cursor-pointer transition-all"
              >
                Log Histori
              </button>
              <button
                onClick={() => onNavigate('Laporan')}
                className="p-3 text-center bg-[#21262D] rounded-xl hover:bg-[#30363D] font-medium text-[#C5C6C7] border border-[#30363D] cursor-pointer transition-all"
              >
                Unduh PDF/Excel
              </button>
              <button
                onClick={() => onNavigate('Approval Center')}
                className="p-3 text-center bg-[#21262D] rounded-xl hover:bg-[#30363D] font-medium text-emerald-400 border border-[#30363D] cursor-pointer transition-all"
              >
                Pusat Pengajuan
              </button>
            </div>
          </div>
        </div>

        {/* Column Right: Announcements & Profile Quick status */}
        <div className="space-y-6">
          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" /> Jadwal Kerja Anda
            </h3>
            <div className="p-4 bg-[#0B0C10] border border-[#30363D] rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Shift Default:</span>
                <span className="text-white font-semibold">{userShiftDefault}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Jam Kerja:</span>
                <span className="text-white font-semibold">{shiftRule.start} - {shiftRule.end} WIB</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Grace Period:</span>
                <span className="text-amber-450 font-semibold">Max {settings.attendanceRules.toleransiTerlambat} menit</span>
              </div>
            </div>
          </div>

          <div className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-brand-500" /> Informasi Perusahaan
            </h3>
            <div className="space-y-3">
              {announcements.map(ann => {
                const colors = {
                  'Kebijakan Baru': { bg: 'bg-red-500/15 text-red-400 border border-red-500/25' },
                  'Meeting': { bg: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25' },
                  'Libur': { bg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' },
                  'Informasi': { bg: 'bg-[#0B0C10] text-slate-300 border border-[#30363D]' }
                };
                const col = colors[ann.type] || colors['Informasi'];
                return (
                  <div key={ann.id} className="border border-[#30363D] rounded-xl p-3 hover:bg-[#21262D] transition-colors space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase truncate max-w-28 ${col.bg}`}>
                        {ann.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">{ann.date}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug">{ann.title}</h4>
                    <p className="text-[11px] text-[#C5C6C7] leading-relaxed text-left">{ann.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
