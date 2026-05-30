/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  History, AlertCircle, Send, FileInput, CalendarCheck, ShieldAlert 
} from 'lucide-react';
import { ApprovalRequest, Employee } from '../types';
import { writeSystemLog } from '../utils';

interface LeaveLemburProps {
  currentUser: { id: number; nama: string; role: any; departemen: string };
  employees: Employee[];
  requests: ApprovalRequest[];
  onAddRequest: (req: ApprovalRequest) => void;
  onShowToast: (msg: string, type?: string) => void;
}

export default function LeaveLembur({
  currentUser,
  employees,
  requests,
  onAddRequest,
  onShowToast,
}: LeaveLemburProps) {
  // Unified Form States
  const [requestType, setRequestType] = useState<'Cuti' | 'Izin' | 'Sakit'>('Cuti');
  const [leaveSubtype, setLeaveSubtype] = useState('Cuti Tahunan');
  const [startDate, setStartDate] = useState('');
  const [durationDays, setDurationDays] = useState(1);
  const [reason, setReason] = useState('');

  const employee = employees.find(e => e.id === currentUser.id);
  const currentQuota = employee ? employee.saldoCuti : 12;

  // Filter requests that belong to this logged in employee
  const myRequests = requests.filter(r => r.empId === currentUser.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      onShowToast('Silakan pilih tanggal mulai pengajuan!', 'error');
      return;
    }

    if (durationDays < 1) {
      onShowToast('Durasi minimal adalah 1 hari!', 'error');
      return;
    }

    // Quota validation for Cuti Tahunan
    if (requestType === 'Cuti' && leaveSubtype === 'Cuti Tahunan' && durationDays > currentQuota) {
      onShowToast(`Batas saldo Cuti Tahunan Anda (${currentQuota} hari) tidak mencukupi!`, 'error');
      return;
    }

    const detailText = requestType === 'Cuti' 
      ? `${leaveSubtype} (${durationDays} hari)` 
      : `${requestType} (${durationDays} hari)`;

    const payload: ApprovalRequest = {
      id: Date.now(),
      empId: currentUser.id,
      nama: currentUser.nama,
      departemen: currentUser.departemen,
      type: requestType,
      date: startDate,
      details: detailText,
      alasan: reason,
      status: 'Pending',
      stage: 'Leader',
      logs: [{ 
        stage: 'Pengajuan', 
        actor: currentUser.nama, 
        action: 'Submit', 
        time: new Date().toISOString().slice(0, 16).replace('T', ' ') 
      }],
    };

    onAddRequest(payload);
    writeSystemLog(currentUser.nama, currentUser.role, requestType, `Mengajukan ${detailText} mulai tanggal: ${startDate}`);
    onShowToast(`Pengajuan ${requestType} berhasil dikirim, menunggu verifikasi leader Anda`, 'success');
    
    // Clear form
    setStartDate('');
    setReason('');
    setDurationDays(1);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      {/* Title block */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-brand-500" /> Layanan Mandiri Karyawan (Self-Service)
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Karyawan dapat mengajukan permohonan **Cuti resmi, Surat Izin, serta Pelaporan Sakit** secara digital. 
          Semua pengajuan akan diproses berjenjang melalui sistem verifikasi **Team Leader** departemen Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unified request form panel */}
        <div className="lg:col-span-2 bg-[#161B22] border border-[#30363D] rounded-3xl p-6 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Formulir Pengajuan Terpadu (Cuti / Izin / Sakit)</h3>
            <p className="text-[11px] text-slate-400">Pilih kategori layanan di bawah untuk melanjutkan pengajuan mandiri.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Kategori Pengajuan</label>
                <select
                  value={requestType}
                  onChange={e => setRequestType(e.target.value as 'Cuti' | 'Izin' | 'Sakit')}
                  className="w-full h-11 bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-3 text-xs md:text-sm focus:outline-none focus:border-brand-500 font-bold"
                >
                  <option value="Cuti">🍂 Cuti Tahunan & Khusus</option>
                  <option value="Izin">📄 Izin (Permit / Dispensasi)</option>
                  <option value="Sakit">🤢 Sakit (Sick Leave)</option>
                </select>
              </div>

              {/* Sub-style for Cuti only */}
              {requestType === 'Cuti' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Pilih Jenis Cuti</label>
                  <select
                    value={leaveSubtype}
                    onChange={e => setLeaveSubtype(e.target.value)}
                    className="w-full h-11 bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-3 text-xs md:text-sm focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="Cuti Tahunan">Cuti Tahunan (Mengurangi Saldo)</option>
                    <option value="Cuti Menikah">Cuti Menikah (Maks 3 Hari)</option>
                    <option value="Cuti Melahirkan">Cuti Melahirkan (Maks 90 Hari)</option>
                    <option value="Cuti Khusus">Cuti Khusus (Hajat/Duka)</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Tipe Absen Terpilih</label>
                  <div className="w-full h-11 bg-[#0b0c10]/50 border border-[#30363D] text-indigo-400 font-bold rounded-xl px-4 flex items-center text-xs md:text-sm">
                    {requestType === 'Izin' ? 'Surat Izin Resmi' : 'Pelaporan Sakit Dokter'}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Tanggal Mulai Halangan / Cuti</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full h-11 bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-xs md:text-sm focus:outline-none focus:border-brand-500 font-medium"
                />
              </div>

              {/* Duration in Days */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Durasi Absensi (Hari Kerja)</label>
                <input
                  type="number"
                  min={1}
                  max={requestType === 'Cuti' && leaveSubtype === 'Cuti Melahirkan' ? 90 : 30}
                  required
                  value={durationDays}
                  onChange={e => setDurationDays(parseInt(e.target.value) || 1)}
                  className="w-full h-11 bg-[#0b0c10] border border-[#30363D] text-white rounded-xl px-4 text-sm focus:outline-none focus:border-brand-500 font-bold"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Latar Belakang / Keperluan Alasan</label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Deskripsikan alasan pengajuan Anda secara jujur dan detail..."
                className="w-full bg-[#0b0c10] border border-[#30363D] text-white rounded-xl p-3 text-xs md:text-sm focus:outline-none focus:border-brand-500 leading-relaxed"
              />
            </div>

            {/* Document upload block */}
            <div className="space-y-1 bg-[#0B0C10] border border-[#30363D] p-3.5 rounded-xl flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <FileInput className="w-4 h-4 text-slate-500" /> 
                {requestType === 'Sakit' 
                  ? 'Dokumen Pendukung Medis / Surat Dokter (Wajib)' 
                  : 'Dokumen / Surat Keterangan Pendukung (Opsional)'}
              </span>
              <span className="text-[10px] bg-[#21262D] text-slate-300 font-bold px-2 py-1 rounded cursor-pointer border border-[#30363D] hover:bg-slate-800 transition-colors">
                pilih file
              </span>
            </div>

            {/* Guidelines warning */}
            {requestType === 'Sakit' && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 leading-snug flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span>Pelaporan Sakit harus disertai Surat Keterangan Dokter yang valid untuk menghindari pemotongan tunjangan presensi.</span>
              </div>
            )}

            <button
              type="submit"
              className={`w-full h-12 text-white font-bold transition-all rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer ${
                requestType === 'Cuti' 
                  ? 'bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/10' 
                  : requestType === 'Izin' 
                  ? 'bg-sky-600 hover:bg-sky-700' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Send className="w-4 h-4" /> Kirim Pengajuan {requestType === 'Cuti' ? leaveSubtype : requestType}
            </button>
          </form>
        </div>

        {/* Quota balance card and Regulations representation */}
        <div className="space-y-6">
          {/* Cuti Quota */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-6 shadow-sm text-center space-y-4">
            <h3 className="text-xs font-bold text-slate-300 tracking-wider">SALDO CUTI TAHUNAN</h3>
            <div className="w-28 h-28 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 bg-[#0B0C10] flex items-center justify-center mx-auto text-4xl font-extrabold text-white">
              {currentQuota}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sisa saldo cuti tahunan berjalan Anda. Saldo cuti akan diperbarui secara berkala per semester berjalan.
            </p>
          </div>

          {/* Quick FAQ / Guidelines */}
          <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-200">Panduan & Tata Tertib PT SPR</h4>
            <div className="divide-y divide-[#30363D] text-[11px] text-slate-400">
              <div className="py-2.5 space-y-0.5">
                <span className="font-bold text-slate-300 block">🍂 Cuti Khusus</span>
                <p>Cuti Menikah dialokasikan maksimal 3 hari kerja. Cuti melahirkan dialokasikan 90 hari.</p>
              </div>
              <div className="py-2.5 space-y-0.5">
                <span className="font-bold text-slate-300 block">📄 Surat Izin</span>
                <p>Pengajuan dilakukan paling lambat 1 hari sebelum rencana berhalangan demi kestabilan personil regu.</p>
              </div>
              <div className="py-2.5 space-y-0.5">
                <span className="font-bold text-slate-300 block">🤢 Sakit</span>
                <p>Pelaporan mandiri dilakukan hari ini, mengunggah bukti surat keterangan dokter resmi faskes setempat.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Histori pengajuan listing */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <History className="w-4 h-4 text-brand-500" /> Histori Pengajuan Anda
        </h3>

        {myRequests.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">Anda belum pernah mengirim dokumen pengajuan apa pun.</p>
        ) : (
          <div className="overflow-x-auto border border-[#30363D] rounded-xl">
            <table className="w-full text-left font-medium text-xs">
              <thead>
                <tr className="bg-[#10151B] text-slate-400 border-b border-[#30363D]">
                  <th className="py-3 px-4">Tipe / ID</th>
                  <th className="py-3 px-4">Tanggal Pengajuan</th>
                  <th className="py-3 px-4">Parameter Detil</th>
                  <th className="py-3 px-4">Kebutuhan Alasan</th>
                  <th className="py-3 px-4">Workflow Level</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D] text-slate-300">
                {myRequests.map(req => {
                  const tagColors = {
                    Pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/15',
                    Approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
                    Rejected: 'bg-red-500/10 text-red-400 border border-red-500/15',
                  };
                  return (
                    <tr key={req.id} className="hover:bg-[#21262D]/50 transition-colors">
                      <td className="py-3 px-4">
                        <strong className="text-white">{req.type}</strong>
                        <div className="text-[10px] text-slate-500">ID: PT-SPR-{req.id}</div>
                      </td>
                      <td className="py-3 px-4">{req.date}</td>
                      <td className="py-3 px-4 text-slate-300">{req.details}</td>
                      <td className="py-3 px-4 text-slate-400 max-w-sm truncate" title={req.alasan}>{req.alasan}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] bg-[#21262D] text-slate-300 py-0.5 px-2 rounded border border-[#30363D] font-bold uppercase">
                          {req.stage}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${tagColors[req.status] || tagColors.Pending}`}>
                          {req.status}
                        </span>
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
