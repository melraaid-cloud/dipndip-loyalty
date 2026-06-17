'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { customersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import useSWR from 'swr';

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  const { data: customer, isLoading } = useSWR(
    id ? `customer-${id}` : null,
    () => customersApi.get(id).then((r) => r.data),
    {
      onSuccess: (data) => {
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
          gender: data.gender || '',
          preferredLanguage: data.preferredLanguage || 'en',
          status: data.status || 'active',
          smsEnabled: data.notificationPreferences?.sms !== false,
          emailEnabled: data.notificationPreferences?.email !== false,
          pushEnabled: data.notificationPreferences?.push !== false,
        });
      },
    },
  );

  const set = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    setSaving(true);
    try {
      await customersApi.update(id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        preferredLanguage: form.preferredLanguage,
        status: form.status,
        notificationPreferences: {
          sms: form.smsEnabled,
          email: form.emailEnabled,
          push: form.pushEnabled,
        },
      });
      toast.success('Customer updated successfully!');
      router.push(`/dashboard/customers/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !form) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin h-8 w-8 text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[800px] mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/dashboard/customers/${id}`}
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {customer?.firstName} {customer?.lastName} · {customer?.membershipNumber}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-5">Personal Information</h3>
          <div className="grid grid-cols-2 gap-5">
            {[
              { label: 'First Name', field: 'firstName', required: true },
              { label: 'Last Name', field: 'lastName', required: true },
              { label: 'Email Address', field: 'email', type: 'email' },
              { label: 'Phone Number', field: 'phone' },
            ].map((f) => (
              <div key={f.field}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {f.label} {f.required && <span className="text-red-400">*</span>}
                </label>
                <input
                  type={f.type || 'text'}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form[f.field]}
                  onChange={(e) => set(f.field, e.target.value)}
                  required={f.required}
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
              <select
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                value={form.gender}
                onChange={(e) => set('gender', e.target.value)}
              >
                <option value="">Select (optional)</option>
                {['male', 'female', 'other', 'prefer_not_to_say'].map((g) => (
                  <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-5">Account Settings</h3>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Language</label>
              <select
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                value={form.preferredLanguage}
                onChange={(e) => set('preferredLanguage', e.target.value)}
              >
                <option value="en">English</option>
                <option value="ar">Arabic (العربية)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-5">Notification Preferences</h3>
          <div className="space-y-3">
            {[
              { field: 'smsEnabled',   label: 'SMS Notifications' },
              { field: 'emailEnabled', label: 'Email Notifications' },
              { field: 'pushEnabled',  label: 'Push Notifications' },
            ].map((item) => (
              <label key={item.field} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-brand-200 cursor-pointer">
                <span className="text-sm font-medium text-gray-900">{item.label}</span>
                <div
                  onClick={() => set(item.field, !form[item.field])}
                  className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${form[item.field] ? 'bg-brand-500' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow mt-1 ml-1 transition-transform ${form[item.field] ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <Link
            href={`/dashboard/customers/${id}`}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-brand flex items-center gap-2 px-8"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
