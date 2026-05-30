/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CheckSquare, FileText, CheckCircle2, Clock, 
  XCircle, Filter, Trash2, ArrowRight, UserCheck 
} from 'lucide-react';
import { ApprovalRequest } from '../types';
import { writeSystemLog } from '../utils';

interface ApprovalsProps {
  requests: ApprovalRequest[];
  currentUser: { id: number; nama: string; role: any; departemen: string };
  onUpdateStatus: (id: number, status: 'Pending' | 'Approved' | 'Rejected', stageLogs: any[]) => void;
  onShowToast: (msg: string, type?: string) => void;
}

export default function Approvals({
  requests,
  currentUser,
  onUpdateStatus,
  onShowToast,
}: ApprovalsProps) {
  const [filterType, setFilterType] = useState('Semua');

  // Filter based on user's authorized permission
  const filtered = requests.filter(req => {
    const matchesFilter = filterType === 'Semua' || req.type === filterType;
    return matchesFilter;
  });

  const handleAction = (req: ApprovalRequest, action: 'Approved' | 'Rejected', note: string = '') => {
    const now = new Date();
    const timeStr = now.toISOString().slice(0, 16).replace('T', ' ');

    let nextStage = req.stage;
    let finalStatus = req.status;

    if (action === 'Rejected') {
      finalStatus = 'Rejected';
      nextStage = 'Selesai';
    } else {
      // Approved transitions based on workflow Karyawan -> Leader -> HRD
      if (req.stage === 'Leader') {
        nextStage = 'HRD';
      } else {
        nextStage = 'Selesai';
        finalStatus = 'Approved';
      }
    }

    const logEntry = {
      stage: req.stage,
      actor: currentUser.nama,
      action: action === 'Approved' ? 'Setujui (Approve)' : 'Tolak (Reject)',
      time: timeStr,
      note: note || 'Disertifikasi via Portal HRIS'
    };

    const updatedLogs = [...req.logs, logEntry];

    onUpdateStatus(req.id, finalStatus, updatedLogs);
    
    // Explicitly update stage status if we also update state
    req.stage = nextStage;
    req.status = finalStatus;

    writeSystemLog(
      currentUser.nama, 
      currentUser.role, 
      'Approval', 
      `Mengubah status request ID #${req.id} (${req.type}) oleh ${currentUser.nama}: ${action}`
    );
    onShowToast(`Request #${req.id} berhasil di-${action === 'Approved' ? 'setujui' : 'tolak'}`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
            <CheckSquare className="w-5 h-5 text-brand-500" /> Approval Center (Pengajuan)
          </h3>
          <p className="text-xs text-slate-400">Total antrean pengajuan: {filtered.length} riwayat</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Filter Tipe:</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full h-10 px-3 bg-[#0B0C10] border border-[#30363D] text-white focus:border-brand-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
          >
            <option value="Semua">Semua Pengajuan</option>
            <option value="Izin">Izin</option>
            <option value="Sakit">Sakit</option>
            <option value="Cuti">Cuti</option>
            <option value="Lembur">Lembur</option>
            <option value="Perubahan Absensi">Perubahan Absensi</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-3xl p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-slate-500" />
            <p className="text-sm font-semibold text-slate-400">Tidak ada pengajuan pending saat ini.</p>
          </div>
        ) : (
          filtered.map(req => {
            const isAuthorizedToApprove = 
              (currentUser.role === 'hrd') ||
              (currentUser.role === 'leader' && req.stage === 'Leader');

            const statusColors = {
              Pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/15',
              Approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
              Rejected: 'bg-red-500/10 text-red-400 border border-red-500/15',
            };

            return (
              <div key={req.id} className="bg-[#161B22] border border-[#30363D] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start flex-wrap gap-2 pb-3 border-b border-[#30363D]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-[#21262D] border border-[#30363D] font-bold px-2 py-0.5 rounded text-slate-300">
                        SPR-{req.id}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{req.date}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      {req.nama} <span className="text-xs text-slate-400 font-normal">({req.departemen})</span>
                    </h4>
                  </div>

                  <span className={`px-2.5 py-1 border rounded-full text-[10px] font-bold uppercase truncate max-w-28 ${statusColors[req.status]}`}>
                    {req.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium text-[10px] block mb-0.5">Tipe Pengajuan</span>
                      <strong className="text-brand-400 font-bold">{req.type}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[10px] block mb-0.5">Parameter / Deskripsi</span>
                      <strong className="text-slate-200">{req.details}</strong>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-slate-400 font-medium text-[10px] block mb-0.5">Alasan Alur</span>
                      <p className="text-slate-300 leading-relaxed text-justify bg-[#0B0C10] border border-[#30363D] p-2.5 rounded-lg">
                        {req.alasan}
                      </p>
                    </div>
                  </div>

                  {/* Supporting proof document link if exists */}
                  {req.proof && (
                    <div className="bg-[#0B0C10] border border-[#30363D] p-2 rounded-lg flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" /> Dokumen Pendukung: {req.proof}
                      </span>
                      <span className="text-[10px] bg-indigo-550/10 text-indigo-400 border border-indigo-500/20 py-0.5 px-2 rounded font-bold">
                        Attached
                      </span>
                    </div>
                  )}

                  {/* Workflow tracker visual nodes */}
                  <div className="bg-[#0B0C10] p-3 rounded-xl border border-[#30363D] space-y-2">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 block">WORKFLOW STAGE</span>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
                      <span className={`px-2 py-0.5 rounded border ${req.stage === 'Leader' ? 'bg-indigo-600 border-indigo-700 text-white font-bold' : 'bg-[#21262D] border-[#30363D]'}`}>
                        Leader
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className={`px-2 py-0.5 rounded border ${req.stage === 'HRD' ? 'bg-indigo-600 border-indigo-700 text-white font-bold' : 'bg-[#21262D] border-[#30363D]'}`}>
                        HRD (Super Admin Office)
                      </span>
                    </div>
                  </div>

                  {/* Operational Logs details */}
                  <div className="text-[11px] leading-relaxed text-slate-400 space-y-1">
                    <p className="font-bold text-slate-500 text-[10px] uppercase">LOG PERUBAHAN</p>
                    {req.logs.map((log, index) => (
                      <div key={index} className="flex justify-between items-center bg-[#0B0C10] border border-[#30363D] p-1.5 rounded">
                        <span>{log.time} - <strong>{log.actor}</strong> ({log.stage}): <span className="text-slate-400">{log.action}</span></span>
                        {log.note && <span className="text-[10px] italic text-slate-300 bg-[#21262D] border border-[#30363D] px-1 rounded">{log.note}</span>}
                      </div>
                    ))}
                  </div>

                  {/* Big action buttons if authorized */}
                  {req.status === 'Pending' && (
                    <div className="flex gap-2 justify-end pt-3 border-t border-[#30363D]">
                      {isAuthorizedToApprove ? (
                        <>
                          <button
                            onClick={() => handleAction(req, 'Rejected')}
                            className="h-10 px-5 bg-red-500/10 text-red-400 border border-red-500/20 font-bold hover:bg-red-500/20 transition-colors text-xs rounded-xl cursor-pointer"
                          >
                            Tolak (Reject)
                          </button>
                          <button
                            onClick={() => handleAction(req, 'Approved')}
                            className="h-10 px-6 bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors text-xs rounded-xl cursor-pointer"
                          >
                            Setujui (Approve & Teruskan)
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic bg-[#0B0C10] border border-[#30363D] py-1.5 px-3 rounded-lg">
                          Menunggu persetujuan Level stage: {req.stage}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
