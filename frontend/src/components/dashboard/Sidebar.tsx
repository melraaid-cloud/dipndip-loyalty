'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Users, Award, Megaphone, BarChart3,
  Wallet, MapPin, Settings, LogOut, Gift, UserCog, Bell,
  ChevronRight, QrCode,
} from 'lucide-react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { href: '/dashboard/customers', icon: Users, label: 'All Customers' },
      { href: '/dashboard/scan', icon: QrCode, label: 'QR Scanner / POS' },
    ],
  },
  {
    label: 'Loyalty',
    items: [
      { href: '/dashboard/rewards', icon: Gift, label: 'Rewards Catalog' },
      { href: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
      { href: '/dashboard/loyalty-rules', icon: Award, label: 'Loyalty Rules' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/dashboard/wallet', icon: Wallet, label: 'Wallet Passes' },
      { href: '/dashboard/branches', icon: MapPin, label: 'Branches' },
      { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics & BI' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/dashboard/staff', icon: UserCog, label: 'Staff Management' },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('refreshToken');
    Cookies.remove('user');
    router.push('/login');
  };

  const user = (() => {
    try {
      const u = Cookies.get('user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })();

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 w-64 flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-chocolate-600 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-xl">🍫</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-base">dipndip</h1>
            <p className="text-xs text-gray-500">Libya — Loyalty Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-4 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx('sidebar-link', isActive && 'active')}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 capitalize truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
