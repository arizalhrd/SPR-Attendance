/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'hrd' | 'leader' | 'karyawan' | 'supervisor' | 'manager';

export interface Employee {
  id: number;
  nama: string;
  departemen: string;
  jabatan: string;
  shiftDefault: string;
  username?: string;
  password?: string;
  role: UserRole;
  status: 'Aktif' | 'Nonaktif';
  saldoCuti: number;
}

export interface AttendanceRecord {
  id: number;
  empId: number;
  nama: string;
  departemen: string;
  jabatan: string;
  shift: string | null;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  duration: string | null;
  status: 'Hadir' | 'Terlambat' | 'Terlambat Berat' | 'Izin' | 'Sakit' | 'Alpha';
  note: string;
  proof?: string;
  workStatus: 'Selesai' | 'Pulang Cepat' | null;
  selfie?: string;
  locationName?: string;
  approvedByLeader?: boolean;
  approvedByHR?: boolean;
}

export interface CompanySettings {
  nama: string;
  logo: string;
  alamat: string;
  telepon: string;
  email: string;
  website: string;
  npwp: string;
  direktur: string;
}

export interface ShiftSettings {
  id: string;
  name: string;
  start: string;
  end: string;
  active: boolean;
}

export interface AttendanceRules {
  toleransiTerlambat: number; // minutes
  terlambatBerat: number; // minutes
  pulangCepat: boolean;
  autoAlpha: boolean;
  attendanceMethod?: 'Mandiri' | 'Sentralisasi'; // 'Mandiri' = employee checks in, 'Sentralisasi' = leader checks in
}

export interface LocationSettings {
  id: string;
  nama: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
}

export interface SelfieSettings {
  wajibSelfieCheckIn: boolean;
  wajibSelfieCheckOut: boolean;
  simpanFoto: boolean;
  kameraDepan: boolean;
}

export interface WorkHoursSettings {
  id: string;
  departemen: string;
  hariKerja: string; // e.g. "Senin-Jumat"
  jamMasuk: string;
  jamPulang: string;
}

export interface OvertimeSettings {
  minLembur: number; // hours
  maxLembur: number; // hours
  autoHitung: boolean;
  approvalRequired: boolean;
}

export interface LeaveSettings {
  id: string;
  name: string;
  days: number;
  approvalRequired: boolean;
  docRequired: boolean;
}

export interface HolidaySettings {
  id: string;
  nama: string;
  tanggal: string;
}

export interface NotificationSettings {
  waActive: boolean;
  emailActive: boolean;
  tgActive: boolean;
  soundActive?: boolean; // Mobile-style smartphone audio notification sound
  triggers: {
    checkIn: boolean;
    checkOut: boolean;
    terlambat: boolean;
    izin: boolean;
    sakit: boolean;
    approval: boolean;
  };
}

export interface ApprovalWorkflow {
  stages: ('Leader' | 'HRD' | 'Admin')[];
}

export interface RolePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export interface IntegrationSettings {
  googleSheetsUrl: string;
  googleDriveUrl: string;
  smtpHost: string;
  waGateway: string;
  telegramBotToken: string;
  restApiUrl: string;
}

export interface SystemSettings {
  company: CompanySettings;
  shifts: ShiftSettings[];
  attendanceRules: AttendanceRules;
  locations: LocationSettings[];
  selfie: SelfieSettings;
  workHours: WorkHoursSettings[];
  overtime: OvertimeSettings;
  leaves: LeaveSettings[];
  holidays: HolidaySettings[];
  notification: NotificationSettings;
  approvalWorkflow: ApprovalWorkflow;
  permissions: Record<UserRole, Record<string, RolePermissions>>;
  integration: IntegrationSettings;
}

export interface ApprovalRequest {
  id: number;
  empId: number;
  nama: string;
  departemen: string;
  type: 'Izin' | 'Sakit' | 'Cuti' | 'Lembur' | 'Perubahan Absensi';
  date: string;
  details: string; // duration, shift change, Overtime hours, leave type
  alasan: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  stage: 'Leader' | 'HRD' | 'Admin' | 'Selesai';
  logs: { stage: string; actor: string; action: string; time: string; note?: string }[];
  proof?: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'Informasi' | 'Libur' | 'Meeting' | 'Kebijakan Baru';
  date: string;
  createdBy: string;
}

export interface SystemLog {
  id: number;
  date: string;
  time: string;
  user: string;
  role: string;
  action: string;
  ip: string;
  device: string;
  details: string;
}
