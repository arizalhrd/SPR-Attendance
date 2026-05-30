/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building, LogOut, Menu, UserCheck, Smartphone, 
  LayoutDashboard, MapPin, CalendarClock, ShieldAlert,
  ClipboardList, Sliders, CheckSquare, Sparkles 
} from 'lucide-react';

import { 
  Employee, AttendanceRecord, SystemSettings, 
  ApprovalRequest, Announcement, SystemLog 
} from './types';

import { 
  defaultSettings, initialEmployees, defaultAnnouncements, 
  defaultApprovals, defaultAttendance, writeSystemLog, playNotificationSound 
} from './utils';

import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Attendance from './components/Attendance';
import Employees from './components/Employees';
import Approvals from './components/Approvals';
import LeaveLembur from './components/LeaveLembur';
import Reports from './components/Reports';
import Settings from './components/Settings';

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  
  // App states
  const [currentUser, setCurrentUser] = useState<{ id: number; nama: string; role: any; departemen: string } | null>(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);

  // Clock state
  const [liveClock, setLiveClock] = useState('--:--:--');
  const [liveDate, setLiveDate] = useState('');

  // 1. Initial State Hydration with Local Storage Protection
  useEffect(() => {
    // Session state check
    const storedSession = sessionStorage.getItem('attend_session');
    if (storedSession) {
      setCurrentUser(JSON.parse(storedSession));
    }

    // Fetch dynamic configuration from custom Express backend
    fetch('/api/config')
      .then(res => res.json())
      .then(config => {
        const isDemo = config.demoMode !== false;
        setIsDemoMode(isDemo);

        const localEmps = localStorage.getItem('employees');
        const localAtt = localStorage.getItem('attendance');
        const localReqs = localStorage.getItem('approvals');
        const localAnn = localStorage.getItem('announcements');
        const localSet = localStorage.getItem('system_settings');

        if (localEmps) {
          setEmployees(JSON.parse(localEmps));
        } else {
          setEmployees(initialEmployees);
          localStorage.setItem('employees', JSON.stringify(initialEmployees));
        }

        if (localAtt) {
          setAttendanceRecords(JSON.parse(localAtt));
        } else {
          const fallbackAtt = isDemo ? defaultAttendance : [];
          setAttendanceRecords(fallbackAtt);
          localStorage.setItem('attendance', JSON.stringify(fallbackAtt));
        }

        if (localReqs) {
          setRequests(JSON.parse(localReqs));
        } else {
          const fallbackReqs = isDemo ? defaultApprovals : [];
          setRequests(fallbackReqs);
          localStorage.setItem('approvals', JSON.stringify(fallbackReqs));
        }

        if (localAnn) {
          setAnnouncements(JSON.parse(localAnn));
        } else {
          const fallbackAnn = isDemo ? defaultAnnouncements : [];
          setAnnouncements(fallbackAnn);
          localStorage.setItem('announcements', JSON.stringify(fallbackAnn));
        }

        if (localSet) {
          const parsed = JSON.parse(localSet);
          if (parsed.company && (parsed.company.logo === '/logo.svg' || !parsed.company.logo)) {
            parsed.company.logo = '/company_logo.png';
            localStorage.setItem('system_settings', JSON.stringify(parsed));
          }
          setSettings(parsed);
        } else {
          setSettings(defaultSettings);
          localStorage.setItem('system_settings', JSON.stringify(defaultSettings));
        }
      })
      .catch(err => {
        console.error("Gagal mendapatkan config dari backend, memakai fallback offline:", err);
        // Fallback for offline mode or developer setup
        const localEmps = localStorage.getItem('employees');
        const localAtt = localStorage.getItem('attendance');
        const localReqs = localStorage.getItem('approvals');
        const localAnn = localStorage.getItem('announcements');
        const localSet = localStorage.getItem('system_settings');

        setEmployees(localEmps ? JSON.parse(localEmps) : initialEmployees);
        setAttendanceRecords(localAtt ? JSON.parse(localAtt) : defaultAttendance);
        setRequests(localReqs ? JSON.parse(localReqs) : defaultApprovals);
        setAnnouncements(localAnn ? JSON.parse(localAnn) : defaultAnnouncements);
        if (localSet) {
          const parsed = JSON.parse(localSet);
          setSettings(parsed);
        } else {
          setSettings(defaultSettings);
        }
      });

    // Fast clock ticker
    const timer = setInterval(() => {
      const now = new Date();
      setLiveClock(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLiveDate(now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Sync state mutation logs back to persistent storage
  const syncEmployeesState = (latestEmps: Employee[]) => {
    setEmployees(latestEmps);
    localStorage.setItem('employees', JSON.stringify(latestEmps));
  };

  const syncAttendanceState = (latestAtt: AttendanceRecord[]) => {
    setAttendanceRecords(latestAtt);
    localStorage.setItem('attendance', JSON.stringify(latestAtt));
  };

  const syncRequestsState = (latestReqs: ApprovalRequest[]) => {
    setRequests(latestReqs);
    localStorage.setItem('approvals', JSON.stringify(latestReqs));
  };

  const syncSettingsState = (latestSet: SystemSettings) => {
    setSettings(latestSet);
    localStorage.setItem('system_settings', JSON.stringify(latestSet));
  };

  const showNotificationToast = (msg: string, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    if (settings?.notification?.soundActive) {
      playNotificationSound();
    }
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleLoginSuccess = (user: { id: number; nama: string; role: any; departemen: string }) => {
    setCurrentUser(user);
    sessionStorage.setItem('attend_session', JSON.stringify(user));
    writeSystemLog(user.nama, user.role, 'Session', 'Berhasil masuk ke portal');
    showNotificationToast(`Selamat datang ${user.nama}! Login berhasil.`, 'success');
    
    // Set landing tab based on role
    if (user.role === 'karyawan') {
      setActiveTab('Kehadiran');
    } else {
      setActiveTab('Dashboard');
    }
  };

  const handleSignOut = () => {
    if (currentUser) {
      writeSystemLog(currentUser.nama, currentUser.role, 'Session', 'Keluar dari portal');
    }
    setCurrentUser(null);
    sessionStorage.removeItem('attend_session');
    showNotificationToast('Anda telah keluar sistem dengan aman.', 'info');
  };

  // Auth guard wrapper
  if (!currentUser) {
    return (
      <Auth 
        employees={employees} 
        onLoginSuccess={handleLoginSuccess}
        logoUrl={settings.company.logo}
        companyName={settings.company.nama}
      />
    );
  }

  // Access constraints checks per role
  const isKaryawan = currentUser.role === 'karyawan';
  const isLeader = currentUser.role === 'leader';
  const isAdminOrHrd = currentUser.role === 'admin' || currentUser.role === 'hrd';

  // Responsive sidebar drawer controller
  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    setIsSidebarOpen(false); // Close responsive drawers on navigation
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#C5C6C7] flex flex-col md:flex-row font-sans overflow-x-hidden select-none">
      
      {/* Toast Alert stack overlay */}
      <div className="fixed top-5 right-5 z-[2000] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const colors = {
            success: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/10',
            error: 'bg-red-600 text-white border-red-500 shadow-red-600/10',
            warning: 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/10',
            info: 'bg-[#161B22] text-white border-[#30363D] shadow-slate-900/10',
          };
          const borderColored = colors[t.type as 'success'] || colors.info;
          return (
            <div 
              key={t.id} 
              className={`p-3 px-5 rounded-2xl text-xs font-bold border shadow-lg flex items-center gap-2 pointer-events-auto transition-all transform scale-100 ${borderColored}`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{t.msg}</span>
            </div>
          );
        })}
      </div>

      {/* Desktop Persistent Sidebar Drawer */}
      <aside className={`fixed top-0 bottom-0 left-0 bg-[#161B22] text-[#C5C6C7] w-72 border-r border-[#30363D] flex flex-col justify-between z-50 transition-transform md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-6">
          {/* Brand visual header label */}
          <div className="p-6 border-b border-[#30363D] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-950 border-2 border-[#30363D] p-0.5 flex items-center justify-center shadow-lg shadow-[#161B22]/60 shrink-0">
                {settings.company.logo ? (
                  <img src={settings.company.logo} alt="Organization Logo" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <UserCheck className="w-5 h-5 text-brand-500" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-tight truncate max-w-44 leading-tight">{settings.company.nama}</h2>
                <span className="text-[10px] text-slate-500 font-bold block leading-none">AttendPro HRIS</span>
              </div>
            </div>
            {/* Close trigger drawer on Mobile */}
            <button 
              onClick={handleToggleSidebar}
              className="block md:hidden text-slate-500 hover:text-white"
            >
              <LogOut className="w-4 h-4 rotate-180" />
            </button>
          </div>

          {/* Quick profile lockup widgets in Sidebar panel */}
          <div className="px-6 pb-2 border-b border-[#30363D] space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">USER PROFILE</p>
            <h3 className="text-sm font-bold text-white">{currentUser.nama}</h3>
            <span className="inline-block bg-brand-500/10 text-brand-400 font-bold border border-brand-500/15 text-[9px] uppercase px-2 py-0.5 rounded-full leading-none">
              Role: {currentUser.role}
            </span>
          </div>

          {/* Navigation Items menu mapping */}
          <nav className="p-4 space-y-1">
            {/* Only admins, hrd, or leader get full statistics overview dashboard */}
            {!isKaryawan && (
              <button
                onClick={() => handleTabChange('Dashboard')}
                className={`w-full h-11 px-4 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                  activeTab === 'Dashboard' 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/15' 
                    : 'hover:bg-[#21262D] text-[#C5C6C7] hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Utama</span>
              </button>
            )}

            <button
              onClick={() => handleTabChange('Kehadiran')}
              className={`w-full h-11 px-4 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                activeTab === 'Kehadiran' 
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/15' 
                  : 'hover:bg-[#21262D] text-[#C5C6C7] hover:text-white'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Pusat Absensi (SIM)</span>
            </button>

            <button
              onClick={() => handleTabChange('Layanan (Cuti/Lembur)')}
              className={`w-full h-11 px-4 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                activeTab === 'Layanan (Cuti/Lembur)' 
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/15' 
                  : 'hover:bg-[#21262D] text-[#C5C6C7] hover:text-white'
              }`}
            >
              <CalendarClock className="w-4 h-4" />
              <span>Cuti & Jam Lembur</span>
            </button>

            {/* Administrators, HRD, or leaders handle approvals */}
            {!isKaryawan && (
              <button
                onClick={() => handleTabChange('Approval Center')}
                className={`w-full h-11 px-4 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                  activeTab === 'Approval Center' 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/15' 
                    : 'hover:bg-[#21262D] text-[#C5C6C7] hover:text-white'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Approval Pengajuan</span>
              </button>
            )}

            {isAdminOrHrd && (
              <>
                <button
                  onClick={() => handleTabChange('Database Karyawan')}
                  className={`w-full h-11 px-4 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                    activeTab === 'Database Karyawan' 
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/15' 
                      : 'hover:bg-[#21262D] text-[#C5C6C7] hover:text-white'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>Database Staff</span>
                </button>

                <button
                  onClick={() => handleTabChange('Laporan')}
                  className={`w-full h-11 px-4 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                    activeTab === 'Laporan' 
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/15' 
                      : 'hover:bg-[#21262D] text-[#C5C6C7] hover:text-white'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Rekap Laporan</span>
                </button>

                {isAdminOrHrd && (
                  <button
                    onClick={() => handleTabChange('Sistem Pengaturan')}
                    className={`w-full h-11 px-4 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors cursor-pointer ${
                      activeTab === 'Sistem Pengaturan' 
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/15' 
                        : 'hover:bg-[#21262D] text-[#C5C6C7] hover:text-white'
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Sistem Pengaturan</span>
                  </button>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Anchor clock + LogOut in Sidebar Bottom */}
        <div className="p-6 border-t border-[#30363D] bg-[#161B22] space-y-4">
          <div className="p-4 bg-[#21262D] border border-[#30363D] rounded-2xl text-center space-y-1">
            <div className="text-xl font-black font-display text-white tracking-widest">{liveClock}</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{liveDate}</div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full h-11 bg-red-950/40 hover:bg-red-900/50 border border-red-500/25 text-red-400 text-xs font-bold rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main viewport area layout right side */}
      <div className="flex-1 md:ml-72 flex flex-col min-h-screen pb-24 md:pb-6">
        
        {/* Topbar navigation menu headers */}
        <header className="bg-[#161B22] border-b border-[#30363D] flex items-center justify-between px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleToggleSidebar}
              className="block md:hidden border border-[#30363D] p-2 rounded-xl text-slate-400 active:bg-slate-800"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-base font-black font-display tracking-tight text-white">
              {activeTab}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:flex flex-col text-right leading-tight">
              <span className="font-bold text-slate-200">{currentUser.nama}</span>
              <span className="text-[10px] text-slate-400">{currentUser.departemen}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#21262D] font-extrabold text-brand-400 flex items-center justify-center border border-[#30363D]">
              {currentUser.nama.charAt(0)}
            </div>
          </div>
        </header>

        {/* Content canvas container */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {activeTab === 'Dashboard' && !isKaryawan && (
            <Dashboard 
              employees={employees} 
              attendanceRecords={attendanceRecords} 
              announcements={announcements} 
              settings={settings}
              currentUser={currentUser}
              onNavigate={handleTabChange}
            />
          )}

          {activeTab === 'Kehadiran' && (
            <Attendance 
              employees={employees} 
              attendanceRecords={attendanceRecords} 
              settings={settings} 
              currentUser={currentUser}
              onAddRecord={(rec) => syncAttendanceState([...attendanceRecords, rec])}
              onUpdateRecord={(id, updated) => {
                const updatedList = attendanceRecords.map(r => r.id === id ? { ...r, ...updated } : r);
                syncAttendanceState(updatedList);
              }}
              onShowToast={showNotificationToast}
            />
          )}

          {activeTab === 'Layanan (Cuti/Lembur)' && (
            <LeaveLembur 
              currentUser={currentUser}
              employees={employees}
              requests={requests}
              onAddRequest={(payload) => syncRequestsState([payload, ...requests])}
              onShowToast={showNotificationToast}
            />
          )}

          {activeTab === 'Approval Center' && !isKaryawan && (
            <Approvals 
              requests={requests}
              currentUser={currentUser}
              onUpdateStatus={(id, status, logs) => {
                const refreshed = requests.map(r => r.id === id ? { ...r, status, logs } : r);
                
                // If cuti is approved at final stage, deduct quota
                const theReq = requests.find(r => r.id === id);
                if (status === 'Approved' && theReq && theReq.type === 'Cuti') {
                  const matchDays = parseInt(theReq.details.match(/\d+/)?.[0] || '1');
                  const targetEmp = employees.find(e => e.id === theReq.empId);
                  if (targetEmp) {
                    const latestQuota = Math.max(0, targetEmp.saldoCuti - matchDays);
                    const updatedEmpList = employees.map(e => e.id === theReq.empId ? { ...e, saldoCuti: latestQuota } : e);
                    syncEmployeesState(updatedEmpList);
                  }
                }

                syncRequestsState(refreshed);
              }}
              onShowToast={showNotificationToast}
            />
          )}

          {activeTab === 'Database Karyawan' && isAdminOrHrd && (
            <Employees 
              employees={employees} 
              currentUser={currentUser}
              onAddEmployee={(newEmp) => syncEmployeesState([...employees, newEmp])}
              onUpdateEmployee={(id, updated) => {
                const list = employees.map(e => e.id === id ? { ...e, ...updated } : e);
                syncEmployeesState(list);
              }}
              onDeleteEmployee={(id) => {
                const list = employees.filter(e => e.id !== id);
                syncEmployeesState(list);
              }}
              onShowToast={showNotificationToast}
            />
          )}

          {activeTab === 'Laporan' && isAdminOrHrd && (
            <Reports 
              attendanceRecords={attendanceRecords} 
              employees={employees}
              onShowToast={showNotificationToast}
            />
          )}

          {activeTab === 'Sistem Pengaturan' && isAdminOrHrd && (
            <Settings 
              settings={settings}
              currentUser={currentUser}
              onUpdateSettings={syncSettingsState}
              onShowToast={showNotificationToast}
            />
          )}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION MENU BAR - Explicit Mobile-first bottom navigation */}
      <div className="md:hidden fixed bottom-1 inset-x-2 bg-[#161B22] text-[#C5C6C7] h-16 rounded-2xl flex items-center justify-around border border-[#30363D] z-40 px-3 shadow-2xl">
        <button
          onClick={() => handleTabChange(isKaryawan ? 'Kehadiran' : 'Dashboard')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
            activeTab === 'Dashboard' || activeTab === 'Kehadiran' ? 'text-brand-400 font-bold scale-105' : 'hover:text-white'
          }`}
        >
          {isKaryawan ? <MapPin className="w-5 h-5" /> : <LayoutDashboard className="w-5 h-5" />}
          <span className="text-[9px] mt-1 font-semibold">{isKaryawan ? 'Absensi' : 'Home'}</span>
        </button>

        <button
          onClick={() => handleTabChange('Layanan (Cuti/Lembur)')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
            activeTab === 'Layanan (Cuti/Lembur)' ? 'text-brand-400 font-bold scale-105' : 'hover:text-white'
          }`}
        >
          <CalendarClock className="w-5 h-5" />
          <span className="text-[9px] mt-1 font-semibold">Layanan</span>
        </button>

        {!isKaryawan && (
          <button
            onClick={() => handleTabChange('Approval Center')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
              activeTab === 'Approval Center' ? 'text-brand-400 font-bold scale-105' : 'hover:text-white'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span className="text-[9px] mt-1 font-semibold">Persetujuan</span>
          </button>
        )}

        {isAdminOrHrd && (
          <>
            <button
              onClick={() => handleTabChange('Database Karyawan')}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
                activeTab === 'Database Karyawan' ? 'text-brand-400 font-bold scale-105' : 'hover:text-white'
              }`}
            >
              <Building className="w-5 h-5" />
              <span className="text-[9px] mt-1 font-semibold">Karyawan</span>
            </button>

            <button
              onClick={() => handleTabChange('Laporan')}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
                activeTab === 'Laporan' ? 'text-brand-400 font-bold scale-105' : 'hover:text-white'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span className="text-[9px] mt-1 font-semibold">Rekap</span>
            </button>
          </>
        )}

        <button
          onClick={handleSignOut}
          className="flex flex-col items-center justify-center p-2 rounded-xl hover:text-white shrink-0 cursor-pointer"
        >
          <LogOut className="w-5 h-5 text-red-400" />
          <span className="text-[9px] mt-1 text-red-400 font-semibold">Keluar</span>
        </button>
      </div>
    </div>
  );
}
