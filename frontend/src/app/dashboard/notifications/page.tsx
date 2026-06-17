'use client';

import { useState } from 'react';
import { Bell, Send, Users, User, Megaphone, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const NOTIFICATION_TYPES = [
  { value: 'custom',            label: '✍️  Custom Message' },
  { value: 'campaign',          label: '📣 Campaign Broadcast' },
  { value: 'inactive_reminder', label: '😴 Inactive Reminder' },
  { value: 'birthday',          label: '🎂 Birthday Reward' },
  { value: 'tier_upgrade',      label: '⭐ Tier Upgrade' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all',      label: '🌍 All Active Members' },
  { value: 'bronze',   label: '🥉 Bronze Members' },
  { value: 'silver',   label: '🥈 Silver Members' },
  { value: 'gold',     label: '🥇 Gold Members' },
  { value: 'platinum', label: '💎 Platinum Members' },
  { value: 'new',      label: '🆕 New Members (< 30 days)' },
  { value: 'dormant',  label: '😴 Dormant Members (> 60 days)' },
  { value: 'single',   label: '👤 Single Customer by ID' },
];

const QUICK_TEMPLATES = [
  {
    title: '🍫 We miss you!',
    body: "It's been a while! Come visit us and earn double points this week.",
    type: 'custom',
  },
  {
    title: '🎉 Weekend Special!',
    body: 'This weekend only: earn 2× points on all orders. Don\'t miss out!',
    type: 'campaign',
  },
  {
    title: '☕ Happy Hour is here!',
    body: 'From 3–6 PM today: 50% bonus points on every purchase. See you soon!',
    type: 'campaign',
  },
  {
    title: '🎁 Redeem your points!',
    body: 'You have enough points to get a free item. Come in and enjoy!',
    type: 'custom',
  },
];

export default function NotificationsPage() {
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'custom',
    audience: 'all',
    customerId: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ count: number; time: string } | null>(null);

  const applyTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    setForm((f) => ({ ...f, title: t.title, body: t.body, type: t.type }));
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and message body are required');
      return;
    }

    setSending(true);
    try {
      if (form.audience === 'single') {
        if (!form.customerId.trim()) {
          toast.error('Please enter a customer ID');
          setSending(false);
          return;
        }
        await api.post('/notifications/send', {
          customerId: form.customerId,
          channel: 'push',
          type: form.type,
          title: form.title,
          body: form.body,
        });
        setSent({ count: 1, time: new Date().toLocaleTimeString() });
        toast.success('Notification sent!');
      } else {
        await api.post('/campaigns', {
          name: form.title,
          type: 'custom',
          notificationTitle: form.title,
          notificationBody: form.body,
          targetAudience: form.audience,
          sendPushNotification: true,
          status: 'active',
        });
        setSent({ count: -1, time: new Date().toLocaleTimeString() });
        toast.success('Broadcast queued and sending!');
      }
      setForm({ title: '', body: '', type: 'custom', audience: 'all', customerId: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const charCount = form.body.length;
  const charLimit = 200;

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-500 text-sm mt-0.5">Send push notifications to customers via Firebase / APNs</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Compose Panel */}
        <div className="col-span-2 space-y-5">
          {/* Success Banner */}
          {sent && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  {sent.count === 1
                    ? 'Notification sent successfully!'
                    : 'Broadcast queued for all matching customers!'}
                </p>
                <p className="text-xs text-emerald-600">Sent at {sent.time}</p>
              </div>
              <button
                onClick={() => setSent(null)}
                className="ml-auto text-emerald-400 hover:text-emerald-600"
              >
                <AlertCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Compose Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Bell className="h-5 w-5 text-brand-500" />
              Compose Notification
            </h3>

            <div className="space-y-4">
              {/* Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Target Audience
                </label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                >
                  {AUDIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Single Customer */}
              {form.audience === 'single' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer ID</label>
                  <input
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm"
                    placeholder="UUID or membership number"
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  />
                </div>
              )}

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notification Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {NOTIFICATION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setForm({ ...form, type: t.value })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        form.type === t.value
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notification Title *
                </label>
                <input
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. 🍫 Special offer just for you!"
                  maxLength={100}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.title.length}/100</p>
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Message Body *
                </label>
                <textarea
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition-colors ${
                    charCount > charLimit ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  rows={4}
                  placeholder="Write your message here. Keep it short, clear, and engaging!"
                  maxLength={250}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">
                    {charCount > charLimit
                      ? <span className="text-amber-500">Consider trimming — long messages may be truncated on some devices</span>
                      : 'Keep under 200 chars for best results'}
                  </p>
                  <p className={`text-xs font-medium ${charCount > charLimit ? 'text-amber-500' : 'text-gray-400'}`}>
                    {charCount}/250
                  </p>
                </div>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={sending || !form.title || !form.body}
                className="w-full btn-brand py-3 text-base font-semibold flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    {form.audience === 'single' ? 'Send to Customer' : 'Broadcast to All'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>
            <div className="bg-gray-900 rounded-2xl p-4 max-w-sm mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🍫</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">dipndip Libya</p>
                    <p className="text-gray-400 text-[10px]">now</p>
                  </div>
                </div>
                <p className="text-white text-sm font-semibold mb-0.5">
                  {form.title || 'Your notification title will appear here'}
                </p>
                <p className="text-gray-300 text-xs leading-relaxed">
                  {form.body || 'Your message body will appear here. Keep it concise!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-5">
          {/* Quick Templates */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Quick Templates</h3>
            <div className="space-y-2">
              {QUICK_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(t)}
                  className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-brand-50 hover:border-brand-200 border border-transparent transition-all group"
                >
                  <p className="text-sm font-medium text-gray-900 group-hover:text-brand-700 mb-1">
                    {t.title}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">{t.body}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Automation Info */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-500" />
              Automated Notifications
            </h3>
            <div className="space-y-3">
              {[
                { icon: '🎂', label: 'Birthday Rewards', schedule: 'Daily at 9:00 AM', status: 'active' },
                { icon: '😴', label: 'Inactive Reminders', schedule: 'Every Sunday', status: 'active' },
                { icon: '⭐', label: 'Tier Upgrades', schedule: 'Real-time', status: 'active' },
                { icon: '🌍', label: 'Nearby Branch', schedule: 'OS-level (PassKit/Wallet)', status: 'active' },
                { icon: '🔔', label: 'Points Earned', schedule: 'Per transaction', status: 'active' },
              ].map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{item.label}</p>
                      <p className="text-[10px] text-gray-400">{item.schedule}</p>
                    </div>
                  </div>
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 mt-1.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Configured Channels</h3>
            <div className="space-y-2">
              {[
                { name: 'Firebase FCM', desc: 'Android push notifications', icon: '🤖', ok: true },
                { name: 'Apple APNs', desc: 'iOS push notifications', icon: '🍎', ok: true },
                { name: 'Apple Wallet', desc: 'PassKit lock screen alerts', icon: '💳', ok: true },
                { name: 'Google Wallet', desc: 'Google Pay notifications', icon: '💳', ok: true },
                { name: 'SendGrid Email', desc: 'Transactional emails', icon: '📧', ok: true },
                { name: 'Twilio SMS', desc: 'Libya SMS (+218)', icon: '📱', ok: true },
              ].map((ch, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5">
                  <span className="text-base">{ch.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900">{ch.name}</p>
                    <p className="text-[10px] text-gray-400">{ch.desc}</p>
                  </div>
                  <CheckCircle className={`h-4 w-4 flex-shrink-0 ${ch.ok ? 'text-emerald-400' : 'text-gray-300'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
