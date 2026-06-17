'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const schema = z.object({
  firstName: z.string().min(2, 'الاسم الأول مطلوب'),
  lastName:  z.string().min(2, 'الاسم الأخير مطلوب'),
  phone:     z.string().optional(),
  email:     z.string().email('بريد إلكتروني غير صحيح').optional().or(z.literal('')),
  birthday:  z.string().optional(),
  referralCode: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface RegisteredCustomer {
  id: string;
  loyaltyId?: string;
  membershipNumber?: string;
  tier: string;
  firstName: string;
}

const TIER_LABELS: Record<string, string> = {
  BRONZE: '🥉 برونز',
  SILVER: '🥈 فضي',
  GOLD:   '🥇 ذهبي',
  PLATINUM: '💎 بلاتيني',
};

export default function JoinPage() {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [customer, setCustomer] = useState<RegisteredCustomer | null>(null);
  const [applePassUrl, setApplePassUrl] = useState<string | null>(null);
  const [googleSaveUrl, setGoogleSaveUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    const body: Record<string, string> = {
      firstName: data.firstName,
      lastName:  data.lastName,
    };
    if (data.phone)       body.phone        = data.phone;
    if (data.email)       body.email        = data.email;
    if (data.birthday)    body.birthday     = data.birthday;
    if (data.referralCode) body.referralCode = data.referralCode;

    const res = await fetch(`${API}/customers/self-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (!res.ok) {
      const msg = Array.isArray(result.message)
        ? result.message.join('، ')
        : result.message || 'حدث خطأ، حاول مجدداً';
      toast.error(msg);
      return;
    }

    setCustomer(result);
    setStep('success');

    // Load wallet passes in background
    Promise.allSettled([
      fetch(`${API}/wallet/apple/${result.id}/pass`),
      fetch(`${API}/wallet/google/${result.id}/save-url`),
    ]).then(([appleRes, googleRes]) => {
      if (appleRes.status === 'fulfilled' && appleRes.value.ok) {
        appleRes.value.blob().then(blob => setApplePassUrl(URL.createObjectURL(blob)));
      }
      if (googleRes.status === 'fulfilled' && googleRes.value.ok) {
        googleRes.value.json().then(d => setGoogleSaveUrl(d.saveUrl || d.url));
      }
    });
  }

  if (step === 'success' && customer) {
    return (
      <main className="min-h-screen bg-[#0d0805] flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="text-4xl font-black text-[#c8860a] tracking-widest">🍫 dipndip</div>
            <div className="text-[#a08060] text-sm mt-1">برنامج الولاء</div>
          </div>

          <div className="bg-[#1a1008] border border-[#3a2010] rounded-2xl p-8 text-center shadow-2xl">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-[#c8860a] mb-2">
              أهلاً بك يا {customer.firstName}!
            </h2>
            <p className="text-[#a08060] mb-6">
              تم تسجيلك بنجاح في برنامج الولاء
            </p>

            {/* Loyalty ID */}
            <div className="bg-[#0d0805] border border-[#c8860a] rounded-xl py-3 px-6 mb-3 inline-block">
              <div className="text-xs text-[#a08060] mb-1">رقم عضويتك</div>
              <div className="text-xl font-bold text-[#c8860a] tracking-widest font-mono">
                {customer.loyaltyId || customer.membershipNumber || customer.id.slice(0, 8).toUpperCase()}
              </div>
            </div>

            {/* Tier */}
            <div className="mb-6">
              <span className="bg-[#c8860a22] border border-[#c8860a55] text-[#c8860a] rounded-full px-4 py-1.5 text-sm font-medium">
                {TIER_LABELS[customer.tier] || customer.tier}
              </span>
            </div>

            <p className="text-[#a08060] text-sm mb-5">
              أضف بطاقتك للمحفظة لتتبع نقاطك في أي وقت
            </p>

            {/* Wallet Buttons */}
            <div className="flex flex-col gap-3">
              {applePassUrl ? (
                <a
                  href={applePassUrl}
                  download="dipndip.pkpass"
                  className="flex items-center justify-center gap-2 bg-[#1c1c1e] border border-[#3a3a3c] text-white rounded-xl py-3 font-semibold hover:bg-[#2c2c2e] transition"
                >
                  🍎 أضف إلى Apple Wallet
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 bg-[#1c1c1e] border border-[#3a3a3c] text-[#666] rounded-xl py-3 text-sm">
                  <span className="animate-spin text-xs">⏳</span> جاري تحضير بطاقة Apple...
                </div>
              )}

              {googleSaveUrl ? (
                <a
                  href={googleSaveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-[#1a73e8] text-white rounded-xl py-3 font-semibold hover:bg-[#1557b0] transition"
                >
                  💳 أضف إلى Google Wallet
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 bg-[#1a73e822] border border-[#1a73e844] text-[#666] rounded-xl py-3 text-sm">
                  <span className="animate-spin text-xs">⏳</span> جاري تحضير بطاقة Google...
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-[#3a2010] text-xs text-[#5a4030]">
              كل زيارة تستحق مكافأة — نقاطك تراكمة تلقائياً 🍫
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0805] flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-[#c8860a] tracking-widest">🍫 dipndip</div>
          <div className="text-[#a08060] text-sm mt-1">برنامج الولاء — كل زيارة تستحق مكافأة</div>
        </div>

        <div className="bg-[#1a1008] border border-[#3a2010] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-[#f5e6d0] text-center mb-6">
            سجّل وابدأ تجميع النقاط
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#a08060] mb-1.5">الاسم الأول *</label>
                <input
                  {...register('firstName')}
                  placeholder="محمد"
                  className="w-full bg-[#0d0805] border border-[#3a2010] rounded-lg px-3 py-2.5 text-[#f5e6d0] placeholder-[#5a4030] focus:outline-none focus:border-[#c8860a] transition text-sm"
                />
                {errors.firstName && (
                  <p className="text-red-400 text-xs mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-[#a08060] mb-1.5">الاسم الأخير *</label>
                <input
                  {...register('lastName')}
                  placeholder="العربي"
                  className="w-full bg-[#0d0805] border border-[#3a2010] rounded-lg px-3 py-2.5 text-[#f5e6d0] placeholder-[#5a4030] focus:outline-none focus:border-[#c8860a] transition text-sm"
                />
                {errors.lastName && (
                  <p className="text-red-400 text-xs mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs text-[#a08060] mb-1.5">رقم الهاتف</label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="0912345678"
                className="w-full bg-[#0d0805] border border-[#3a2010] rounded-lg px-3 py-2.5 text-[#f5e6d0] placeholder-[#5a4030] focus:outline-none focus:border-[#c8860a] transition text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs text-[#a08060] mb-1.5">البريد الإلكتروني</label>
              <input
                {...register('email')}
                type="email"
                placeholder="example@email.com"
                className="w-full bg-[#0d0805] border border-[#3a2010] rounded-lg px-3 py-2.5 text-[#f5e6d0] placeholder-[#5a4030] focus:outline-none focus:border-[#c8860a] transition text-sm"
                dir="ltr"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Birthday */}
            <div>
              <label className="block text-xs text-[#a08060] mb-1.5">تاريخ الميلاد (اختياري)</label>
              <input
                {...register('birthday')}
                type="date"
                className="w-full bg-[#0d0805] border border-[#3a2010] rounded-lg px-3 py-2.5 text-[#f5e6d0] focus:outline-none focus:border-[#c8860a] transition text-sm"
              />
            </div>

            {/* Referral */}
            <div>
              <label className="block text-xs text-[#a08060] mb-1.5">كود الإحالة (إن وجد)</label>
              <input
                {...register('referralCode')}
                placeholder="DND-XXXXX"
                className="w-full bg-[#0d0805] border border-[#3a2010] rounded-lg px-3 py-2.5 text-[#f5e6d0] placeholder-[#5a4030] focus:outline-none focus:border-[#c8860a] transition text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#c8860a] to-[#e8a020] text-[#0d0805] font-bold py-3.5 rounded-xl text-base mt-2 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'جاري التسجيل...' : 'انضم الآن 🎉'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#5a4030] text-xs mt-6">
          dipndip Libya &nbsp;·&nbsp; جميع الحقوق محفوظة 2025
        </p>
      </div>
    </main>
  );
}
