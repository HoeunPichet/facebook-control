'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [theme, setTheme] = useState('pink');

  useEffect(() => {
    // Fetch theme preference from app settings
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.themeColor) {
          setTheme(data.settings.themeColor);
          document.documentElement.setAttribute('data-theme', data.settings.themeColor);
        }
      })
      .catch(() => {});
  }, []);

  if (isLoginPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50/60" data-theme={theme}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

