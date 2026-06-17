'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Search, Plus, Filter, Download, Eye, Edit2, Gift } from 'lucide-react';
import { customersApi } from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';

const TIER_STYLES: Record<string, string> = {
  bronze: 'tier-badge-bronze',
  silver: 'tier-badge-silver',
  gold: 'tier-badge-gold',
  platinum: 'tier-badge-platinum',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  suspended: 'bg-red-50 text-red-700',
  pending: 'bg-yellow-50 text-yellow-700',
};

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR(
    ['customers', search, tier, status, page],
    () => customersApi.list({ search, tier, status, page, limit: 20 }).then((r) => r.data),
    { keepPreviousData: true },
  );

  const customers = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {meta.total?.toLocaleString() || '—'} total members
          </p>
        </div>
        <Link
          href="/dashboard/customers/new"
          className="btn-brand flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Register Customer
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, membership #..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            value={tier}
            onChange={(e) => { setTier(e.target.value); setPage(1); }}
          >
            <option value="">All Tiers</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
          <select
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-4">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-4">Membership #</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-4">Tier</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-4">Points</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-4">Total Spend</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-4">Visits</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-4">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-4">Joined</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="skeleton h-4 w-full rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No customers found</p>
                  </td>
                </tr>
              ) : (
                customers.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">
                            {customer.firstName?.[0]}{customer.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {customer.firstName} {customer.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{customer.email || customer.phone || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-mono text-gray-700">{customer.membershipNumber}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={TIER_STYLES[customer.tier] || 'bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-semibold uppercase'}>
                        {customer.tier}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-semibold text-brand-600">
                        {Number(customer.pointsBalance).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm text-gray-700">
                        {Number(customer.totalSpend).toFixed(3)} LYD
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm text-gray-700">{customer.totalVisits}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[customer.status] || ''}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {customer.createdAt ? format(new Date(customer.createdAt), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="View customer"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/customers/${customer.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit customer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, meta.total)} of {meta.total?.toLocaleString()} customers
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">Page {page} of {meta.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
