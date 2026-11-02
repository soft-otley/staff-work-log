/**
 * Enterprise Authentication & Login Screen
 * With salted PBKDF2-SHA256 login verification, initial admin bootstrap, and demo credential helpers.
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Briefcase,
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Server,
  FileSpreadsheet,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, bootstrapAdmin, systemInitialized } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Bootstrap mode if system has no admin
  const [isBootstrap, setIsBootstrap] = useState(!systemInitialized);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      if (isBootstrap) {
        await bootstrapAdmin({
          username: username.trim(),
          password,
          fullName: fullName.trim() || 'System Administrator',
          email: email.trim(),
        });
      } else {
        await login(username.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill demo credentials
  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Public_Sans',sans-serif]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon & Heading */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0b192c] flex items-center justify-center text-white shadow-xl border border-slate-700">
            <Briefcase className="w-7 h-7 text-blue-400" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Staff Work Log & Management System
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          Enterprise operational logging, task deliverables, and team governance
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200 dark:border-slate-800">
          {/* Form Header */}
          <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
              {isBootstrap ? 'Bootstrap System Administrator' : 'Sign In to Workspace'}
            </h3>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 font-semibold">
              PBKDF2-SHA256
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {isBootstrap && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Administrator Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alexander Wright"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unique Username *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or david.eng"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-mono"
                />
              </div>
            </div>

            {isBootstrap && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.internal"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-xs"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isBootstrap ? 'Initialize & Sign In' : 'Sign In with Secure Session'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Test Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Quick Test Accounts (Click to Fill):</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('admin', 'Admin@2026!Secure')}
                className="w-full text-left px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Administrator</span>
                  <span className="text-slate-500 text-[11px] block font-mono">admin &bull; Admin@2026!Secure</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                  Full Access
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('david.eng', 'Manager@2026!')}
                className="w-full text-left px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100/60 transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Manager (Engineering)</span>
                  <span className="text-slate-500 text-[11px] block font-mono">david.eng &bull; Manager@2026!</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-200/60 text-blue-900 dark:bg-blue-900 dark:text-blue-200">
                  Manager
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('elena.dev', 'Staff@2026!')}
                className="w-full text-left px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100/60 transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Staff Member (Engineer)</span>
                  <span className="text-slate-500 text-[11px] block font-mono">elena.dev &bull; Staff@2026!</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-200/60 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                  Staff
                </span>
              </button>
            </div>
          </div>

          {/* Security Footnote */}
          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              HttpOnly SameSite Cookie
            </span>
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              Google Sheets 12-Tab DB
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
