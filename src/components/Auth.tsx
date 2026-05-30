/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Space, Key, Eye, EyeOff, UserCheck, Smartphone } from 'lucide-react';
import { Employee } from '../types';

interface AuthProps {
  employees: Employee[];
  onLoginSuccess: (user: { id: number; nama: string; role: any; departemen: string }) => void;
  logoUrl?: string;
  companyName: string;
}

export default function Auth({ employees, onLoginSuccess, logoUrl, companyName }: AuthProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      const trimmedUser = username.trim().toLowerCase();
      const user = employees.find(
        (emp) =>
          emp.username?.toLowerCase() === trimmedUser &&
          emp.password === password &&
          emp.status === 'Aktif'
      );

      if (user) {
        onLoginSuccess({
          id: user.id,
          nama: user.nama,
          role: user.role,
          departemen: user.departemen,
        });
      } else {
        setErrorMsg('Username atau password salah, atau akun Anda tidak aktif.');
        setIsLoading(false);
      }
    }, 600);
  };

  const handleQuickSelect = (role: string) => {
    let targetUser = '';
    let targetPass = '';
    if (role === 'admin') {
      targetUser = 'admin';
      targetPass = 'admin123';
    } else if (role === 'hrd') {
      targetUser = 'arizal';
      targetPass = 'hrd123';
    } else if (role === 'leader') {
      targetUser = 'ahmad';
      targetPass = 'SPRTNG';
    } else if (role === 'karyawan') {
      targetUser = 'abdul';
      targetPass = '123';
    }
    setUsername(targetUser);
    setPassword(targetPass);
  };

  return (
    <div className="min-height-screen min-h-screen flex flex-col justify-between bg-[#0B0C10] text-[#C5C6C7] font-sans selection:bg-brand-500">
      {/* Decorative top blobs */}
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-brand-600/10 to-transparent pointer-events-none" />

      {/* Main card box */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        <div className="w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-slate-950 border-2 border-[#30363D] p-1.5 shadow-2xl transition-all hover:scale-105 duration-300">
              {logoUrl ? (
                <img src={logoUrl} alt="Company Logo" className="w-full h-full object-cover rounded-full" />
              ) : (
                <UserCheck className="w-12 h-12 text-brand-500" />
              )}
            </div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-white mt-1">
              {companyName}
            </h1>
            <p className="text-slate-400 text-xs">
              Portal HRIS & Absensi Professional Mobile-First
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Username</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 bg-[#0B0C10] border border-[#30363D] rounded-xl px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-[#0B0C10] border border-[#30363D] rounded-xl px-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-red-400 text-xs text-center font-medium bg-red-950/40 py-2.5 px-3 rounded-lg border border-red-900/60 transition-all">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-800 active:transform active:scale-[0.99] transition-all text-white rounded-xl text-sm font-semibold flex items-center justify-center shadow-lg shadow-brand-500/10 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </div>
              ) : (
                <span>Masuk Sekarang</span>
              )}
            </button>
          </form>

          {/* HRIS Demo sandbox accounts helper */}
          <div className="bg-[#0B0C10] border border-[#30363D] rounded-2xl p-4">
            <p className="text-slate-400 text-[11px] font-bold text-center mb-3 tracking-widest uppercase">
              DEMO ACCOUNT QUICK SELECT
            </p>
            <div className="space-y-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickSelect('hrd')}
                className="flex items-center justify-center w-full h-9 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-lg border border-brand-500/20 font-bold cursor-pointer transition-colors"
              >
                🔐 Masuk sebagai HRD (Arizal Admin)
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickSelect('leader')}
                  className="flex items-center justify-center h-8 bg-[#161B22] hover:bg-[#21262D] text-cyan-400 rounded-lg border border-[#30363D] font-medium cursor-pointer transition-colors"
                >
                  👤 Team Leader
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect('karyawan')}
                  className="flex items-center justify-center h-8 bg-[#161B22] hover:bg-[#21262D] text-slate-300 rounded-lg border border-[#30363D] font-medium cursor-pointer transition-colors"
                >
                  👤 Karyawan (Staff)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer info lockups */}
      <div className="p-4 text-center text-[10px] text-slate-500 border-t border-[#30363D] space-y-1">
        <p>© 2026 {companyName}. All Rights Reserved.</p>
        <p className="flex items-center justify-center gap-1">
          <Smartphone className="w-3 h-3 text-brand-500" /> WebApp v2.1 Mobile-First Standalone
        </p>
      </div>
    </div>
  );
}
