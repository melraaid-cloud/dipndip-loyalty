'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Play, Pause, XCircle, Edit2, Calendar, Users, Zap } from 'lucide-react';
import { campaignsApi } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-50 text-blue-700',
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-yellow-50 text-yellow-700',
  completed: 'bg-purple-50 text-purple-700',
  cancelled: 'bg-red-50 text-red-600',
};

const TYPE_ICONS: Record<string, string> = {
  double_points: '2️⃣',
  multiplier: '✖️',
  bonus_points: '🎁',
  free_reward: '🆓',
  happy_hour: '⏰',
  birthday: '🎂',
  weekend: '🌅',
  branch_specific: '📍',
  product_launch: '🚀',
  custom: '✨',
};

export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', type: 'double_points', pointsMultiplier: 2,
    targetAudience: 'all', startDate: '', endDate: '',
    notificationTitle: '', notificationBody: '', sendPushNotification: true,
  });

  const { data, isLoading, mutate } = useSWR(
    'campaigns',
    () => campaignsApi.list({ limit: 50 }).then((r) => r.data),
  );

  const campaigns = data?.data || [];

  const handleCreate = async () => {
    try {
      await campaignsApi.create(form);
      toast.success('Campaign created!');
      setShowCreate(false);
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create campaign');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await campaignsApi.activate(id);
      toast.success('Campaign activated!');
      mutate();
    } catch { toast.error('Failed to activate'); }
  };

  const handlePause = async (id: string) => {
    try {
      await campaignsApi.pause(id);
      toast.success('Campaign paused');
      mutate();
    } catch { toast.error('Failed to pause'); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this campaign?')) return;
    try {
      await campaignsApi.cancel(id);
      toast.success('Campaign cancelled');
      mutate();
    } catch { toast.error('Failed to cancel'); }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Engine</h1>
          <p className="text-gray-500 text-sm mt-0.5">{campaigns.length} campaigns total</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-brand flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="skeleton h-5 w-48 mb-3 rounded" />
              <div className="skeleton h-4 w-full mb-2 rounded" />
              <div className="skeleton h-4 w-2/3 rounded" />
            </div>
          ))
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
            <Zap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No campaigns yet. Create your first campaign!</p>
          </div>
        ) : (
          campaigns.map((campaign: any) => (
            <div key={campaign.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {TYPE_ICONS[campaign.type] || '✨'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{campaign.description || '—'}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {campaign.startDate ? format(new Date(campaign.startDate), 'MMM d, yyyy') : 'No start date'}
                        {campaign.endDate && ` → ${format(new Date(campaign.endDate), 'MMM d, yyyy')}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {campaign.targetAudience?.replace('_', ' ')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5" />
                        {campaign.pointsMultiplier}x multiplier
                      </span>
                      {campaign.totalRedemptions > 0 && (
                        <span className="font-medium text-brand-600">
                          {campaign.totalRedemptions} redemptions
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(campaign.status === 'draft' || campaign.status === 'scheduled' || campaign.status === 'paused') && (
                    <button
                      onClick={() => handleActivate(campaign.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Activate
                    </button>
                  )}
                  {campaign.status === 'active' && (
                    <button
                      onClick={() => handlePause(campaign.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-100 transition-colors"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </button>
                  )}
                  {!['completed', 'cancelled'].includes(campaign.status) && (
                    <button
                      onClick={() => handleCancel(campaign.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Create Campaign</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Campaign Name</label>
                <input
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Double Points Tuesday"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  rows={2}
                  placeholder="Campaign details..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="double_points">Double Points</option>
                  <option value="multiplier">Points Multiplier</option>
                  <option value="bonus_points">Bonus Points</option>
                  <option value="happy_hour">Happy Hour</option>
                  <option value="weekend">Weekend Offer</option>
                  <option value="branch_specific">Branch Specific</option>
                  <option value="product_launch">Product Launch</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Points Multiplier</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.pointsMultiplier}
                  onChange={(e) => setForm({ ...form, pointsMultiplier: +e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Audience</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                >
                  <option value="all">All Members</option>
                  <option value="bronze">Bronze Only</option>
                  <option value="silver">Silver Only</option>
                  <option value="gold">Gold Only</option>
                  <option value="platinum">Platinum Only</option>
                  <option value="new">New Members</option>
                  <option value="vip">VIP Members</option>
                  <option value="dormant">Dormant Members</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Push Notification Title</label>
                <input
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="🎉 Special offer today!"
                  value={form.notificationTitle}
                  onChange={(e) => setForm({ ...form, notificationTitle: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notification Body</label>
                <input
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Earn double points today only!"
                  value={form.notificationBody}
                  onChange={(e) => setForm({ ...form, notificationBody: e.target.value })}
                />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="sendPush"
                  checked={form.sendPushNotification}
                  onChange={(e) => setForm({ ...form, sendPushNotification: e.target.checked })}
                  className="w-4 h-4 accent-brand-500"
                />
                <label htmlFor="sendPush" className="text-sm text-gray-700">Send push notification when activated</label>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={handleCreate} className="flex-1 btn-brand">
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
