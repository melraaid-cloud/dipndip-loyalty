import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'dipndip Libya — Loyalty Platform',
  description: 'dipndip Libya Customer Loyalty & Rewards Management Platform',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#1A0A00', color: '#FFF8F0', borderRadius: '12px' },
            success: { iconTheme: { primary: '#D4890A', secondary: '#FFF8F0' } },
          }}
        />
      </body>
    </html>
  );
}
