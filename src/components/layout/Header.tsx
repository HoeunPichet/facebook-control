'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Globe, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { FacebookAccount } from '@/lib/types';

export function Header() {
  const router = useRouter();
  const [account, setAccount] = useState<FacebookAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  const loadAccount = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/facebook/account');
      if (res.ok) {
        const data = await res.json();
        setAccount(data.account || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccount();

    const updateClock = () => {
      const phnomPenhTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Phnom_Penh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date());
      setCurrentTime(phnomPenhTime);
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const handleSelectPage = async (pageId: string) => {
    try {
      await fetch('/api/facebook/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPageId: pageId }),
      });
      loadAccount();
    } catch (err) {
      console.error('Failed to change page', err);
    }
  };

  const selectedPage = account?.pages.find((p) => p.id === account.selectedPageId) || account?.pages[0];

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Connected Page Status & Switcher */}
      <div className="flex items-center space-x-3">
        {selectedPage ? (
          <div className="flex items-center space-x-3 bg-pink-50/70 border border-pink-100 rounded-xl px-3 py-1.5">
            {selectedPage.profilePictureUrl ? (
              <img
                src={selectedPage.profilePictureUrl}
                alt={selectedPage.name}
                className="w-7 h-7 rounded-full object-cover border border-pink-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold">
                {selectedPage.name.substring(0, 1)}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-800 text-xs truncate max-w-[180px]">
                  {selectedPage.name}
                </span>
                <span className="inline-flex items-center text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.2 rounded-full">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                  Active
                </span>
              </div>
            </div>

            {account?.pages && account.pages.length > 1 && (
              <select
                aria-label="Select Facebook Page"
                value={account.selectedPageId || ''}
                onChange={(e) => handleSelectPage(e.target.value)}
                className="ml-2 text-xs bg-white border border-pink-200 rounded-lg px-2 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-pink-500 cursor-pointer"
              >
                {account.pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <a
            href="/accounts"
            className="flex items-center space-x-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-xl px-3 py-1.5 hover:bg-amber-100 transition-colors"
          >
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="font-medium">No Facebook Page Connected — Click to Connect</span>
          </a>
        )}
      </div>

      {/* Right: Phnom Penh Clock & Administrator Actions */}
      <div className="flex items-center space-x-4">
        {/* Real-time Clock */}
        <div className="hidden sm:flex items-center space-x-2 bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-1.5 text-xs text-slate-600">
          <Globe className="w-3.5 h-3.5 text-pink-500" />
          <span className="font-mono font-medium">{currentTime || 'Asia/Phnom_Penh'}</span>
        </div>

        {/* Administrator Indicator */}
        <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            A
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">Admin</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Handbag Store Owner</p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

