'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Gift, Star, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { rewardsApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function RewardsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', nameAr: '', type: 'free_item', pointsCost: 100,
    freeItemName: '', description: '', discountPercentage: 0,
    isFeatured: false, sortOrder: 0,
  });

  const { data: rewards = [], isLoading, mutate } = useSWR(
    'rewards',
    () => rewardsApi.list().then((r) => r.data),
  );

  const handleCreate = async () => {
    try {
      await rewardsApi.create({ ...form, status: 'active', isActive: true });
      toast.success('Reward created!');
      setShowCreate(false);
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create reward');
    }
  };

  const handleToggle = async (reward: any) => {
    try {
      await rewardsApi.update(reward.id, { isActive: !reward.isActive, status: reward.isActive ? 'inactive' : 'active' });
      toast.success(reward.isActive ? 'Reward deactivated' : 'Reward activated');
      mutate();
    } catch { toast.error('Failed to update'); }
  };

  const TYPE_LABELS: Record<string, string> = {
    free_item: '🆓 Free Item',
    discount: '💵 Fixed Discount',
    percentage_discount: '% Percentage Off',
    upgrade: '⬆️ Upgrade',
    experience: '🌟 Experience',
    custom: '✨ Custom',
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rewards Catalog</h1>
          <p className="text-gray-500 text-sm mt-0.5">{rewards.length} rewards in catalog</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-brand flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Reward
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="skeleton h-12 w-12 rounded-xl mb-4" />
              <div className="skeleton h-5 w-32 mb-2 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
          ))
        ) : rewards.length === 0 ? (
          <div className="col-span-3 bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
            <Gift className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No rewards yet. Add your first reward!</p>
          </div>
        ) : (
          rewards.map((reward: any) => (
            <div key={reward.id} className={`bg-white rounded-2xl p-6 shadow-sm border transition-all card-hover ${
              reward.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-2xl">
                  🎁
                </div>
                <div className="flex items-center gap-2">
                  {reward.isFeatured && (
                    <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Featured</span>
                  )}
                  <button onClick={() => handleToggle(reward)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    {reward.isActive
                      ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                      : <ToggleLeft className="h-5 w-5" />
                    }
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{reward.name}</h3>
              {reward.nameAr && <p className="text-sm text-gray-500 mb-2" dir="rtl">{reward.nameAr}</p>}
              <p className="text-xs text-gray-400 mb-3">{TYPE_LABELS[reward.type] || reward.type}</p>
              {reward.freeItemName && (
                <p className="text-xs text-gray-600 mb-3 bg-gray-50 px-2 py-1 rounded-lg">{reward.freeItemName}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-brand-500" />
                  <span className="text-lg font-bold text-brand-600">{reward.pointsCost}</span>
                  <span className="text-xs text-gray-500">pts</span>
                </div>
                <span className="text-xs text-gray-400">{reward.totalRedeemed || 0} redeemed</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Create Reward</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name (EN) *</label>
                  <input
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Free Coffee"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name (AR)</label>
                  <input
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="قهوة مجانية"
                    dir="rtl"
                    value={form.nameAr}
                    onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type *</label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="free_item">Free Item</option>
                    <option value="discount">Fixed Discount</option>
                    <option value="percentage_discount">Percentage Discount</option>
                    <option value="experience">Experience</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Points Cost *</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.pointsCost}
                    onChange={(e) => setForm({ ...form, pointsCost: +e.target.value })}
                  />
                </div>
              </div>
              {form.type === 'free_item' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Free Item Name</label>
                  <input
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Any Coffee, Any Dessert..."
                    value={form.freeItemName}
                    onChange={(e) => setForm({ ...form, freeItemName: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="featured"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  className="w-4 h-4 accent-brand-500"
                />
                <label htmlFor="featured" className="text-sm text-gray-700">Mark as Featured</label>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleCreate} className="flex-1 btn-brand">Create Reward</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
