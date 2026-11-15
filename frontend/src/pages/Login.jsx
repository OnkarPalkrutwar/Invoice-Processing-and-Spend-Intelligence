import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Receipt, Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePersona, setActivePersona] = useState(null);

  const isExpired = new URLSearchParams(location.search).get('session') === 'expired';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (personaName, demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setActivePersona(personaName);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0e1117] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle enterprise grid background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Mark */}
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white shadow-xs mb-4">
          <Receipt className="w-5 h-5 text-zinc-100" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          InvoScan Workspace
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Apex Innovations Technologies Accounts Payable & Spend Intelligence
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-card rounded-xl sm:px-10 border border-slate-200">
          {isExpired && (
            <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-700" />
              <span>Your session expired. Please sign in again.</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setActivePersona(null);
                  }}
                  placeholder="name@company.com"
                  className="input-field pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setActivePersona(null);
                  }}
                  placeholder="••••••••"
                  className="input-field pl-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span className="text-xs text-slate-600">Remember session</span>
              </label>

              <button
                type="button"
                onClick={() => alert('Demo environment: Please select one of the test roles below or register a new company.')}
                className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 mt-2 text-xs font-semibold"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          {/* Clean Test Persona Switcher (Standard in human-built developer/enterprise demos) */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Test Persona
              </span>
              <span className="text-[10px] text-slate-400">Pre-seeded demo accounts</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('ADMIN', 'admin@invoscan.com', 'admin123')}
                className={`py-2 px-2 text-left rounded-lg border text-xs transition-all ${
                  activePersona === 'ADMIN'
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">Admin</div>
                <div className={`text-[10px] truncate ${activePersona === 'ADMIN' ? 'text-zinc-300' : 'text-slate-400'}`}>
                  Full Access
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('FINANCE', 'finance@invoscan.com', 'finance123')}
                className={`py-2 px-2 text-left rounded-lg border text-xs transition-all ${
                  activePersona === 'FINANCE'
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">Finance Mgr</div>
                <div className={`text-[10px] truncate ${activePersona === 'FINANCE' ? 'text-zinc-300' : 'text-slate-400'}`}>
                  Approvals & Pay
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('EMPLOYEE', 'employee@invoscan.com', 'employee123')}
                className={`py-2 px-2 text-left rounded-lg border text-xs transition-all ${
                  activePersona === 'EMPLOYEE'
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">Employee</div>
                <div className={`text-[10px] truncate ${activePersona === 'EMPLOYEE' ? 'text-zinc-300' : 'text-slate-400'}`}>
                  Submitter
                </div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Need a new workspace?{' '}
            <Link to="/register" className="font-semibold text-slate-800 hover:text-zinc-950 underline underline-offset-2">
              Register Organization
            </Link>
          </div>
        </div>

        {/* Security / Compliance Badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>256-Bit TLS</span>
          </div>
          <span>•</span>
          <span>GSTIN Rule 48 Compliant</span>
          <span>•</span>
          <span>SOC 2 Ready</span>
        </div>
      </div>
    </div>
  );
};
