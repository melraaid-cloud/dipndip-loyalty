'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Eye, EyeOff } from 'lucide-react';
import { customersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];

export default function NewCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    referralCode: '',
    preferredLanguage: 'en',
    preferredBranch: '',
    smsEnabled: true,
    emailEnabled: true,
    pushEnabled: true,
  });

  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      toast.error('Either email or phone is required');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        preferredLanguage: form.preferredLanguage,
        notificationPreferences: {
          sms: form.smsEnabled,
          email: form.emailEnabled,
          push: form.pushEnabled,
        },
      };
      if (form.email.trim())       payload.email = form.email.trim();
      if (form.phone.trim())       payload.phone = form.phone.trim();
      if (form.dateOfBirth)        payload.dateOfBirth = form.dateOfBirth;
      if (form.gender)             payload.gender = form.gender;
      if (form.referralCode.trim()) payload.referralCode = form.referralCode.trim();
      if (form.preferredBranch.trim()) payload.preferredBranch = form.preferredBranch.trim();

      const res = await customersApi.create(payload);
      toast.success(`Customer registered! Membership: ${res.data.membershipNumber}`);
      router.push(`/dashboard/customers/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register customer');
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({
    label, field, type = 'text', placeholder = '', required = false, hint = '',
  }: {
    label: string; field: string; type?: string;
    placeholder?: string; required?: boolean; hint?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
        placeholder={placeholder}
        value={(form as any)[field]}
        onChange={(e) => set(field, e.target.value)}
        required={required}
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="p-8 max-w-[800px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/customers"
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register New Customer</h1>
          <p className="text-gray-500 text-sm mt-0.5">Create a loyalty account and generate a membership card</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-brand-500" />
            Personal Information
          </h3>
          <div className="grid grid-cols-2 gap-5">
            <InputField label="First Name" field="firstName" placeholder="Ahmed" required />
            <InputField label="Last Name" field="lastName" placeholder="Al-Mansouri" required />
            <InputField label="Email Address" field="email" type="email" placeholder="ahmed@example.com" hint="Used for email rewards and updates" />
            <InputField label="Phone Number" field="phone" placeholder="+218 91 XXX XXXX" hint="Libyan mobile number for SMS" />
            <InputField label="Date of Birth" field="dateOfBirth" type="date" hint="Used for automatic birthday rewards" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
              <select
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white capitalize"
                value={form.gender}
                onChange={(e) => set('gender', e.target.value)}
              >
                <option value="">Select (optional)</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Referral & Preferences */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-5">Preferences & Referral</h3>
          <div className="grid grid-cols-2 gap-5">
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
            <InputField
              label="Referral Code"
              field="referralCode"
              placeholder="Friend's referral code"
              hint="If referred by an existing member"
            />
            <div className="col-span-2">
              <InputField
                label="Preferred Branch"
                field="preferredBranch"
                placeholder="Branch name or ID (optional)"
              />
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-5">Notification Preferences</h3>
          <div className="space-y-3">
            {[
              { field: 'smsEnabled',   label: 'SMS Notifications', desc: 'Points earned, rewards, promotions via Twilio' },
              { field: 'emailEnabled', label: 'Email Notifications', desc: 'Welcome email, receipts, campaigns via SendGrid' },
              { field: 'pushEnabled',  label: 'Push Notifications', desc: 'Real-time alerts via Firebase FCM / APNs' },
            ].map((item) => (
              <label key={item.field} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-brand-200 cursor-pointer transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={(form as any)[item.field]}
                    onChange={(e) => set(item.field, e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition-colors ${
                      (form as any)[item.field] ? 'bg-brand-500' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-1 ml-1 ${
                      (form as any)[item.field] ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Welcome bonus note */}
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-2xl">🎁</span>
          <div>
            <p className="font-semibold text-brand-900 text-sm">Welcome Bonus</p>
            <p className="text-brand-700 text-sm mt-0.5">
              This customer will automatically receive welcome bonus points upon registration.
              A welcome email and/or SMS will be sent based on their notification preferences.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Link
            href="/dashboard/customers"
            className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-brand flex items-center gap-2 px-8"
          >
            {saving
              ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <UserPlus className="h-4 w-4" />
            }
            {saving ? 'Registering…' : 'Register Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
