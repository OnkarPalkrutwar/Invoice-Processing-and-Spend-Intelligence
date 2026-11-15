import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Settings = () => {
  const { user, hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Company Form
  const [companyForm, setCompanyForm] = useState({
    name: '',
    address: '',
    gstin: '',
    phone: '',
    email: '',
    defaultCurrency: 'INR',
    financialYearStart: '04-01',
  });

  // User Profile Form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Password Change Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await api.get('/settings');
        if (res.data?.success && res.data?.data) {
          const comp = res.data.data.company;
          if (comp) {
            setCompanyForm({
              name: comp.name || '',
              address: comp.address || '',
              gstin: comp.gstin || '',
              phone: comp.phone || '',
              email: comp.email || '',
              defaultCurrency: comp.defaultCurrency || 'INR',
              financialYearStart: comp.financialYearStart || '04-01',
            });
          }
          if (res.data.data.user) {
            setProfileForm({
              name: res.data.data.user.name || '',
              email: res.data.data.user.email || '',
            });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.put('/settings/company', companyForm);
      if (res.data?.success) {
        setSuccessMsg('Company legal profile saved successfully.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update company settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.put('/settings/profile', profileForm);
      if (res.data?.success) {
        setSuccessMsg('Profile details updated successfully.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      if (res.success) {
        setSuccessMsg('Security password updated successfully.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading workspace configuration profile..." />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Workspace Configuration</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage legal entity profile, GSTIN credentials, and personal security settings
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-xs font-medium pb-px">
        <button
          onClick={() => {
            setActiveTab('company');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`px-3 py-2 border-b-2 transition-all flex items-center gap-2 -mb-px ${
            activeTab === 'company'
              ? 'border-zinc-900 text-zinc-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" /> Legal Entity Profile
        </button>

        <button
          onClick={() => {
            setActiveTab('profile');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`px-3 py-2 border-b-2 transition-all flex items-center gap-2 -mb-px ${
            activeTab === 'profile'
              ? 'border-zinc-900 text-zinc-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <User className="w-4 h-4" /> Personal Details
        </button>

        <button
          onClick={() => {
            setActiveTab('security');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`px-3 py-2 border-b-2 transition-all flex items-center gap-2 -mb-px ${
            activeTab === 'security'
              ? 'border-zinc-900 text-zinc-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Lock className="w-4 h-4" /> Password & Security
        </button>
      </div>

      {/* Tab: Company Profile */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="card space-y-4 p-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Corporate Legal Entity Details
            </h3>
            {!hasRole('ADMIN') && (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Read-only: Admin permission required
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Company Legal Name *
              </label>
              <input
                type="text"
                disabled={!hasRole('ADMIN')}
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                className="input-field text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Company GSTIN (15 characters)
              </label>
              <input
                type="text"
                disabled={!hasRole('ADMIN')}
                value={companyForm.gstin}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, gstin: e.target.value.toUpperCase() })
                }
                placeholder="29AAACA1234A1Z5"
                className="input-field text-xs uppercase font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Official Billing Email
              </label>
              <input
                type="email"
                disabled={!hasRole('ADMIN')}
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                disabled={!hasRole('ADMIN')}
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                className="input-field text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Default Currency
              </label>
              <input
                type="text"
                disabled
                value="INR (Indian Rupee - ₹)"
                className="input-field text-xs bg-slate-50 text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Fiscal Year Start
              </label>
              <input
                type="text"
                disabled
                value="01 April (Indian Standard FY)"
                className="input-field text-xs bg-slate-50 text-slate-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Registered Office Address
              </label>
              <textarea
                rows={2}
                disabled={!hasRole('ADMIN')}
                value={companyForm.address}
                onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                className="input-field text-xs"
              />
            </div>
          </div>

          {hasRole('ADMIN') && (
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-xs py-1.5 px-4"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Company Details'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="card space-y-4 p-5">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Personal Identity Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Full Display Name
              </label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="input-field text-xs font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={profileForm.email}
                disabled
                className="input-field text-xs bg-slate-50 text-slate-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Work email address is managed by workspace administrator
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs py-1.5 px-4"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Updating...' : 'Update Details'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="card space-y-4 p-5">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Change Account Password
          </h3>

          <div className="space-y-3 max-w-md text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={passwordForm.confirmNewPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })
                }
                className="input-field text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs py-1.5 px-4"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Changing...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
