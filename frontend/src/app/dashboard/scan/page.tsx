'use client';

import { useState } from 'react';
import { QrCode, Search, CheckCircle, XCircle, Star, Gift, Loader2 } from 'lucide-react';
import { loyaltyApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

type Mode = 'verify' | 'earn' | 'redeem';

export default function ScanPage() {
  const [mode, setMode] = useState<Mode>('verify');
  const [membershipNumber, setMembershipNumber] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [earnForm, setEarnForm] = useState({ spendAmount: '', branchId: '', receiptNumber: '' });
  const [selectedReward, setSelectedReward] = useState('');

  const handleVerify = async () => {
    if (!membershipNumber.trim()) return;
    setLoading(true);
    setCustomer(null);
    try {
      const res = await loyaltyApi.verifyMembership(membershipNumber.trim());
      setCustomer(res.data);
      if (res.data.isValid) {
        toast.success(`Verified: ${res.data.customer.firstName} ${res.data.customer.lastName}`);
        const rewardsRes = await loyaltyApi.getRewards(res.data.customer.tier);
        setRewards(rewardsRes.data || []);
      } else {
        toast.error('Invalid or inactive membership');
      }
    } catch {
      toast.error('Membership not found');
    } finally {
      setLoading(false);
    }
  };

  const handleEarn = async () => {
    if (!customer || !earnForm.spendAmount) return;
    setLoading(true);
    try {
      const res = await loyaltyApi.earnPoints({
        customerId: customer.customer.id,
        branchId: earnForm.branchId || '00000000-0000-0000-0000-000000000000',
        spendAmount: parseFloat(earnForm.spendAmount),
        receiptNumber: earnForm.receiptNumber,
      });
      toast.success(`✅ ${res.data.points} points earned!`);
      await handleVerify();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to earn points');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!customer || !selectedReward) return;
    setLoading(true);
    try {
      await loyaltyApi.redeemPoints({
        customerId: customer.customer.id,
        rewardId: selectedReward,
      });
      toast.success('🎁 Reward redeemed successfully!');
      setSelectedReward('');
      await handleVerify();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to redeem');
    } finally {
      setLoading(false);
    }
  };

  const TIER_STYLES: Record<string, string> = {
    bronze: 'tier-badge-bronze', silver: 'tier-badge-silver',
    gold: 'tier-badge-gold', platinum: 'tier-badge-platinum',
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">QR Scanner & POS</h1>
        <p className="text-gray-500 text-sm mt-0.5">Scan or enter membership number to process transactions</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { mode: 'verify', label: 'Verify', icon: QrCode },
          { mode: 'earn', label: 'Earn Points', icon: Star },
          { mode: 'redeem', label: 'Redeem Reward', icon: Gift },
        ] as const).map(({ mode: m, label, icon: Icon }) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === m
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Membership Number or QR Code
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-base font-mono"
              placeholder="e.g. DND241234567 or scan QR"
              value={membershipNumber}
              onChange={(e) => setMembershipNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={loading || !membershipNumber.trim()}
            className="btn-brand px-6 py-3 flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Verify
          </button>
        </div>
      </div>

      {/* Customer Card */}
      {customer && (
        <div className={`bg-white rounded-2xl p-6 shadow-sm border-2 mb-6 ${
          customer.isValid ? 'border-emerald-200' : 'border-red-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {customer.isValid
              ? <CheckCircle className="h-6 w-6 text-emerald-500" />
              : <XCircle className="h-6 w-6 text-red-500" />
            }
            <span className={`text-sm font-semibold ${customer.isValid ? 'text-emerald-600' : 'text-red-600'}`}>
              {customer.isValid ? 'Valid Member' : 'Invalid / Inactive'}
            </span>
          </div>

          {customer.customer && (
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                    <span className="text-white font-bold">
                      {customer.customer.firstName?.[0]}{customer.customer.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {customer.customer.firstName} {customer.customer.lastName}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono">{customer.customer.membershipNumber}</p>
                  </div>
                  <span className={TIER_STYLES[customer.customer.tier] || ''}>
                    {customer.customer.tier}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-brand-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-brand-700">
                      {Number(customer.customer.pointsBalance).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Points</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-700">{customer.customer.totalVisits}</p>
                    <p className="text-xs text-gray-500">Visits</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-700 capitalize">{customer.customer.tier}</p>
                    <p className="text-xs text-gray-500">Tier</p>
                  </div>
                </div>
              </div>
              {customer.customer.membershipNumber && (
                <div className="bg-white border border-gray-200 rounded-xl p-3 flex-shrink-0">
                  <QRCodeSVG value={customer.customer.membershipNumber} size={100} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Earn Points Form */}
      {mode === 'earn' && customer?.isValid && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Star className="h-5 w-5 text-brand-500" />
            Earn Points
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Spend Amount (LYD) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-lg font-bold"
                placeholder="0.000"
                value={earnForm.spendAmount}
                onChange={(e) => setEarnForm({ ...earnForm, spendAmount: e.target.value })}
              />
              {earnForm.spendAmount && (
                <p className="mt-1 text-sm text-brand-600 font-medium">
                  ≈ {Math.floor(parseFloat(earnForm.spendAmount) || 0)} points to earn
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Receipt Number
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Optional"
                value={earnForm.receiptNumber}
                onChange={(e) => setEarnForm({ ...earnForm, receiptNumber: e.target.value })}
              />
            </div>
          </div>
          <button
            onClick={handleEarn}
            disabled={loading || !earnForm.spendAmount}
            className="w-full btn-brand py-3 text-base font-semibold flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Star className="h-5 w-5" />}
            Earn Points
          </button>
        </div>
      )}

      {/* Redeem Reward Form */}
      {mode === 'redeem' && customer?.isValid && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Gift className="h-5 w-5 text-brand-500" />
            Redeem Reward
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {rewards.map((reward: any) => (
              <button
                key={reward.id}
                onClick={() => setSelectedReward(reward.id)}
                disabled={customer.customer.pointsBalance < reward.pointsCost}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedReward === reward.id
                    ? 'border-brand-500 bg-brand-50'
                    : customer.customer.pointsBalance >= reward.pointsCost
                    ? 'border-gray-200 hover:border-brand-300'
                    : 'border-gray-100 opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{reward.name}</p>
                    {reward.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{reward.description}</p>
                    )}
                  </div>
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg flex-shrink-0">
                    {reward.pointsCost} pts
                  </span>
                </div>
              </button>
            ))}
            {rewards.length === 0 && (
              <p className="col-span-2 text-center text-gray-400 text-sm py-8">No rewards available for this tier</p>
            )}
          </div>
          <button
            onClick={handleRedeem}
            disabled={loading || !selectedReward}
            className="w-full btn-brand py-3 text-base font-semibold flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
            Confirm Redemption
          </button>
        </div>
      )}
    </div>
  );
}
