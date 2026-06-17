'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Plus, UserCog, Shield, ChevronDown, Mail, Phone,
  ToggleRight, ToggleLeft, Key, Building2,
} from 'lucide-react';
import { staffApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  super_admin:  { label: 'Super Admin',  color: 'bg-red-50 text-red-700',      icon: '👑' },
  admin:        { label: 'Admin',        color: 'bg-purple-50 text-purple-700', icon: '🛡️' },
  manager:      { label: 'Manager',      color: 'bg-blue-50 text-blue-700',     icon: '👔' },
  cashier:      { label: 'Cashier',      color: 'bg-emerald-50 text-emerald-700', icon: '💳' },
  marketing:    { label: 'Marketing',    color: 'bg-pink-50 text-pink-700',     icon: '📣' },
  analytics:    { label: 'Analytics',   color: 'bg-indigo-50 text-indigo-700', icon: '📊' },
  support:      { label: 'Support',     color: 'bg-yellow-50 text-yellow-700', icon: '🎧' },
};

const INITIAL_FORM = {
  firstName: '', lastName: '', email: '', phone: '',
  role: 'cashier', password: '', branchIds: [] as string[],
};

export default function StaffPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [resetModal, setResetModal] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);

  const { data: staff = [], isLoading, mutate } = useSWR(
    'staff',
    () => staffApi.list().then((r) => r.data),
  );

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await staffApi.create(form);
      toast.success(`${form.firstName} ${form.lastName} added to the team!`);
      setShowCreate(false);
      setForm(INITIAL_FORM);
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create staff member');
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate ${name}?`)) return;
    try {
      await staffApi.update(id, { status: 'inactive' });
      toast.success(`${name} deactivated`);
      mutate();
    } catch { toast.error('Failed to deactivate'); }
  };

  const handleResetPassword = async () => {
    if (!resetModal || !newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await staffApi.update(resetModal.id, { passwordHash: newPassword }); // placeholder
      toast.success('Password reset successfully');
      setResetModal(null);
      setNewPassword('');
    } catch { toast.error('Failed to reset password'); }
  };

  const activeStaff  = staff.filter((s: any) => s.status === 'active');
  const inactiveStaff = staff.filter((s: any) => s.status !== 'active');

  const StaffCard = ({ member }: { member: any }) => {
    const roleConfig = ROLE_CONFIG[member.role] || { label: member.role, color: 'bg-gray-100 text-gray-700', icon: '👤' };
    const isActive = member.status === 'active';

    return (
      <div className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover transition-opacity ${!isActive ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white font-bold text-sm">
                {member.firstName?.[0]}{member.lastName?.[0]}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {member.firstName} {member.lastName}
              </p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleConfig.color}`}>
                {roleConfig.icon} {roleConfig.label}
              </span>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-gray-300'}`} />
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
          {member.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{member.phone}</span>
            </div>
          )}
          {member.lastLoginAt && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Last login: {format(new Date(member.lastLoginAt), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
          <button
            onClick={() => setResetModal({ id: member.id, name: `${member.firstName} ${member.lastName}` })}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
          >
            <Key className="h-3.5 w-3.5" />
            Reset Password
          </button>
          {isActive && member.role !== 'super_admin' && (
            <button
              onClick={() => handleDeactivate(member.id, `${member.firstName} ${member.lastName}`)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
            >
              <ToggleLeft className="h-3.5 w-3.5" />
              Deactivate
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeStaff.length} active · {inactiveStaff.length} inactive
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-brand flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Staff Member
        </button>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {Object.entries(ROLE_CONFIG).map(([role, config]) => {
          const count = staff.filter((s: any) => s.role === role && s.status === 'active').length;
          return (
            <div key={role} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <p className="text-xl mb-1">{config.icon}</p>
              <p className="text-lg font-bold text-gray-900">{count}</p>
              <p className="text-[10px] text-gray-500 font-medium">{config.label}</p>
            </div>
          );
        })}
      </div>

      {/* Active Staff */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Active Team Members</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="skeleton w-11 h-11 rounded-xl" />
                  <div className="flex-1">
                    <div className="skeleton h-4 w-24 mb-1.5 rounded" />
                    <div className="skeleton h-3 w-16 rounded" />
                  </div>
                </div>
                <div className="skeleton h-3 w-full mb-2 rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            ))}
          </div>
        ) : activeStaff.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <UserCog className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active staff members yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {activeStaff.map((member: any) => (
              <StaffCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Staff */}
      {inactiveStaff.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Inactive</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {inactiveStaff.map((member: any) => (
              <StaffCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add Staff Member</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
                  <input
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Ahmed"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
                  <input
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Al-Mansouri"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="ahmed@dipndip.ly"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="+218 91 XXX XXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                    role !== 'super_admin' && (
                      <option key={role} value={role}>{config.icon} {config.label}</option>
                    )
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Initial Password *</label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">Staff member must change this on first login</p>
              </div>

              {/* Permissions Table */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Role Permissions</p>
                <div className="space-y-1.5 text-xs text-gray-600">
                  {[
                    { role: 'cashier',   perms: 'Earn/redeem points, verify QR, view own transactions' },
                    { role: 'manager',   perms: 'All cashier + manage customers, view reports, adjust points' },
                    { role: 'marketing', perms: 'Create/manage campaigns, send notifications' },
                    { role: 'analytics', perms: 'Read-only analytics and BI dashboards' },
                    { role: 'support',   perms: 'View customer profiles, transaction history' },
                    { role: 'admin',     perms: 'Full access except system configuration' },
                  ].find(p => p.role === form.role) && (
                    <p className="text-brand-700 font-medium bg-brand-50 px-3 py-2 rounded-lg">
                      {[
                        { role: 'cashier',   perms: 'Earn/redeem points, verify QR, view transactions' },
                        { role: 'manager',   perms: 'All cashier + manage customers, view reports, adjust points' },
                        { role: 'marketing', perms: 'Create/manage campaigns, send notifications' },
                        { role: 'analytics', perms: 'Read-only analytics and BI dashboards' },
                        { role: 'support',   perms: 'View customer profiles, transaction history' },
                        { role: 'admin',     perms: 'Full access except system configuration' },
                      ].find(p => p.role === form.role)?.perms}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowCreate(false); setForm(INITIAL_FORM); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={handleCreate} className="flex-1 btn-brand">
                Add Staff Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Reset Password</h3>
            <p className="text-sm text-gray-500 mb-5">{resetModal.name}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <input
                type="password"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setResetModal(null); setNewPassword(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={handleResetPassword} className="flex-1 btn-brand">Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
