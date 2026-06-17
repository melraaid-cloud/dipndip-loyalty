'use client';

import { useState } from 'react';
import { Wallet, Search, Download, RefreshCw, Smartphone, Apple, Globe, QrCode } from 'lucide-react';
import { customersApi, walletApi } from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

const TIER_COLORS: Record<string, string> = {
  bronze:   'from-amber-600 to-amber-800',
  silver:   'from-gray-400 to-gray-600',
  gold:     'from-yellow-400 to-yellow-600',
  platinum: 'from-slate-700 to-slate-900',
};

export default function WalletPage() {
  const [search, setSearch] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [googleUrl, setGoogleUrl] = useState('');

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setCustomer(null);
    setGoogleUrl('');
    try {
      const res = await customersApi.list({ search: search.trim(), limit: 1 });
      const customers = res.data?.data || [];
      if (customers.length === 0) { toast.error('Customer not found'); return; }
      const full = await customersApi.get(customers[0].id);
      setCustomer(full.data);
    } catch { toast.error('Customer not found'); }
    finally { setSearching(false); }
  };

  const handleAppleWallet = async () => {
    if (!customer) return;
    setLoadingApple(true);
    try {
      const res = await walletApi.generateApple(customer.id);
      const blob = new Blob([res.data], { type: 'application/vnd.apple.pkpass' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `dipndip-${customer.membershipNumber}.pkpass`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success('Apple Wallet pass downloaded!');
    } catch { toast.error('Failed to generate Apple pass. Check PassKit certificates.'); }
    finally { setLoadingApple(false); }
  };

  const handleGoogleWallet = async () => {
    if (!customer) return;
    setLoadingGoogle(true);
    try {
      const res = await walletApi.generateGoogle(customer.id);
      setGoogleUrl(res.data.url);
      toast.success('Google Wallet link generated!');
    } catch { toast.error('Failed to generate Google Wallet pass. Check service account credentials.'); }
    finally { setLoadingGoogle(false); }
  };

  const handleForceUpdate = async () => {
    if (!customer) return;
    setLoadingUpdate(true);
    try {
      await walletApi.updatePass(customer.id);
      toast.success('Wallet passes updated and pushed to device!');
    } catch { toast.error('Failed to update wallet passes'); }
    finally { setLoadingUpdate(false); }
  };

  const tierGradient = customer ? (TIER_COLORS[customer.tier] || TIER_COLORS.bronze) : TIER_COLORS.bronze;

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Wallet Pass Generator</h1>
        <p className="text-gray-500 text-sm mt-0.5">Generate Apple Wallet (.pkpass) and Google Wallet passes for customers</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Find Customer</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Name, email, phone, or membership number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="btn-brand px-6 flex items-center gap-2"
          >
            {searching
              ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <Search className="h-4 w-4" />
            }
            Search
          </button>
        </div>
      </div>

      {customer && (
        <div className="grid grid-cols-2 gap-6">
          {/* Card Preview */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">Loyalty Card Preview</h3>
            <div className={`bg-gradient-to-br ${tierGradient} rounded-3xl p-7 text-white shadow-2xl relative overflow-hidden`}>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-xs opacity-60 uppercase tracking-widest mb-1">dipndip Libya</p>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border border-white/20 bg-white/10 uppercase tracking-wide`}>
                      {customer.tier}
                    </span>
                  </div>
                  <span className="text-4xl">🍫</span>
                </div>

                <div className="mb-6">
                  <p className="text-4xl font-bold">{Number(customer.pointsBalance).toLocaleString()}</p>
                  <p className="text-xs opacity-60 mt-1 uppercase tracking-widest">Points Balance</p>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-bold text-lg">{customer.firstName} {customer.lastName}</p>
                    <p className="text-xs opacity-60 font-mono mt-0.5">{customer.membershipNumber}</p>
                    <div className="flex gap-4 mt-3 text-xs opacity-70">
                      <span>🏪 {customer.totalVisits} visits</span>
                      <span>💰 {Number(customer.totalSpend).toFixed(3)} LYD</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-2 shadow-lg">
                    <QRCodeSVG value={customer.membershipNumber} size={72} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Points', value: Number(customer.pointsBalance).toLocaleString() },
                { label: 'Visits', value: customer.totalVisits },
                { label: 'Spend', value: `${Number(customer.totalSpend).toFixed(0)} LYD` },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {/* Apple Wallet */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                  <Apple className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Apple Wallet</h4>
                  <p className="text-xs text-gray-500">PassKit .pkpass file</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Generates a signed <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.pkpass</code> file
                that customers can add to their iPhone Wallet. Includes geofence locations for all branches.
              </p>
              <button
                onClick={handleAppleWallet}
                disabled={loadingApple}
                className="w-full py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingApple
                  ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <Download className="h-4 w-4" />
                }
                {loadingApple ? 'Generating…' : 'Download .pkpass'}
              </button>
            </div>

            {/* Google Wallet */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Google Wallet</h4>
                  <p className="text-xs text-gray-500">Google Pay / Wallet API</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Generates a signed JWT link. Customer taps the link to add the loyalty card
                to their Google Wallet on any Android device.
              </p>
              <button
                onClick={handleGoogleWallet}
                disabled={loadingGoogle}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingGoogle
                  ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <Smartphone className="h-4 w-4" />
                }
                {loadingGoogle ? 'Generating…' : 'Generate Google Wallet Link'}
              </button>
              {googleUrl && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-700 font-medium mb-2">Google Wallet Link:</p>
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline break-all"
                  >
                    {googleUrl}
                  </a>
                </div>
              )}
            </div>

            {/* Force Update */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Force Update Passes</h4>
                  <p className="text-xs text-gray-500">Push latest data to device</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Pushes the latest points balance and tier to the customer's Apple Wallet
                via APNs. Google Wallet updates automatically via API.
              </p>
              <button
                onClick={handleForceUpdate}
                disabled={loadingUpdate}
                className="w-full py-2.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-xl text-sm font-semibold hover:bg-brand-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingUpdate
                  ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <RefreshCw className="h-4 w-4" />
                }
                {loadingUpdate ? 'Updating…' : 'Push Pass Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      {!customer && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-6">How Wallet Passes Work</h3>
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                icon: '🔍', step: '1',
                title: 'Find Customer',
                desc: 'Search by name, email, phone or membership number to locate the customer\'s account.',
              },
              {
                icon: '📱', step: '2',
                title: 'Generate Pass',
                desc: 'Click Apple or Google Wallet button. The pass is signed with your certificates and contains the QR code, points, and branch geofences.',
              },
              {
                icon: '🔔', step: '3',
                title: 'Auto-Updates',
                desc: 'Every time a customer earns or redeems points, their wallet pass is automatically updated via APNs/Google API push.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                  {item.icon}
                </div>
                <p className="font-semibold text-gray-900 mb-2">{item.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Apple Wallet Requirements</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Apple Developer Account</li>
                <li>• Pass Type ID certificate (.p12)</li>
                <li>• WWDR certificate (.pem)</li>
                <li>• APNs key for push updates (.p8)</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Google Wallet Requirements</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Google Pay & Wallet Console account</li>
                <li>• Service account JSON credentials</li>
                <li>• Loyalty class created in console</li>
                <li>• Issuer ID from Google</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
