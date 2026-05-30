# AttendPro - HRIS & Attendance Professional Web App

AttendPro adalah aplikasi HR Attendance & HRIS Professional berbasis web yang dikembangkan dengan pendekatan **Mobile-First Responsive Design** dan siap digunakan secara online. Aplikasi ini memiliki pengalaman pengguna (UX) yang setara dengan sistem HRIS terkemuka seperti Talenta, Mekari, Gadjian, dan Odoo HR.

---

## 📱 Arsitektur & Teknologi Utama
Sistem ini diimplementasikan di atas stack modern yang menjamin performa maksimal (Skor Google Lighthouse Mobile ≥ 90):
- **React 18+ & TypeScript**: Keamanan tipe data statis dan re-rendering state reaktif.
- **Tailwind CSS v4**: Utilitas styling modern dengan optimalisasi bundle terkecil.
- **PWA (Progressive Web App)**: Dilengkapi `manifest.json` dan caching `service-worker.js` offline mode.
- **SheetJS & JSPDF**: Ekspor tangguh langsung dari browser tanpa load server.
- **Multi-Location Geofencing & GPS**: Validasi radius kehadiran (Haversine Formula) reaktif.

---

## 📁 Pemetaan Struktur Modular
Sesuai dengan blueprint modularisasi profesional, fungsionalitas dialokasikan ke dalam berkas-berkas terpisah di dalam `/src`:

- **`/src/types.ts`**: Rumah bagi seluruh model data (Employee, AttendanceRecord, Settings, ApprovalRequest).
- **`/src/utils.ts`**: Helper kalkulasi sanksi keterlambatan, formula GPS Geofencing, logger audit otomatis, dan seed data.
- **`/src/components/Auth.tsx`**: Portal login multi-role (Admin, HRD, Leader, Karyawan) lengkap dengan tombol sandbox demo.
- **`/src/components/Dashboard.tsx`**: Panel statistik dwi-kolom mobile, diagram Chart.js, dan papan pengumuman dinamis.
- **`/src/components/Attendance.tsx`**: Gerbang CheckIn / CheckOut, selektor shift, kamera selfie otomatis, dan radar tumpangan GPS.
- **`/src/components/Employees.tsx`**: CRUD Karyawan, konverter xlsx, pencarian multi-parameter, form ramah iOS.
- **`/src/components/Approvals.tsx`**: Workflows multi-tahap (Karyawan → Leader → HRD → Admin) untuk Cuti & Lembur.
- **`/src/components/LeaveLembur.tsx`**: Formulir kalkulator sisa kuota Cuti Tahunan dan pengajuan jam lembur.
- **`/src/components/Reports.tsx`**: Penyaring lanjut absensi berdasar Departemen/Shift/Tanggal spesifik serta generator PDF & Excel.
- **`/src/components/Settings.tsx`**: Rumah bagi 15 panel kontrol sistem (NPWP Perusahaan, Lokasi GPS, Kebijakan Selfie, Notifikasi, Audit Trail ekstensif, Ekspor/Impor Cadangan JSON).

---

## 🔑 Demo Akun Sandbox
Untuk mempermudah pengujian, sistem menyediakan selektor instan di halaman login:
1. **Admin**: `admin` / `admin123` (Hak Kontrol Penuh & Pengaturan)
2. **HRD**: `arizal` / `hrd123` (Manajemen Karyawan, Persetujuan, Laporan)
3. **Leader**: `ahmad` / `SPRTNG` (Persetujuan Tim, Absensi, Dashboard Tim)
4. **Karyawan**: `abdul` / `123` (Portal Mandiri, Absensi Geo-GPS, Pengajuan Cuti/Lembur)
