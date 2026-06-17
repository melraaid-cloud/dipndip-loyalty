'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  ArrowLeft, Star, Gift, MapPin, Calendar, Phone, Mail, Edit2,
  Clock, TrendingUp, Award, Wallet, RefreshCw, Plus, Minus,
} from 'lucide-react';
import { customersApi, walletApi } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

const TIER_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  bronze: { bg: 'from-amber-600 to-amber-800', text: 'text-amber-50', badge: 'tier-badge-bronze' },
  silver: { bg: 'from-gray-400 to-gray-600', text: 'text-gray-50', badge: 'tier-badge-silver' },
  gold: { bg: 'from-yellow-400 to-yellow-600', text: 'text-yellow-900', badge: 'tier-badge-gold' },
  platinum: { bg: 'from-slate-700 to-slate-900', text: 'text-slate-200', badge: 'tier-badge-platinum' },
};

const TIER_THRESHOLDS: Record<string, number> = {
  bronze: 500, silver: 1500, gold: 4000, platinum: Infinity,
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [adjustPoints, setAdjustPoints] = useState({ open: false, points: 0, reason: '' });
  const [loadingWallet, setLoadingWallet] = useState(false);

  const { data: customer, isLoading, mutate } = useSWR(
    `customer/${id}`,
    () => customersApi.get(id).then((r) => r.data),
  );

  const { data: txData } = useSWR(
    `customer/${id}/transactions`,
    () => customersApi.getTransactions(id, { limit: 10 }).then((r) => r.data),
  );

  if (isLoading) {
    return <div className="p-8"><div className="skeleton h-64 rounded-2xl" /></div>;
  }
  if (!customer) return <div className="p-8 text-gray-500">Customer not found</div>;

  const tierStyle = TIER_COLORS[customer.tier] || TIER_COLORS.bronze;
  const nextTierPoints = TIER_THRESHOLDS[customer.tier];
  const progress = nextTierPoints !== Infinity
    ? Math.min(100, (customer.totalPointsEarned / nextTierPoints) * 100)
    : 100;

  const handleAdjustPoints = async () => {
    try {
      await customersApi.adjustPoints(id, adjustPoints.points, adjustPoints.reason);
      toast.success('Points adjusted successfully');
      mutate();
      setAdjustPoints({ open: false, points: 0, reason: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to adjust points');
    }
  };

  const handleGenerateWallet = async (type: 'apple' | 'google') => {
    setLoadingWallet(true);
    try {
      if (type === 'apple') {
        const res = await walletApi.generateApple(id);
        const url = URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.apple.pkpass' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dipndip-loyalty.pkpass';
        a.click();
        toast.success('Apple Wallet pass downloaded');
      } else {
        const res = await walletApi.generateGoogle(id);
        window.open(res.data.url, '_blank');
        toast.success('Opening Google Wallet');
      }
    } catch {
      toast.error('Failed to generate wallet pass');
    } finally {
      setLoadingWallet(false);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Customer Profile</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Loyalty Card */}
          <div className={`bg-gradient-to-br ${tierStyle.bg} rounded-3xl p-6 text-white shadow-xl relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs opacity-70 uppercase tracking-widest">dipndip Libya</p>
                  <span className={`${tierStyle.badge} mt-1 inline-block`}>{customer.tier}</span>
                </div>
                <span className="text-3xl">🍫</span>
              </div>
              <p className="text-2xl font-bold mb-1">
                {Number(customer.pointsBalance).toLocaleString()}
              </p>
              <p className="text-xs opacity-70 mb-6">Points Balance</p>
              <div className="bg-white rounded-2xl p-3 inline-block mb-4">
                <QRCodeSVG value={customer.membershipNumber} size={80} />
              </div>
              <div>
                <p className="font-semibold">{customer.firstName} {customer.lastName}</p>
                <p className="text-xs opacity-70 mt-0.5 font-mono">{customer.membershipNumber}</p>
              </div>
            </div>
          </div>

          {/* Progress to next tier */}
          {nextTierPoints !== Infinity && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Progress to next tier
              </p>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                <div
                  className="bg-gradient-to-r from-brand-400 to-brand-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{Number(customer.totalPointsEarned).toLocaleString()} pts</span>
                <span>{nextTierPoints.toLocaleString()} pts needed</span>
              </div>
              <p className="text-xs text-brand-600 font-medium mt-2">
                {Math.max(0, nextTierPoints - customer.totalPointsEarned).toLocaleString()} more points to next tier
              </p>
            </div>
          )}

          {/* Wallet Passes */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-brand-500" />
              Wallet Passes
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => handleGenerateWallet('apple')}
                disabled={loadingWallet}
                className="w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors"
              >
                <span>🍎</span>
                Add to Apple Wallet
              </button>
              <button
                onClick={() => handleGenerateWallet('google')}
                disabled={loadingWallet}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <span>🤖</span>
                Add to Google Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Right Columns */}
        <div className="col-span-2 space-y-6">
          {/* Info Header */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white text-2xl font-bold">
                    {customer.firstName?.[0]}{customer.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {customer.firstName} {customer.lastName}
                  </h2>
                  <p className="text-gray-500 text-sm">{customer.membershipNumber}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`${tierStyle.badge}`}>{customer.tier}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      customer.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}>{customer.status}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAdjustPoints({ ...adjustPoints, open: true })}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-xl text-sm font-medium hover:bg-brand-100 transition-colors"
                >
                  <Star className="h-4 w-4" />
                  Adjust Points
                </button>
                <Link
                  href={`/dashboard/customers/${id}/edit`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Link>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Points Balance', value: Number(customer.pointsBalance).toLocaleString(), icon: Star, color: 'text-brand-500' },
                { label: 'Total Spend', value: `${Number(customer.totalSpend).toFixed(3)} LYD`, icon: TrendingUp, color: 'text-emerald-500' },
                { label: 'Total Visits', value: customer.totalVisits, icon: MapPin, color: 'text-blue-500' },
                { label: 'Points Earned', value: Number(customer.totalPointsEarned).toLocaleString(), icon: Award, color: 'text-purple-500' },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-50 rounded-xl p-4">
                  <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Contact Info */}
            <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-3 gap-4">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {customer.email}
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {customer.phone}
                </div>
              )}
              {customer.birthday && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {format(new Date(customer.birthday), 'MMMM d, yyyy')}
                </div>
              )}
              {customer.lastVisitAt && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4 text-gray-400" />
                  Last visit: {format(new Date(customer.lastVisitAt), 'MMM d, yyyy')}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                Member since: {customer.createdAt ? format(new Date(customer.createdAt), 'MMM d, yyyy') : '—'}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Transaction History</h3>
              <Link href={`/dashboard/customers/${id}/transactions`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {txData?.data?.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-400">No transactions yet</p>
              ) : (
                txData?.data?.map((tx: any) => (
                  <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        tx.points > 0 ? 'bg-emerald-50' : 'bg-red-50'
                      }`}>
                        {tx.points > 0
                          ? <Plus className="h-4 w-4 text-emerald-500" />
                          : <Minus className="h-4 w-4 text-red-500" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tx.description || tx.type}</p>
                        <p className="text-xs text-gray-500">
                          {tx.createdAt ? format(new Date(tx.createdAt), 'MMM d, yyyy • h:mm a') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${tx.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {tx.points > 0 ? '+' : ''}{tx.points} pts
                      </p>
                      <p className="text-xs text-gray-400">Balance: {tx.balanceAfter}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Adjust Points Modal */}
      {adjustPoints.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-5">Adjust Points</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Points (positive = add, negative = deduct)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. 100 or -50"
                  value={adjustPoints.points}
                  onChange={(e) => setAdjustPoints({ ...adjustPoints, points: +e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reason</label>
                <textarea
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  rows={3}
                  placeholder="Reason for adjustment..."
                  value={adjustPoints.reason}
                  onChange={(e) => setAdjustPoints({ ...adjustPoints, reason: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setAdjustPoints({ open: false, points: 0, reason: '' })}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustPoints}
                  className="flex-1 btn-brand"
                >
                  Confirm Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
