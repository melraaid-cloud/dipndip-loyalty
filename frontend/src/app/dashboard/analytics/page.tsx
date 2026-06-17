'use client';

import useSWR from 'swr';
import {
  Users, TrendingUp, Star, Gift, BarChart3, Award, Target, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { format } from 'date-fns';

const fetcher = (key: string) => {
  const map: Record<string, () => Promise<any>> = {
    dashboard: () => analyticsApi.getDashboard().then((r) => r.data),
    retention: () => analyticsApi.getRetention().then((r) => r.data),
    ltv: () => analyticsApi.getCustomerLtv().then((r) => r.data),
    campaigns: () => analyticsApi.getCampaignPerformance().then((r) => r.data),
  };
  return map[key]?.();
};

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#9E9E9E',
  gold: '#FFD700',
  platinum: '#1A1A2E',
};

export default function AnalyticsPage() {
  const { data: dashboard } = useSWR('dashboard', () => fetcher('dashboard'));
  const { data: retention } = useSWR('retention', () => fetcher('retention'));
  const { data: ltv } = useSWR('ltv', () => fetcher('ltv'));
  const { data: campaigns } = useSWR('campaigns', () => fetcher('campaigns'));

  const tierDist = dashboard?.tierDistribution || [];
  const topCustomers = dashboard?.topCustomers || [];
  const topBranches = dashboard?.topBranches || [];

  const retentionData = retention ? [
    { period: '30 Days', rate: parseFloat(retention.retentionRate30 || 0) },
    { period: '60 Days', rate: parseFloat(retention.retentionRate60 || 0) },
    { period: '90 Days', rate: parseFloat(retention.retentionRate90 || 0) },
  ] : [];

  const ltvData = (ltv || []).map((t: any) => ({
    tier: t.tier,
    avgSpend: parseFloat(t.avgSpend || 0).toFixed(2),
    avgVisits: parseFloat(t.avgVisits || 0).toFixed(1),
    avgPoints: parseFloat(t.avgPointsEarned || 0).toFixed(0),
    count: parseInt(t.count || 0),
  }));

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Business Intelligence</h1>
          <p className="text-gray-500 text-sm mt-0.5">Executive reporting dashboard</p>
        </div>
      </div>

      {/* Retention Metrics */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {retentionData.map((r) => (
          <div key={r.period} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Retention ({r.period})</p>
              <Target className="h-5 w-5 text-brand-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{r.rate}%</p>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
              <div
                className="bg-gradient-to-r from-brand-400 to-brand-600 h-2 rounded-full"
                style={{ width: `${Math.min(100, r.rate)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Customer LTV by Tier */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-1">Customer LTV by Tier</h3>
          <p className="text-sm text-gray-500 mb-6">Average spend and engagement per tier</p>
          {ltvData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ltvData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Bar dataKey="avgSpend" name="Avg Spend (LYD)" radius={[4, 4, 0, 0]}>
                  {ltvData.map((entry: any, i: number) => (
                    <Cell key={i} fill={TIER_COLORS[entry.tier] || '#D4890A'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Campaign Performance */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-1">Campaign Performance</h3>
          <p className="text-sm text-gray-500 mb-4">Transactions and reach per campaign</p>
          {campaigns && campaigns.length > 0 ? (
            <div className="space-y-3 overflow-y-auto max-h-64">
              {campaigns.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.campaignName || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{c.uniqueCustomers} unique customers</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-brand-600">
                      {parseInt(c.totalPointsIssued || 0).toLocaleString()} pts
                    </p>
                    <p className="text-xs text-gray-400">{c.totalTransactions} txns</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No campaign data yet</div>
          )}
        </div>
      </div>

      {/* Top Customers & Top Branches */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Top Customers by Spend</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {topCustomers.slice(0, 8).map((customer: any, i: number) => (
              <div key={customer.id} className="px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{customer.firstName?.[0]}{customer.lastName?.[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{customer.firstName} {customer.lastName}</p>
                    <p className="text-xs text-gray-500 capitalize">{customer.tier} • {customer.totalVisits} visits</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {Number(customer.totalSpend).toFixed(3)} LYD
                  </p>
                  <p className="text-xs text-brand-600">
                    {Number(customer.pointsBalance).toLocaleString()} pts
                  </p>
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <p className="text-center py-8 text-sm text-gray-400">No data yet</p>
            )}
          </div>
        </div>

        {/* Top Branches */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Top Branches by Traffic</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {topBranches.slice(0, 8).map((branch: any, i: number) => (
              <div key={branch.branchId} className="px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">📍</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{branch.branchName || 'Unknown Branch'}</p>
                    <p className="text-xs text-gray-500">{branch.uniqueCustomers} unique visitors</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {parseInt(branch.visitCount).toLocaleString()} visits
                  </p>
                  <p className="text-xs text-emerald-600">
                    {Number(branch.totalRevenue || 0).toFixed(3)} LYD
                  </p>
                </div>
              </div>
            ))}
            {topBranches.length === 0 && (
              <p className="text-center py-8 text-sm text-gray-400">No visit data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
