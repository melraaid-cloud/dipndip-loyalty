'use client';

import { useState } from 'react';
import {
  Settings, Key, Globe, Bell, Shield, Save, Eye, EyeOff,
  CheckCircle, Info,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const TABS = [
  { id: 'account',   label: 'Account',    icon: Shield },
  { id: 'platform',  label: 'Platform',   icon: Globe },
  { id: 'security',  label: 'Security',   icon: Key },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const user = (() => {
    try { return JSON.parse(Cookies.get('user') || '{}'); } catch { return {}; }
  })();

  const handleChangePassword = async () => {
    if (!pwdForm.current || !pwdForm.newPwd || !pwdForm.confirm) {
      toast.error('All password fields are required');
      return;
    }
    if (pwdForm.newPwd !== pwdForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (pwdForm.newPwd.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(pwdForm.current, pwdForm.newPwd);
      toast.success('Password changed successfully');
      setPwdForm({ current: '', newPwd: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const PwdInput = ({
    label, field, show, onToggle,
  }: {
    label: string; field: 'current' | 'newPwd' | 'confirm';
    show: boolean; onToggle: () => void;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10"
          value={pwdForm[field]}
          onChange={(e) => setPwdForm({ ...pwdForm, [field]: e.target.value })}
        />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account and platform configuration</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Nav */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-5">Profile Information</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center shadow-md">
                    <span className="text-white text-xl font-bold">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-gray-500 text-sm">{user.email}</p>
                    <span className="inline-block mt-1 text-xs font-medium bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full capitalize">
                      {user.role?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    To update your name or email, ask a Super Admin to edit your staff profile.
                  </p>
                </div>
              </div>

              {/* Platform Info */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-5">Platform Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Platform Name', value: 'dipndip Libya Loyalty' },
                    { label: 'Version', value: '1.0.0' },
                    { label: 'Environment', value: process.env.NODE_ENV || 'production' },
                    { label: 'Region', value: 'Libya (LY)' },
                    { label: 'Currency', value: 'Libyan Dinar (LYD)' },
                    { label: 'Timezone', value: 'Africa/Tripoli (EET +2)' },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                      <p className="text-sm font-semibold text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Platform Tab */}
          {activeTab === 'platform' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-5">Platform Configuration</h3>
              <div className="space-y-5">
                {[
                  {
                    section: 'Brand',
                    items: [
                      { label: 'Brand Name', value: 'dipndip Libya' },
                      { label: 'Brand Tagline', value: 'Where every bite earns a reward 🍫' },
                      { label: 'Support Email', value: 'loyalty@dipndip.ly' },
                      { label: 'Support Phone', value: '+218 91 XXX XXXX' },
                    ],
                  },
                  {
                    section: 'Loyalty Defaults',
                    items: [
                      { label: 'Base Earn Rate', value: '1 LYD = 1 Point' },
                      { label: 'Point Expiry', value: 'No expiry (configurable)' },
                      { label: 'Min Redemption', value: '100 points' },
                    ],
                  },
                ].map((group) => (
                  <div key={group.section}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      {group.section}
                    </p>
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                          <span className="text-sm text-gray-600">{item.label}</span>
                          <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Platform settings are configured via environment variables.
                  Contact your system administrator to change these values.
                </p>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-5">Change Password</h3>
                <div className="space-y-4">
                  <PwdInput
                    label="Current Password"
                    field="current"
                    show={showPwd.current}
                    onToggle={() => setShowPwd({ ...showPwd, current: !showPwd.current })}
                  />
                  <PwdInput
                    label="New Password"
                    field="newPwd"
                    show={showPwd.new}
                    onToggle={() => setShowPwd({ ...showPwd, new: !showPwd.new })}
                  />
                  <PwdInput
                    label="Confirm New Password"
                    field="confirm"
                    show={showPwd.confirm}
                    onToggle={() => setShowPwd({ ...showPwd, confirm: !showPwd.confirm })}
                  />
                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="btn-brand flex items-center gap-2 mt-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Change Password'}
                  </button>
                </div>
              </div>

              {/* Security Summary */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Security Status</h3>
                <div className="space-y-3">
                  {[
                    { label: 'JWT Authentication', status: 'Active', ok: true },
                    { label: 'Password Hashing (bcrypt × 12)', status: 'Active', ok: true },
                    { label: 'Rate Limiting', status: '100 req/min', ok: true },
                    { label: 'RBAC Access Control', status: 'Active', ok: true },
                    { label: 'HTTPS / TLS 1.3', status: 'Active (production)', ok: true },
                    { label: 'Audit Logging', status: 'Active', ok: true },
                    { label: 'SQL Injection Protection', status: 'TypeORM Parameterized', ok: true },
                    { label: 'XSS Protection', status: 'Helmet Headers', ok: true },
                    { label: 'Data Encryption at Rest', status: 'PostgreSQL + AES-256', ok: true },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className={`h-3.5 w-3.5 ${item.ok ? 'text-emerald-500' : 'text-gray-300'}`} />
                        <span className="text-xs font-medium text-gray-600">{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
