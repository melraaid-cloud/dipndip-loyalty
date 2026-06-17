'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import {
  Users, TrendingUp, Star, Gift, BarChart3, Award,
  ArrowUpRight, ArrowDownRight, RefreshCw, Wallet, MapPin,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { format } from 'date-fns';

const fetcher = () => analyticsApi.getDashboard().then((r) => r.data);

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#9E9E9E',
  gold: '#FFD700',
  platinum: '#1A1A2E',
};

function StatCard({
  title, value, subtitle, icon: Icon, trend, trendValue, color = 'brand',
}: {
  title: string; value: string | number; subtitle?: string;
  icon: any; trend?: 'up' | 'down'; trendValue?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    brand: 'from-brand-500 to-brand-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 bg-gradient-to-br ${colorMap[color] || colorMap.brand} rounded-xl flex items-center justify-center shadow-md`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value?.toLocaleString()}</p>
        <p className="text-sm font-medium text-gray-600 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, mutate } = useSWR('analytics/dashboard', fetcher, {
    refreshInterval: 60000,
  });
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [pointsData, setPointsData] = useState<any[]>([]);

  useEffect(() => {
    analyticsApi.getMemberGrowth('month').then((r) => {
      setGrowthData(r.data.map((d: any) => ({
        ...d,
        date: d.period ? format(new Date(d.period), 'MMM d') : d.period,
        members: parseInt(d.count),
      })));
    }).catch(() => {});

    analyticsApi.getPointsActivity(30).then((r) => {
      setPointsData(r.data.map((d: any) => ({
        ...d,
        date: d.date ? format(new Date(d.date), 'MMM d') : d.date,
        earned: parseInt(d.earned || 0),
        redeemed: parseInt(d.redeemed || 0),
      })));
    }).catch(() => {});
  }, []);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton h-11 w-11 rounded-xl mb-4" />
              <div className="skeleton h-7 w-24 mb-2 rounded" />
              <div className="skeleton h-4 w-32 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { overview, tierDistribution = [], points = {}, visits = {} } = data || {};

  const pieData = tierDistribution.map((t: any) => ({
    name: t.tier,
    value: parseInt(t.count),
    color: TIER_COLORS[t.tier] || '#888',
  }));

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">dipndip Libya Loyalty Platform — Real-time Overview</p>
        </div>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Members"
          value={overview?.totalMembers || 0}
          icon={Users}
          trend="up"
          trendValue={`${overview?.newMembersThisMonth || 0} this month`}
          color="brand"
        />
        <StatCard
          title="Active Members"
          value={overview?.activeMembers || 0}
          subtitle={`${overview?.activeRate || 0}% active rate`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Points Outstanding"
          value={Number(points?.totalOutstanding || 0).toLocaleString()}
          subtitle="Across all members"
          icon={Star}
          color="purple"
        />
        <StatCard
          title="Redemption Rate"
          value={`${points?.redemptionRate || 0}%`}
          subtitle="Points redeemed vs earned"
          icon={Gift}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Member Growth */}
        <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Member Growth</h3>
              <p className="text-sm text-gray-500">New registrations — last 30 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="memberGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4890A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#D4890A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="members" stroke="#D4890A" strokeWidth={2.5} fill="url(#memberGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tier Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-1">Tier Distribution</h3>
          <p className="text-sm text-gray-500 mb-6">Members by loyalty tier</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [v.toLocaleString(), 'Members']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {pieData.map((t: any) => (
                  <div key={t.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                      <span className="text-sm capitalize text-gray-600">{t.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{t.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Points Activity */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900">Points Activity</h3>
            <p className="text-sm text-gray-500">Earned vs Redeemed — last 30 days</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 bg-brand-500 rounded-full inline-block" /> Earned</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 bg-chocolate-500 rounded-full inline-block" /> Redeemed</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={pointsData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
            <Bar dataKey="earned" fill="#D4890A" radius={[4, 4, 0, 0]} name="Earned" />
            <Bar dataKey="redeemed" fill="#DC5F1A" radius={[4, 4, 0, 0]} name="Redeemed" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white">
          <Award className="h-8 w-8 mb-4 opacity-80" />
          <p className="text-brand-100 text-sm">Points Issued This Month</p>
          <p className="text-3xl font-bold mt-1">{Number(points?.totalEarned || 0).toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 text-white">
          <Users className="h-8 w-8 mb-4 opacity-80" />
          <p className="text-slate-300 text-sm">Active Visitors (30d)</p>
          <p className="text-3xl font-bold mt-1">{Number(visits?.uniqueVisitors || 0).toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white">
          <BarChart3 className="h-8 w-8 mb-4 opacity-80" />
          <p className="text-emerald-100 text-sm">New Members This Month</p>
          <p className="text-3xl font-bold mt-1">{Number(overview?.newMembersThisMonth || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
