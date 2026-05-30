/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, SystemSettings, SystemLog, AttendanceRecord, ApprovalRequest, Announcement } from './types';

// Haversine Formula for Geofence radius check
export function playNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Note 1 (High, crisp sine wave)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Note 2 (Play after 100ms delay, higher note)
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5 (musical chime)
      gain2.gain.setValueAtTime(0.15, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.4);
    }, 100);
  } catch (e) {
    console.warn("Audio feedback blocked or unsupported by browser sandbox:", e);
  }
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

export function formatTime24(date: Date): string {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function writeSystemLog(
  user: string,
  role: string,
  action: string,
  details: string
): void {
  const logs: SystemLog[] = JSON.parse(localStorage.getItem('system_logs') || '[]');
  const now = new Date();
  const newLog: SystemLog = {
    id: Date.now(),
    date: formatDateString(now),
    time: formatTime24(now),
    user,
    role,
    action,
    ip: '192.168.1.' + Math.floor(Math.random() * 254 + 1), // Simulated IP
    device: navigator.userAgent.includes('Mobile') ? 'Mobile (iOS/Android)' : 'Desktop (Windows/macOS)',
    details,
  };
  logs.unshift(newLog);
  localStorage.setItem('system_logs', JSON.stringify(logs.slice(0, 1000))); // Limit to latest 1000 logs
}

// Initial hydration templates
export const defaultSettings: SystemSettings = {
  company: {
    nama: 'PT Selancar Panen Raya',
    logo: '/company_logo.png',
    alamat: 'Kawasan Industri Jatake, Jl. Industri 3, Blok F No. 9, Tangerang',
    telepon: '(021) 59319116',
    email: 'hrd@selancarpanenraya.co.id',
    website: 'www.selancarpanenraya.co.id',
    npwp: '01.234.567.8-901.000',
    direktur: 'Arizal',
  },
  shifts: [
    { id: '1', name: 'Pagi', start: '07:00', end: '15:00', active: true },
    { id: '2', name: 'Siang', start: '15:00', end: '23:00', active: true },
    { id: '3', name: 'Malam', start: '23:00', end: '07:00', active: true },
    { id: '4', name: 'Office', start: '08:00', end: '17:00', active: true },
    { id: '5', name: 'Gudang', start: '08:00', end: '16:00', active: true },
    { id: '6', name: 'Security1', start: '07:00', end: '19:00', active: true },
    { id: '7', name: 'Security2', start: '19:00', end: '07:00', active: true },
  ],
  attendanceRules: {
    toleransiTerlambat: 10, // 0-10 min = Hadir
    terlambatBerat: 30, // > 30 min = Terlambat berat
    pulangCepat: true,
    autoAlpha: true,
    attendanceMethod: 'Mandiri',
  },
  locations: [
    { id: 'l1', nama: 'Kawasan Industri Jatake (Pabrik)', latitude: -6.2163, longitude: 106.5684, radius: 150 },
    { id: 'l2', nama: 'Kantor Wilayah Tangerang', latitude: -6.1783, longitude: 106.6319, radius: 100 },
  ],
  selfie: {
    wajibSelfieCheckIn: true,
    wajibSelfieCheckOut: true,
    simpanFoto: true,
    kameraDepan: true,
  },
  workHours: [
    { id: 'wh1', departemen: 'Office', hariKerja: 'Senin - Jumat', jamMasuk: '08:00', jamPulang: '17:00' },
    { id: 'wh2', departemen: 'Gudang', hariKerja: 'Senin - Sabtu', jamMasuk: '08:00', jamPulang: '16:00' },
    { id: 'wh3', departemen: 'Produksi', hariKerja: 'Senin - Sabtu (Shift)', jamMasuk: '07:00', jamPulang: '15:00' },
    { id: 'wh4', departemen: 'Security', hariKerja: 'Rotasi Shift', jamMasuk: '07:00', jamPulang: '19:00' },
  ],
  overtime: {
    minLembur: 1,
    maxLembur: 5,
    autoHitung: true,
    approvalRequired: true,
  },
  leaves: [
    { id: 'l_annual', name: 'Cuti Tahunan', days: 12, approvalRequired: true, docRequired: false },
    { id: 'l_marriage', name: 'Cuti Menikah', days: 3, approvalRequired: true, docRequired: true },
    { id: 'l_maternity', name: 'Cuti Melahirkan', days: 90, approvalRequired: true, docRequired: true },
    { id: 'l_special', name: 'Cuti Khusus', days: 2, approvalRequired: true, docRequired: true },
  ],
  holidays: [
    { id: 'h1', nama: 'Tahun Baru Masehi', tanggal: '2026-01-01' },
    { id: 'h2', nama: 'Hari Raya Idul Fitri', tanggal: '2026-03-30' },
    { id: 'h3', nama: 'Hari Buruh Internasional', tanggal: '2026-05-01' },
    { id: 'h4', nama: 'Hari Kemerdekaan RI', tanggal: '2026-08-17' },
  ],
  notification: {
    waActive: true,
    emailActive: true,
    tgActive: false,
    soundActive: true,
    triggers: {
      checkIn: true,
      checkOut: true,
      terlambat: true,
      izin: true,
      sakit: true,
      approval: true,
    },
  },
  approvalWorkflow: {
    stages: ['Leader', 'HRD'],
  },
  permissions: {
    admin: {
      dashboard: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      employee: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      attendance: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      approval: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      reports: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      settings: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    },
    hrd: {
      dashboard: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      employee: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      attendance: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      approval: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      reports: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
      settings: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    },
    leader: {
      dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      employee: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
      attendance: { view: true, create: true, edit: false, delete: false, approve: false, export: false },
      approval: { view: true, create: false, edit: false, delete: false, approve: true, export: false },
      reports: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
      settings: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    },
    supervisor: {
      dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      employee: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
      attendance: { view: true, create: true, edit: false, delete: false, approve: false, export: false },
      approval: { view: true, create: false, edit: false, delete: false, approve: true, export: false },
      reports: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      settings: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    },
    manager: {
      dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      employee: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      attendance: { view: true, create: true, edit: false, delete: false, approve: false, export: false },
      approval: { view: true, create: false, edit: false, delete: false, approve: true, export: true },
      reports: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
      settings: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    },
    karyawan: {
      dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      employee: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
      attendance: { view: true, create: true, edit: false, delete: false, approve: false, export: false },
      approval: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
      reports: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
      settings: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    },
  },
  integration: {
    googleSheetsUrl: '',
    googleDriveUrl: '',
    smtpHost: '',
    waGateway: '',
    telegramBotToken: '',
    restApiUrl: '',
  },
};

// Default Employees matching original data
export const initialEmployees: Employee[] = [
  { id: 1, nama: 'Aat robihat', departemen: 'Produksi (Aat)', jabatan: 'Leader Operator', shiftDefault: 'Pagi', username: 'aat', password: 'SPRTNG', role: 'leader', status: 'Aktif', saldoCuti: 12 },
  { id: 5, nama: 'Ahmad', departemen: 'Produksi', jabatan: 'Leader Mixing', shiftDefault: 'Pagi', username: 'ahmad', password: 'SPRTNG', role: 'leader', status: 'Aktif', saldoCuti: 12 },
  { id: 16, nama: 'Ayu Juwita', departemen: 'Produksi (Ayu)', jabatan: 'Leader Operator', shiftDefault: 'Pagi', username: 'ayuj', password: 'SPRTNG', role: 'leader', status: 'Aktif', saldoCuti: 12 },
  { id: 17, nama: 'Ayuk septiani putri', departemen: 'QC/QA', jabatan: 'Kepala QC', shiftDefault: 'Pagi', username: 'ayuk', password: 'SPRTNG', role: 'leader', status: 'Aktif', saldoCuti: 12 },
  { id: 67, nama: 'Lie. Wiharto', departemen: 'Gudang', jabatan: 'Kepala Gudang', shiftDefault: 'Gudang', username: 'lie', password: 'SPRTNG', role: 'leader', status: 'Aktif', saldoCuti: 12 },
  { id: 98, nama: 'Retna wati', departemen: 'Produksi (Retna)', jabatan: 'Leader Operator', shiftDefault: 'Pagi', username: 'retna', password: 'SPRTNG', role: 'leader', status: 'Aktif', saldoCuti: 12 },
  { id: 103, nama: 'Setio sihrohani', departemen: 'Produksi', jabatan: 'Leader Packing', shiftDefault: 'Pagi', username: 'setio', password: 'SPRTNG', role: 'leader', status: 'Aktif', saldoCuti: 12 },
  { id: 120, nama: 'Suparno', departemen: 'Produksi', jabatan: 'Kepala Produksi', shiftDefault: 'Pagi', username: 'suparno', password: 'SPRTNG', role: 'leader', status: 'Aktif', saldoCuti: 12 },
  { id: 129, nama: 'WANA DHIRIN', departemen: 'Teknisi/Mekanik', jabatan: 'Kepala Mekanik', shiftDefault: 'Pagi', username: 'wana', password: 'SPRTNG', role: 'leader', status: 'Aktif', saldoCuti: 12 },
  { id: 136, nama: 'Susan', departemen: 'Produksi', jabatan: 'Asisten Kepala Produksi', shiftDefault: 'Pagi', username: 'susan', password: 'SPRTNG', role: 'leader', status: 'Aktif', saldoCuti: 12 },
  { id: 14, nama: 'Arizal', departemen: 'HRD', jabatan: 'HRD', shiftDefault: 'Office', username: 'arizal', password: 'hrd123', role: 'hrd', status: 'Aktif', saldoCuti: 12 },
  { id: 2, nama: 'ABDUL HIDAYAT', departemen: 'Teknisi/Mekanik', jabatan: 'Mekanik', shiftDefault: 'Pagi', username: 'abdul', password: '123', role: 'karyawan', status: 'Aktif', saldoCuti: 12 },
  { id: 3, nama: 'Ade Jubaedah', departemen: 'Cleaning Service', jabatan: 'Cleaning Service', shiftDefault: 'Pagi', username: 'ade', password: '123', role: 'karyawan', status: 'Aktif', saldoCuti: 12 },
];

export const defaultAnnouncements: Announcement[] = [
  { id: 1, title: 'Kebijakan Jam Kerja Lebaran', content: 'Selama sepekan menyambut Idul Fitri, jam operasional dikondisikan bagi pemegang shift gudang diatur tersendiri.', type: 'Kebijakan Baru', date: '2026-05-28', createdBy: 'HRD' },
  { id: 2, title: 'Rapat Koordinasi Bulanan', content: 'Agenda rapat evaluasi bulanan seluruh leader departemen di ruang rapat utama jam 13:00 WIB.', type: 'Meeting', date: '2026-05-29', createdBy: 'Admin' },
  { id: 3, title: 'Libur Hari Lahir Pancasila', content: 'Diumumkan kepada seluruh karyawan bahwa tanggal 1 Juni ditetapkan sebagai Hari Libur Nasional.', type: 'Libur', date: '2026-05-30', createdBy: 'HRD' },
];

export const defaultApprovals: ApprovalRequest[] = [
  {
    id: 1001,
    empId: 2,
    nama: 'ABDUL HIDAYAT',
    departemen: 'Teknisi/Mekanik',
    type: 'Izin',
    date: '2026-05-31',
    details: 'Izin urusan keluarga mendesak',
    alasan: 'Menghadiri wisuda adik kandung di Bandung',
    status: 'Pending',
    stage: 'Leader',
    logs: [{ stage: 'Pengajuan', actor: 'ABDUL HIDAYAT', action: 'Submit', time: '2026-05-30 08:30' }]
  },
  {
    id: 1002,
    empId: 3,
    nama: 'Ade Jubaedah',
    departemen: 'Cleaning Service',
    type: 'Sakit',
    date: '2026-05-30',
    details: 'Sakit Demam Tinggi',
    alasan: 'Sakit sesuai surat dokter terlampir',
    status: 'Pending',
    stage: 'Leader',
    logs: [{ stage: 'Pengajuan', actor: 'Ade Jubaedah', action: 'Submit', time: '2026-05-30 09:12' }],
    proof: 'surat_dokter.jpg'
  }
];

export const defaultAttendance: AttendanceRecord[] = [
  {
    id: 201,
    empId: 1,
    nama: 'Aat robihat',
    departemen: 'Produksi (Aat)',
    jabatan: 'Leader Operator',
    shift: 'Pagi',
    date: '2026-05-29',
    checkInTime: '06:54',
    checkOutTime: '15:02',
    duration: '8j 8m',
    status: 'Hadir',
    note: 'Siap shift pagi',
    workStatus: 'Selesai',
    selfie: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=40&ixlib=rb-4.0.3',
    locationName: 'Pabrik Gudang Utama'
  },
  {
    id: 202,
    empId: 5,
    nama: 'Ahmad',
    departemen: 'Produksi',
    jabatan: 'Leader Mixing',
    shift: 'Pagi',
    date: '2026-05-29',
    checkInTime: '07:15',
    checkOutTime: '15:10',
    duration: '7j 55m',
    status: 'Terlambat',
    note: 'Ban bocor di jalan',
    workStatus: 'Selesai',
    selfie: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=40&ixlib=rb-4.0.3',
    locationName: 'Pabrik Gudang Utama'
  }
];
