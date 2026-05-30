/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Check, RefreshCw, Building, AlertCircle, Search, 
  UserCheck, UserX, CheckSquare, Trash2, Shield, Calendar, MapPin
} from 'lucide-react';
import { Employee, AttendanceRecord, SystemSettings } from '../types';
import { formatDateString, formatTime24, writeSystemLog } from '../utils';

interface AttendanceProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  settings: SystemSettings;
  currentUser: { id: number; nama: string; role: any; departemen: string };
  onAddRecord: (rec: AttendanceRecord) => void;
  onUpdateRecord: (id: number, updated: Partial<AttendanceRecord>) => void;
  onShowToast: (msg: string, type?: string) => void;
}

export default function Attendance({
  employees,
  attendanceRecords,
  settings,
  currentUser,
  onAddRecord,
  onUpdateRecord,
  onShowToast,
}: AttendanceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('Semua');
  
  // Local state for tracking customized checkin times of team members
  const [customInTimes, setCustomInTimes] = useState<Record<number, string>>({});
  const [customOutTimes, setCustomOutTimes] = useState<Record<number, string>>({});
  const [customShifts, setCustomShifts] = useState<Record<number, string>>({});
  
  const todayStr = formatDateString(new Date());
  
  // Load current time once on load for defaults
  const currentHHMM = formatTime24(new Date()).substring(0, 5);

  const isKaryawan = currentUser.role === 'karyawan';

  // 1. Employee-specific status and historical log
  const myRecordForToday = attendanceRecords.find(
    r => r.empId === currentUser.id && r.date === todayStr
  );
  
  const myHistoricalRecords = attendanceRecords
    .filter(r => r.empId === currentUser.id)
    .sort((a, b) => b.id - a.id);

  // Initialize form options for employees
  useEffect(() => {
    const timesIn: Record<number, string> = {};
    const timesOut: Record<number, string> = {};
    const shifts: Record<number, string> = {};
    
    employees.forEach(emp => {
      timesIn[emp.id] = currentHHMM;
      timesOut[emp.id] = currentHHMM;
      shifts[emp.id] = emp.shiftDefault;
    });
    
    setCustomInTimes(timesIn);
    setCustomOutTimes(timesOut);
    setCustomShifts(shifts);
  }, [employees, currentHHMM]);

  // Determine authorized departmental bound
  const myTeamDepartment = currentUser.departemen;

  // Filter employees that are visible to the logged in leader/admin/hrd
  const filteredEmployees = employees.filter(emp => {
    // Karyawan shouldn't see anyone, leaders see their team, admin/hrd sees all.
    if (isKaryawan) return false;
    
    const matchesSearch = emp.nama.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Role checks
    if (currentUser.role === 'leader') {
      // Leader manages normal employees inside their department
      return emp.role === 'karyawan' && emp.departemen === myTeamDepartment && matchesSearch;
    } else {
      // Admin, hrd can filter any department
      const matchesDept = departmentFilter === 'Semua' || emp.departemen === departmentFilter;
      return matchesDept && matchesSearch;
    }
  });

  // Get list of unique departments for filter dropdown
  const uniqueDepartments = Array.from(new Set(employees.map(e => e.departemen)));

  // Perform leader checkin trigger
  const handleLeaderCheckIn = (emp: Employee) => {
    const checkInTimeVal = customInTimes[emp.id] || currentHHMM;
    const selectedShift = customShifts[emp.id] || emp.shiftDefault;
    
    const shiftInfo = settings.shifts.find(s => s.name === selectedShift) || settings.shifts[0];
    const [targetHour, targetMin] = shiftInfo.start.split(':').map(Number);
    const [currentHour, currentMin] = checkInTimeVal.split(':').map(Number);

    const totalTargetMinutes = targetHour * 60 + targetMin;
    const totalCurrentMinutes = currentHour * 60 + currentMin;
    const diffMinutes = totalCurrentMinutes - totalTargetMinutes;

    let status: 'Hadir' | 'Terlambat' | 'Terlambat Berat' = 'Hadir';
    if (diffMinutes > settings.attendanceRules.toleransiTerlambat) {
      status = 'Terlambat';
    }
    if (diffMinutes > settings.attendanceRules.terlambatBerat) {
      status = 'Terlambat Berat';
    }

    const note = status !== 'Hadir' 
      ? `Terlambat ${diffMinutes} menit (Dicatat oleh Leader)` 
      : 'Hadir Tepat Waktu (Dicatat oleh Leader)';

    const newRecord: AttendanceRecord = {
      id: Date.now() + emp.id, // safe unique ID
      empId: emp.id,
      nama: emp.nama,
      departemen: emp.departemen,
      jabatan: emp.jabatan,
      shift: selectedShift,
      date: todayStr,
      checkInTime: checkInTimeVal,
      checkOutTime: null,
      duration: null,
      status: status,
      note: note,
      workStatus: null,
      locationName: settings.locations[0]?.nama || 'Kantor Pusat',
    };

    onAddRecord(newRecord);
    writeSystemLog(currentUser.nama, currentUser.role, 'Leader-CheckIn', `Mencatat kehadiran MASUK untuk ${emp.nama} (${status}) pada pukul ${checkInTimeVal}`);
    onShowToast(`Kehadiran ${emp.nama} berhasil dicatat sebagai Masuk (${status})`, 'success');
  };

  // Perform leader checkout trigger
  const handleLeaderCheckOut = (record: AttendanceRecord) => {
    const checkOutTimeVal = customOutTimes[record.empId] || currentHHMM;
    const checkInTimeStr = record.checkInTime || '07:00';
    
    const [startHour, startMin] = checkInTimeStr.split(':').map(Number);
    const [currentHour, currentMin] = checkOutTimeVal.split(':').map(Number);

    let totalMinutes = (currentHour * 60 + currentMin) - (startHour * 60 + startMin);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // crossover midnight

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const outputDuration = `${hours}j ${mins}m`;

    const shiftInfo = settings.shifts.find(s => s.name === record.shift || s.name === 'Pagi') || settings.shifts[0];
    const [shiftEndHour, shiftEndMin] = shiftInfo.end.split(':').map(Number);
    const shiftEndTotalMins = shiftEndHour * 60 + shiftEndMin;
    const currentMins = currentHour * 60 + currentMin;

    let workStatus: 'Selesai' | 'Pulang Cepat' = 'Selesai';
    if (currentMins < shiftEndTotalMins) {
      workStatus = 'Pulang Cepat';
    }

    onUpdateRecord(record.id, {
      checkOutTime: checkOutTimeVal,
      duration: outputDuration,
      workStatus: workStatus,
    });

    writeSystemLog(currentUser.nama, currentUser.role, 'Leader-CheckOut', `Mencatat absensi PULANG untuk ${record.nama} durasi kerja: ${outputDuration}`);
    onShowToast(`Checkout untuk ${record.nama} berhasil dicatat (durasi: ${outputDuration})`, 'success');
  };

  // Record an employee as Sick / Permit / Absent (Sakit, Izin, Alpha)
  const handleLeaderMarkLeave = (emp: Employee, status: 'Sakit' | 'Izin' | 'Alpha') => {
    const statusNotes = {
      Sakit: 'Sakit (Dicatat oleh Leader)',
      Izin: 'Izin (Dicatat oleh Leader)',
      Alpha: 'Tanpa Keterangan / Mangkir (Alpha)',
    };

    const newRecord: AttendanceRecord = {
      id: Date.now() + emp.id,
      empId: emp.id,
      nama: emp.nama,
      departemen: emp.departemen,
      jabatan: emp.jabatan,
      shift: emp.shiftDefault,
      date: todayStr,
      checkInTime: null,
      checkOutTime: null,
      duration: null,
      status: status,
      note: statusNotes[status],
      workStatus: null,
    };

    onAddRecord(newRecord);
    writeSystemLog(currentUser.nama, currentUser.role, `Leader-${status}`, `Mencatat ketidakhadiran (${status}) untuk karyawan ${emp.nama}`);
    onShowToast(`Karyawan ${emp.nama} tercatat tidak masuk dengan status: ${status}`, 'info');
  };

  // Reset or cancel an employee's attendance record for today
  const handleResetRecord = (rec: AttendanceRecord) => {
    // To reset we directly modify, here we use our wrapper. Since we don't have delete, let's update it to a null status or flag it so we know it's wiped!
    // But wait! We can just update it with a flag, or how can we delete it if there's no onDelete?
    // Let's look at onUpdateRecord. We can set checkInTime: null, checkOutTime: null, status: 'Alpha'? No, that marks them as Alpha.
    // What if we can pass a special flag or message? Let's check how App.tsx handles onUpdateRecord:
    // onUpdateRecord={(id, updated) => { const updatedList = attendanceRecords.map(r => r.id === id ? { ...r, ...updated } : r); ... }}
    // Wait, let's see how our parent displays it or if we can actually filter out records. Since onDelete is not passed, but we can set record status back or change status easily!
    // Wait, can we change their status? Yes! If they want to correct from "Sakit" to "Hadir", the leader can just click "Ubah Status" which sets status to 'Hadir', updates times! This is a perfect way to clear and correct without needing actual row deletion.
    // Let's implement an edit system that lets them change state from Sakit/Izin/Alpha back to Hadir, or vice versa, by overriding!
    // What if they want to cancel completely? We can set the status of record to 'Alpha' (Tanpa Keterangan) or let them edit times.
    // Let's make an intuitive action bar for checking in/editing that works incredibly well.
    // Wait, let's also pass a special prop or mock delete by changing status!
  };

  // If the logged in user is a Karyawan (Member)
  if (isKaryawan) {
    const isCentralized = (settings.attendanceRules.attendanceMethod || 'Mandiri') === 'Sentralisasi';

    const handleSelfCheckIn = (selectedShift: string = currentUser.departemen === 'Office' ? 'Office' : 'Pagi') => {
      const checkInTimeVal = currentHHMM;
      const shiftInfo = settings.shifts.find(s => s.name === selectedShift) || settings.shifts[0];
      const [targetHour, targetMin] = shiftInfo.start.split(':').map(Number);
      const [currentHour, currentMin] = checkInTimeVal.split(':').map(Number);

      const totalTargetMinutes = targetHour * 60 + targetMin;
      const totalCurrentMinutes = currentHour * 60 + currentMin;
      const diffMinutes = totalCurrentMinutes - totalTargetMinutes;

      let status: 'Hadir' | 'Terlambat' | 'Terlambat Berat' = 'Hadir';
      if (diffMinutes > settings.attendanceRules.toleransiTerlambat) {
        status = 'Terlambat';
      }
      if (diffMinutes > settings.attendanceRules.terlambatBerat) {
        status = 'Terlambat Berat';
      }

      const note = status !== 'Hadir' 
        ? `Terlambat ${diffMinutes} menit (Absen Mandiri HP)` 
        : 'Hadir Tepat Waktu (Absen Mandiri HP)';

      const newRecord: AttendanceRecord = {
        id: Date.now() + currentUser.id,
        empId: currentUser.id,
        nama: currentUser.nama,
        departemen: currentUser.departemen,
        jabatan: 'Staff Karyawan',
        shift: selectedShift,
        date: todayStr,
        checkInTime: checkInTimeVal,
        checkOutTime: null,
        duration: null,
        status: status,
        note: note,
        workStatus: null,
        locationName: settings.locations[0]?.nama || 'Pabrik Sentral',
      };

      onAddRecord(newRecord);
      writeSystemLog(currentUser.nama, currentUser.role, 'Self-CheckIn', `Check-in mandiri (${status}) pada pukul ${checkInTimeVal}`);
      onShowToast(`Check-In berhasil tercatat sebagai Masuk (${status})!`, 'success');
    };

    const handleSelfCheckOut = () => {
      if (!myRecordForToday) return;
      const checkOutTimeVal = currentHHMM;
      const checkInTimeStr = myRecordForToday.checkInTime || '07:00';
      
      const [startHour, startMin] = checkInTimeStr.split(':').map(Number);
      const [currentHour, currentMin] = checkOutTimeVal.split(':').map(Number);

      let totalMinutes = (currentHour * 60 + currentMin) - (startHour * 60 + startMin);
      if (totalMinutes < 0) totalMinutes += 24 * 60;

      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const outputDuration = `${hours}j ${mins}m`;

      const shiftInfo = settings.shifts.find(s => s.name === myRecordForToday.shift || s.name === 'Pagi') || settings.shifts[0];
      const [shiftEndHour, shiftEndMin] = shiftInfo.end.split(':').map(Number);
      const shiftEndTotalMins = shiftEndHour * 60 + shiftEndMin;
      const currentMins = currentHour * 60 + currentMin;

      let workStatus: 'Selesai' | 'Pulang Cepat' = 'Selesai';
      if (currentMins < shiftEndTotalMins) {
        workStatus = 'Pulang Cepat';
      }

      onUpdateRecord(myRecordForToday.id, {
        checkOutTime: checkOutTimeVal,
        duration: outputDuration,
        workStatus: workStatus,
      });

      writeSystemLog(currentUser.nama, currentUser.role, 'Self-CheckOut', `Check-out mandiri pada pukul ${checkOutTimeVal}, Durasi: ${outputDuration}`);
      onShowToast(`Check-Out berhasil tercatat! Durasi kerja: ${outputDuration}`, 'success');
    };

    return (
      <div className="space-y-6 animate-fade-in text-white">
        
        {/* Top Info Banner */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" /> Portal Absensi Mandiri & Sentralisasi
            </h2>
            <p className="text-xs text-slate-400 animate-fade-in">
              {isCentralized ? (
                <span>
                  Presensi harian dan pencatatan absensi Anda dilakukan sepenuhnya secara tersentralisasi oleh 
                  <strong className="text-slate-205 italic text-brand-400"> Team Leader Departemen ({currentUser.departemen})</strong>.
                </span>
              ) : (
                <span>
                  Anda diperbolehkan melakukan **Absensi Mandiri** langsung dari browser smartphone dengan verifikasi geolokasi GPS & Biometrik.
                </span>
              )}
            </p>
          </div>
          <div className={`p-3.5 border rounded-2xl flex items-center gap-2.5 shrink-0 ${
            isCentralized 
              ? 'bg-amber-500/10 border-amber-500/15 text-amber-400' 
              : 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-[11px] font-bold uppercase">{isCentralized ? 'Bimbingan Leader (Terpusat)' : 'Mandiri Aktif'}</span>
          </div>
        </div>

        {/* Big Today status checker board */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Kehadiran Hari Ini ({todayStr})</h3>
          
          {myRecordForToday ? (
            <div className={`p-5 rounded-2xl border ${
              myRecordForToday.status === 'Hadir' || myRecordForToday.status === 'Terlambat'
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/20'
            } flex flex-col md:flex-row md:items-center justify-between gap-4`}>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${
                    myRecordForToday.status === 'Hadir' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                      : myRecordForToday.status === 'Terlambat' || myRecordForToday.status === 'Terlambat Berat'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/15'
                      : 'bg-red-500/10 text-red-400 border-red-500/15'
                  }`}>
                    {myRecordForToday.status}
                  </span>
                  <span className="text-xs text-slate-400">Shift: <strong>{myRecordForToday.shift}</strong></span>
                </div>
                
                <p className="text-sm font-medium text-white">
                  {myRecordForToday.note}
                </p>

                {myRecordForToday.checkInTime && (
                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 pt-2 border-t border-[#30363D]">
                    <div>Jam Masuk: <strong className="text-white">{myRecordForToday.checkInTime} WIB</strong></div>
                    <div>Jam Pulang: <strong className="text-white">{myRecordForToday.checkOutTime || 'Sedang bekerja (belum checkout)'}</strong></div>
                    {myRecordForToday.duration && (
                      <div className="col-span-2">Total Durasi Kerja: <strong className="text-emerald-400">{myRecordForToday.duration}</strong></div>
                    )}
                  </div>
                )}
              </div>

              {!myRecordForToday.checkOutTime && !isCentralized && (
                <button
                  type="button"
                  onClick={handleSelfCheckOut}
                  className="h-10 px-5 bg-amber-500/20 text-amber-400 border border-amber-550/30 font-bold rounded-xl text-xs hover:bg-amber-550/30 cursor-pointer self-start md:self-center transition-all"
                >
                  📤 Checkout Pulang Mandiri
                </button>
              )}

              {myRecordForToday.locationName && (
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 bg-[#21262D] px-3 py-2 rounded-xl border border-[#30363D]">
                    <span className="text-slate-300">📍 Lokasi: {myRecordForToday.locationName}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {isCentralized ? (
                <div className="p-8 border border-dashed border-[#30363D] bg-[#0b0c10] rounded-2xl text-center space-y-2">
                  <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Leader belum memasukkan data kehadiran Anda hari ini.</p>
                  <p className="text-[10px] text-slate-650 leading-relaxed max-w-sm mx-auto">
                    Presensi Anda tersentralisasi penuh di Leader kelompok kerja. Silakan hubungi Team Leader Anda untuk melakukan check-in tim.
                  </p>
                </div>
              ) : (
                <div className="p-5 border border-[#30363D] bg-[#0b0c10] rounded-2xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#161B22] border border-[#30363D] rounded-xl text-center space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">SIMULASI VERIFIKASI GPS & GEOFENCING:</span>
                      <div className="text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        Status GPS: Presisi Terdeteksi (Jarak: 32 meter ke {settings.locations[0]?.nama || 'Pabrik Jatake'})
                      </div>
                      <p className="text-[10px] text-slate-400">Parameter lokasi Anda berada jauh di dalam geofence radius {settings.locations[0]?.radius ?? 150}m.</p>
                    </div>

                    <div className="p-4 bg-[#161B22] border border-[#30363D] rounded-xl text-center space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">SIMULASI SCREEN RECOGNITION (SELFIE):</span>
                      <div className="text-indigo-400 font-semibold text-xs flex items-center justify-center gap-11">
                        🔒 Biometrik Wajah: Lolos Scan AI (Kecocokan 98.7%)
                      </div>
                      <p className="text-[10px] text-slate-400">Verifikasi anti-spoofing kamera depan smartphone aktif.</p>
                    </div>
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => handleSelfCheckIn()}
                      className="h-12 px-8 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-brand-500/20 transition-all"
                    >
                      📱 Check-In Masuk Mandiri Sekarang
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Historical tracking list */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Riwayat Kehadiran Pribadi Anda</h3>
          
          {myHistoricalRecords.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Belum ada riwayat absensi tercatat.</p>
          ) : (
            <div className="overflow-x-auto border border-[#30363D] rounded-xl">
              <table className="w-full text-left font-medium text-xs">
                <thead>
                  <tr className="bg-[#10151B] text-slate-400 border-b border-[#30363D]">
                    <th className="py-3.5 px-4">Tanggal</th>
                    <th className="py-3.5 px-4">Shift</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Jam Kerja</th>
                    <th className="py-3.5 px-4">Catatan Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D] text-slate-300">
                  {myHistoricalRecords.map(rec => {
                    const statusStyles = {
                      Hadir: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
                      Terlambat: 'bg-amber-500/10 text-amber-400 border border-amber-500/15',
                      'Terlambat Berat': 'bg-orange-500/10 text-orange-400 border border-orange-500/15',
                      Sakit: 'bg-red-500/10 text-red-400 border border-red-500/15',
                      Izin: 'bg-sky-500/10 text-sky-400 border border-sky-500/15',
                      Alpha: 'bg-purple-500/10 text-purple-400 border border-purple-500/15',
                    };
                    const badgeClass = statusStyles[rec.status] || 'bg-slate-550/10 text-slate-400 border border-slate-500/15';

                    return (
                      <tr key={rec.id} className="hover:bg-[#21262D]/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{rec.date}</td>
                        <td className="py-3 px-4 text-slate-400">{rec.shift || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${badgeClass}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {rec.checkInTime ? `${rec.checkInTime} - ${rec.checkOutTime || 'Bekerja'}` : '-'}
                          {rec.duration && <div className="text-[10px] text-slate-500">Durasi: {rec.duration}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-400 truncate max-w-[200px]" title={rec.note}>
                          {rec.locationName ? `📍 ${rec.locationName} | ` : ''}{rec.note}
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

  // --- LEADER / ADMIN/ HRD INTERFACE --- //
  return (
    <div className="space-y-6 animate-fade-in text-white">
      
      {/* Search and Filters panel */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#30363D]">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-brand-500" /> Pusat Presensi dan Absensi Tim
            </h3>
            <p className="text-xs text-slate-400">
              {currentUser.role === 'leader' 
                ? `Menceklis kehadiran & ketidakhadiran staff departemen ${currentUser.departemen}.` 
                : 'Mencatat dan mengelola kehadiran staff dari seluruh departemen.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="p-2.5 bg-[#21262D] border border-[#30363D] rounded-xl flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-bold text-slate-200">Mode: {currentUser.role === 'leader' ? 'Leader Tim' : 'Super-Admin'}</span>
            </div>
            <div className={`p-2.5 border rounded-xl flex items-center gap-2 ${
              settings.attendanceRules.attendanceMethod === 'Sentralisasi'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0"></span>
              <span className="text-xs font-bold uppercase">Sistem: {settings.attendanceRules.attendanceMethod === 'Sentralisasi' ? 'Sentralisasi Leader' : 'Mandiri Karyawan'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="flex-1 relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Cari anggota tim berdasarkan nama..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#0B0C10] border border-[#30363D] text-white rounded-xl text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Department filter (Only for Admin & HRD) */}
          {(currentUser.role === 'admin' || currentUser.role === 'hrd') && (
            <div className="w-full md:w-56 flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 whitespace-nowrap font-medium">Dept:</span>
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="w-full h-10 px-3 bg-[#0B0C10] border border-[#30363D] text-white focus:border-brand-500 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="Semua">Semua Departemen</option>
                {uniqueDepartments.map((dept, idx) => (
                  <option key={idx} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main interactive grid list */}
      <div className="grid grid-cols-1 gap-4">
        {filteredEmployees.length === 0 ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-12 text-center text-slate-500 space-y-2">
            <UserX className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">Tidak ada anggota tim yang sesuai dengan filter.</p>
          </div>
        ) : (
          filteredEmployees.map(emp => {
            const todayRecord = attendanceRecords.find(
              r => r.empId === emp.id && r.date === todayStr && r.note !== 'CLEARED'
            );

            // Fetch state modifiers for this employee
            const chosenTimeIn = customInTimes[emp.id] || currentHHMM;
            const chosenTimeOut = customOutTimes[emp.id] || currentHHMM;
            const chosenShift = customShifts[emp.id] || emp.shiftDefault;

            return (
              <div 
                key={emp.id} 
                className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-sm transition-all hover:border-[#444C56] space-y-4"
              >
                {/* Employee card top metadata */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#21262D]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-brand-500/10 border border-brand-500/15 rounded-full flex items-center justify-center font-bold text-brand-400 text-sm">
                      {emp.nama.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white">{emp.nama}</h4>
                      <p className="text-[11px] text-slate-400 leading-none mt-1">
                        Departemen: <strong className="text-slate-300">{emp.departemen}</strong> • Jabatan: <strong className="text-slate-300">{emp.jabatan}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Active Status Badge display */}
                  <div className="flex items-center gap-1.5 self-start md:self-center">
                    <span className="text-[10px] text-slate-500 font-bold">Today Status:</span>
                    {todayRecord ? (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                        todayRecord.status === 'Hadir'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                          : todayRecord.status === 'Terlambat' || todayRecord.status === 'Terlambat Berat'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/15'
                          : 'bg-red-500/10 text-red-400 border-red-500/15'
                      }`}>
                        {todayRecord.status}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-[#21262D] text-slate-300 border-[#30363D]">
                        BELUM ABSEN
                      </span>
                    )}
                  </div>
                </div>

                {/* Operations area block depending on active presence state */}
                {!todayRecord ? (
                  // State 1: Employee is NOT absent/attend yet
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                    
                    {/* Check In Action Box */}
                    <div className="bg-[#0B0C10] border border-[#30363D] rounded-xl p-3.5 space-y-3">
                      <h5 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <UserCheck className="w-4 h-4 text-emerald-500" /> Presensi Masuk (Hadir)
                      </h5>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Custom shift select */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">PILIH SHIFT</label>
                          <select
                            value={chosenShift}
                            onChange={e => setCustomShifts(prev => ({ ...prev, [emp.id]: e.target.value }))}
                            className="w-full h-8 px-1.5 bg-[#161B22] border border-[#30363D] text-white rounded focus:outline-none focus:border-emerald-500"
                          >
                            {settings.shifts.filter(s => s.active).map(s => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Custom clock-in input */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">JAM MASUK (WIB)</label>
                          <input
                            type="text"
                            placeholder="HH:MM"
                            value={chosenTimeIn}
                            onChange={e => setCustomInTimes(prev => ({ ...prev, [emp.id]: e.target.value }))}
                            className="w-full h-8 px-2 bg-[#161B22] border border-[#30363D] text-white rounded focus:outline-none focus:border-emerald-500 text-center font-bold"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleLeaderCheckIn(emp)}
                        className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 font-bold transition-all rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer shadow-md text-white"
                      >
                        <Check className="w-3.5 h-3.5" /> Konfirmasi Masuk
                      </button>
                    </div>

                    {/* Absent / Tidak Masuk Box */}
                    <div className="bg-[#0B0C10] border border-[#30363D] rounded-xl p-3.5 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h5 className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                          <UserX className="w-4 h-4 text-red-500" /> Berhalangan (Tidak Masuk)
                        </h5>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          Pilih salah satu status ketidakhadiran di bawah untuk dimasukkan ke laporan manual.
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <button
                          onClick={() => handleLeaderMarkLeave(emp, 'Sakit')}
                          className="h-9 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-400 rounded-lg text-[11px] font-black transition-colors"
                        >
                          Sakit
                        </button>
                        <button
                          onClick={() => handleLeaderMarkLeave(emp, 'Izin')}
                          className="h-9 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 hover:border-sky-400 rounded-lg text-[11px] font-black transition-colors"
                        >
                          Izin
                        </button>
                        <button
                          onClick={() => handleLeaderMarkLeave(emp, 'Alpha')}
                          className="h-9 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 hover:border-purple-400 rounded-lg text-[11px] font-black transition-colors"
                        >
                          Alpha
                        </button>
                      </div>
                    </div>

                  </div>
                ) : todayRecord.checkInTime !== null && todayRecord.checkOutTime === null ? (
                  // State 2: Employee has checked-in, waiting for checkout
                  <div className="bg-[#0B0C10] border border-[#30363D] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <p className="text-xs text-slate-400">
                        Status: <strong className="text-emerald-400">Masuk ({todayRecord.status})</strong> jam <strong className="text-white">{todayRecord.checkInTime} WIB</strong> (Shift {todayRecord.shift})
                      </p>
                      <p className="text-[11px] text-slate-500">
                        📍 Lokasi: {todayRecord.locationName} | Catatan: "{todayRecord.note}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Pick custom checkout hour */}
                      <div className="flex flex-col space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-500 text-center uppercase">JAM KELUAR</span>
                        <input
                          type="text"
                          placeholder="HH:MM"
                          value={chosenTimeOut}
                          onChange={e => setCustomOutTimes(prev => ({ ...prev, [emp.id]: e.target.value }))}
                          className="w-16 h-8 bg-[#161B22] border border-[#30363D] text-white text-xs font-bold rounded text-center focus:outline-none mt-0.5"
                        />
                      </div>

                      <button
                        onClick={() => handleLeaderCheckOut(todayRecord)}
                        className="h-9 px-4 bg-indigo-650 hover:bg-indigo-700 text-white font-bold transition-all rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer shadow-md"
                      >
                        Check-Out
                      </button>

                      {/* Reset override button if registered incorrectly */}
                      <button
                        onClick={() => {
                          // Allow leader to fix incorrect logs by treating it as changing status
                          onUpdateRecord(todayRecord.id, {
                            checkInTime: null,
                            checkOutTime: null,
                            status: 'Alpha',
                            note: 'Absen direset oleh Leader'
                          });
                          onShowToast(`Absen ${emp.nama} diubah ke status Alpha. Silakan reset ulang jika diperlukan.`, 'warning');
                        }}
                        title="Ubah ke Alpha / Reset"
                        className="h-9 w-9 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // State 3: Daily presence completed (Hadir Checked Out or Sakit/Izin/Alpha recorded)
                  <div className="bg-[#0B0C10] border border-[#22272e] rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      {todayRecord.checkInTime ? (
                        <>
                          <p className="text-xs text-white">
                            🎉 <strong>Selesai Bekerja</strong> (Shift: {todayRecord.shift}) • Durasi: <strong className="text-emerald-400">{todayRecord.duration}</strong>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Masuk: {todayRecord.checkInTime} WIB | Pulang: {todayRecord.checkOutTime} WIB | Status: {todayRecord.workStatus || 'Selesai'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-white">
                            Ketidakhadiran Tercatat: <strong className="text-indigo-400">{todayRecord.status}</strong>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Halangan tercatat: {todayRecord.note}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Change options triggers */}
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          // Change back by allowing reset via editing times or status
                          onUpdateRecord(todayRecord.id, {
                            checkInTime: null,
                            checkOutTime: null,
                            status: 'Alpha', // temporary Alpha placeholder before overriding
                            note: 'Direset kembali oleh Leader'
                          });
                          // Wait, to make it easier to re-do we also just support doing checkin again!
                          // Let's reset the parent row so it becomes "Belum Absen"!
                          // To do this, we can set status back to clear by setting it to a special dummy or updating it.
                          // Wait! If there is todayRecord with no checkInTime and no checkOutTime, and status is 'Alpha', we can just let them change status back easily, or we can look up if we can delete. Since we don't have delete, let's treat any record that has a note of 'Direset kembali oleh Leader' or similar as NOT clocked in, so the UI falls back to State 1!
                          // Yes! If `todayRecord.note === 'CLEARED'`, we treat it as undefined! This lets leaders completely clear and re-do! It's an exceptionally clever trick!
                          onUpdateRecord(todayRecord.id, {
                            note: 'CLEARED'
                          });
                          onShowToast(`Status absensi ${emp.nama} telah direset. Silakan catat kembali.`, 'success');
                        }}
                        className="h-8 px-3 bg-[#161B22] border border-[#30363D] hover:bg-[#21262D] text-slate-300 rounded text-[11px] font-bold transition-all cursor-pointer"
                      >
                        Reset / Catat Ulang
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
