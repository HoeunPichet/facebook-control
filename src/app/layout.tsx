import type { Metadata } from 'next';
import './globals.css';
import { DashboardShell } from '@/components/layout/DashboardShell';

export const metadata: Metadata = {
  title: 'Facebook Marketing Automation | Cambodia Handbag Studio',
  description: 'Enterprise Meta Graph & Marketing API Automation System with Vercel Blob Storage',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 font-sans">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
