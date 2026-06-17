'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Settings, Star, Award, Gift, Edit2, Check, X } from 'lucide-react';
import { loyaltyApi } from '@/lib/api';
import toast from 'react-hot-toast';

const TIER_CONFIG = [
  { key: 'bronze',   label: 'Bronze',   emoji: '🥉', color: 'from-amber-600 to-amber-800',   range: '0 – 499 pts',    textColor: 'text-amber-700' },
  { key: 'silver',   label: 'Silver',   emoji: '🥈', color: 'from-gray-400 to-gray-600',     range: '500 – 1,499 pts', textColor: 'text-gray-600' },
  { key: 'gold',     label: 'Gold',     emoji: '🥇', color: 'from-yellow-400 to-yellow-600', range: '1,500 – 3,999 pts', textColor: 'text-yellow-700' },
  { key: 'platinum', label: 'Platinum', emoji: '💎', color: 'from-slate-700 to-slate-900',   range: '4,000+ pts',      textColor: 'text-slate-700' },
];

export default function LoyaltyRulesPage() {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    pointsPerLyd: 1,
    tierMultipliers: { bronze: 1, silver: 1.1, gold: 1.2, platinum: 1.5 },
    birthdayBonusPoints: 200,
    referrerBonusPoints: 150,
    referredBonusPoints: 100,
    welcomeBonusPoints: 50,
    silverThreshold: 500,
    goldThreshold: 1500,
    platinumThreshold: 4000,
  });

  const { data: rules = [], isLoading, mutate } = useSWR(
    'loyalty-rules',
    () => loyaltyApi.getRules().then((r) => r.data),
    {
      onSuccess: (data) => {
        const earnRule = data.find((r: any) => r.type === 'earn_rate');
        if (earnRule) {
          setForm({
            pointsPerLyd: earnRule.pointsPerLyd || 1,
            tierMultipliers: earnRule.tierMultipliers || { bronze: 1, silver: 1.1, gold: 1.2, platinum: 1.5 },
            birthdayBonusPoints: earnRule.birthdayBonusPoints || 200,
            referrerBonusPoints: earnRule.referrerBonusPoints || 150,
            referredBonusPoints: earnRule.referredBonusPoints || 100,
            welcomeBonusPoints: earnRule.welcomeBonusPoints || 50,
            silverThreshold: earnRule.silverThreshold || 500,
            goldThreshold: earnRule.goldThreshold || 1500,
            platinumThreshold: earnRule.platinumThreshold || 4000,
          });
        }
      },
    },
  );

  const handleSave = async () => {
    try {
      await loyaltyApi.createRule({ ...form, type: 'earn_rate', name: 'Main Loyalty Rule', isActive: true });
      toast.success('Loyalty rules updated successfully!');
      setEditing(false);
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save rules');
    }
  };

  const Field = ({
    label, value, field, hint, suffix = '', type = 'number', step = '1',
  }: {
    label: string; value: number; field: string; hint?: string;
    suffix?: string; type?: string; step?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {editing ? (
        <div className="relative">
          <input
            type={type}
            step={step}
            min="0"
            className="w-full px-4 py-2.5 border border-brand-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-brand-50/30"
            value={value}
            onChange={(e) => setForm({ ...form, [field]: parseFloat(e.target.value) || 0 })}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
              {suffix}
            </span>
          )}
        </div>
      ) : (
        <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold">
          {value} {suffix}
        </div>
      )}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loyalty Rules</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configure points earning rates, tier thresholds & bonus programs</p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-brand flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Save Rules
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-xl text-sm font-medium hover:bg-brand-100 transition-colors border border-brand-200"
            >
              <Edit2 className="h-4 w-4" />
              Edit Rules
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Earn Rate */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
              <Star className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Points Earn Rate</h3>
              <p className="text-xs text-gray-500">Base rate per Libyan Dinar spent</p>
            </div>
          </div>
          <Field
            label="Points per LYD"
            value={form.pointsPerLyd}
            field="pointsPerLyd"
            suffix="pts / LYD"
            step="0.5"
            hint="1 LYD = 1 Point (default). Increase to reward customers more."
          />

          <div className="mt-5 p-4 bg-brand-50 rounded-xl border border-brand-100">
            <p className="text-xs font-semibold text-brand-800 mb-2 uppercase tracking-wide">Example</p>
            <p className="text-sm text-brand-700">
              Customer spends <span className="font-bold">50 LYD</span> →
              earns <span className="font-bold">{Math.floor(50 * form.pointsPerLyd)} points</span>
              {form.tierMultipliers.gold > 1 && (
                <span className="text-brand-600">
                  {' '}(Gold member: {Math.floor(50 * form.pointsPerLyd * form.tierMultipliers.gold)} pts)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Tier Multipliers */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Award className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Tier Multipliers</h3>
              <p className="text-xs text-gray-500">Bonus multiplier applied per tier</p>
            </div>
          </div>
          <div className="space-y-3">
            {TIER_CONFIG.map((tier) => (
              <div key={tier.key} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tier.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm">{tier.emoji}</span>
                </div>
                <span className="text-sm font-medium text-gray-700 w-20">{tier.label}</span>
                {editing ? (
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    max="5"
                    className="flex-1 px-3 py-1.5 border border-brand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-brand-50/30"
                    value={form.tierMultipliers[tier.key as keyof typeof form.tierMultipliers]}
                    onChange={(e) => setForm({
                      ...form,
                      tierMultipliers: { ...form.tierMultipliers, [tier.key]: parseFloat(e.target.value) || 1 },
                    })}
                  />
                ) : (
                  <div className={`flex-1 text-right text-sm font-bold ${tier.textColor}`}>
                    {form.tierMultipliers[tier.key as keyof typeof form.tierMultipliers]}×
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tier Thresholds */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Award className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Tier Thresholds</h3>
              <p className="text-xs text-gray-500">Total points needed to reach each tier</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl flex items-center justify-between">
              <span className="text-sm font-medium text-amber-800">🥉 Bronze</span>
              <span className="text-sm font-bold text-amber-900">0 pts (default)</span>
            </div>
            <Field label="🥈 Silver from" value={form.silverThreshold}  field="silverThreshold"  suffix="pts" />
            <Field label="🥇 Gold from"   value={form.goldThreshold}    field="goldThreshold"    suffix="pts" />
            <Field label="💎 Platinum from" value={form.platinumThreshold} field="platinumThreshold" suffix="pts" />
          </div>
        </div>

        {/* Bonus Programs */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Bonus Programs</h3>
              <p className="text-xs text-gray-500">Special point awards for key events</p>
            </div>
          </div>
          <div className="space-y-4">
            <Field
              label="🎂 Birthday Bonus"
              value={form.birthdayBonusPoints}
              field="birthdayBonusPoints"
              suffix="pts"
              hint="Awarded automatically on birthday"
            />
            <Field
              label="👥 Referrer Bonus"
              value={form.referrerBonusPoints}
              field="referrerBonusPoints"
              suffix="pts"
              hint="Person who referred gets this"
            />
            <Field
              label="🎁 Referred Bonus"
              value={form.referredBonusPoints}
              field="referredBonusPoints"
              suffix="pts"
              hint="New customer who was referred gets this"
            />
            <Field
              label="🌟 Welcome Bonus"
              value={form.welcomeBonusPoints}
              field="welcomeBonusPoints"
              suffix="pts"
              hint="Awarded on first registration"
            />
          </div>
        </div>
      </div>

      {/* Tier Visual */}
      <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-5">Tier Journey Visualization</h3>
        <div className="relative">
          <div className="absolute left-0 right-0 top-6 h-1 bg-gray-200 rounded-full" />
          <div className="relative flex justify-between">
            {TIER_CONFIG.map((tier, i) => (
              <div key={tier.key} className="flex flex-col items-center gap-2 w-1/4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center shadow-md relative z-10`}>
                  <span className="text-xl">{tier.emoji}</span>
                </div>
                <p className="font-bold text-gray-900 text-sm">{tier.label}</p>
                <p className="text-xs text-gray-500 text-center">{tier.range}</p>
                <p className={`text-xs font-bold ${tier.textColor}`}>
                  {form.tierMultipliers[tier.key as keyof typeof form.tierMultipliers]}× multiplier
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
