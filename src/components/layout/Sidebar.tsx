'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users2,
  FileEdit,
  CalendarClock,
  Megaphone,
  Share2,
  BarChart3,
  ScrollText,
  Settings,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Facebook Accounts', href: '/accounts', icon: Users2 },
  { label: 'Posts', href: '/posts', icon: FileEdit },
  { label: 'Post Scheduler', href: '/scheduler', icon: CalendarClock },
  { label: 'Advertising', href: '/ads', icon: Megaphone },
  { label: 'Group Management', href: '/groups', icon: Share2 },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Activity Logs', href: '/logs', icon: ScrollText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen sticky top-0 shrink-0 z-30 shadow-xs">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 leading-tight text-base">
            Handbag Studio
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Meta Automation
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-pink-50 text-pink-700 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? 'text-pink-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/50">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-700">Cambodia Time</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            UTC+7
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Asia/Phnom_Penh
        </p>
      </div>
    </aside>
  );
}

