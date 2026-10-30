'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Users2,
  FileCheck2,
  CalendarClock,
  Megaphone,
  DollarSign,
  TrendingUp,
  MousePointerClick,
  MessageSquare,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Clock,
  CheckCircle2,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { DashboardSummary } from '@/lib/types';

export default function OverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('last_30d');

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-pink-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Cambodia Handbag Marketing Automation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Marketing Command Center
          </h1>
          <p className="text-xs sm:text-sm text-pink-100 leading-relaxed">
            Manage your online handbag store on Facebook. Create posts, schedule releases in Cambodia time, and automate Meta Marketing campaigns with persistent Vercel Blob storage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/posts"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white text-pink-700 hover:bg-pink-50 text-xs font-bold rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Post</span>
          </Link>
          <Link
            href="/scheduler"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-pink-700/60 hover:bg-pink-700 text-white text-xs font-bold rounded-xl border border-white/20 transition"
          >
            <CalendarClock className="w-4 h-4" />
            <span>Post Scheduler</span>
          </Link>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center space-x-1 overflow-x-auto text-xs font-semibold">
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'last_7d', label: 'Last 7 Days' },
            { key: 'last_30d', label: 'Last 30 Days' },
            { key: 'custom', label: 'All Time' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setDateRange(item.key)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                dateRange === item.key
                  ? 'bg-pink-50 text-pink-700 border border-pink-200 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span className="font-mono">Timezone: Asia/Phnom_Penh (UTC+7)</span>
          <button
            onClick={loadSummary}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Connected Pages */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Connected Pages</span>
            <Users2 className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {summary ? summary.connectedPagesCount : 0}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              {summary?.selectedPage ? summary.selectedPage.name : 'No Page Connected'}
            </p>
          </div>
        </div>

        {/* Published Posts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Published Posts</span>
            <FileCheck2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {summary ? summary.totalPublishedPosts : 0}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              Active on Facebook feed
            </p>
          </div>
        </div>

        {/* Scheduled Posts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Scheduled Queue</span>
            <CalendarClock className="w-4 h-4 text-pink-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {summary ? summary.scheduledPostsCount : 0}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Automated Vercel Cron tasks
            </p>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Ad Campaigns</span>
            <Megaphone className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {summary ? summary.activeCampaignsCount : 0}
            </h3>
            <p className="text-[11px] text-purple-600 font-medium mt-1">
              Meta Marketing API
            </p>
          </div>
        </div>
      </div>

      {/* Advertising Spend & Performance Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Ad Spend</span>
          <p className="text-lg font-black text-slate-900 mt-1">
            ${summary ? summary.totalAdSpend.toFixed(2) : '0.00'}
          </p>
          <span className="text-[10px] text-slate-400">Active allocation</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Impressions</span>
          <p className="text-lg font-black text-slate-900 mt-1">
            {summary?.totalImpressions ? summary.totalImpressions.toLocaleString() : '0'}
          </p>
          <span className="text-[10px] text-slate-400">Views in Cambodia</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Reach</span>
          <p className="text-lg font-black text-slate-900 mt-1">
            {summary?.totalReach ? summary.totalReach.toLocaleString() : '0'}
          </p>
          <span className="text-[10px] text-slate-400">Unique accounts</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Clicks</span>
          <p className="text-lg font-black text-slate-900 mt-1">
            {summary?.totalClicks ? summary.totalClicks.toLocaleString() : '0'}
          </p>
          <span className="text-[10px] text-slate-400">Engaged visits</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Messenger Leads</span>
          <p className="text-lg font-black text-pink-600 mt-1">
            {summary?.totalMessages ? summary.totalMessages : '0'}
          </p>
          <span className="text-[10px] text-slate-400">Buying inquiries</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cost / Result</span>
          <p className="text-lg font-black text-slate-900 mt-1">
            ${summary?.avgCostPerMessage ? summary.avgCostPerMessage.toFixed(2) : '0.00'}
          </p>
          <span className="text-[10px] text-slate-400">Per conversation</span>
        </div>
      </div>

      {/* Failed Tasks Alert (if any) */}
      {summary?.failedTasks && summary.failedTasks.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Attention: {summary.failedTasks.length} Failed Tasks Detected</span>
          </div>
          <p className="text-xs text-rose-700">
            Some publishing or cron activities failed. Check details below or retry from Post Management.
          </p>
          <div className="divide-y divide-rose-200/60 pt-1">
            {summary.failedTasks.map((task) => (
              <div key={task.id} className="py-2 text-xs flex justify-between items-center text-rose-900">
                <div>
                  <span className="font-bold">{task.type}</span> &bull; {task.description}
                  <p className="text-[11px] text-rose-600 font-mono mt-0.5">{task.error}</p>
                </div>
                <Link
                  href="/posts"
                  className="px-2.5 py-1 bg-white text-rose-700 hover:bg-rose-100 rounded-lg font-semibold border border-rose-300 text-[11px]"
                >
                  Inspect
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Quick Navigation & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Handbag Automation Modules */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Automation Workflows</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/posts"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-pink-300 hover:shadow-md transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Handbag Post Studio</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-pink-600 transition-colors" />
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Compose with dual Khmer &amp; English captions, upload photos to Vercel Blob, and publish immediately to your Facebook Page.
              </p>
            </Link>

            <Link
              href="/scheduler"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-pink-300 hover:shadow-md transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <CalendarClock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Vercel Cron Scheduler</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Schedule promotions aligned with Cambodian evening peak shopping hours (Asia/Phnom_Penh).
              </p>
            </Link>

            <Link
              href="/ads"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-pink-300 hover:shadow-md transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Megaphone className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Meta Marketing API</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Run targeted handbag ads in Phnom Penh, Siem Reap, and Battambang with hard safety budget limits.
              </p>
            </Link>

            <Link
              href="/groups"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-pink-300 hover:shadow-md transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Globe className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Group Sharing Queue</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Meta policy-compliant group directory and 1-click clipboard task queue for Cambodian online shopping clubs.
              </p>
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Recent Activities */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900">Recent Activity Logs</h3>
              <Link href="/logs" className="text-xs text-pink-600 hover:text-pink-700 font-semibold">
                View All
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-pink-500 mb-1" />
                <span className="text-xs">Loading logs...</span>
              </div>
            ) : !summary?.recentActivities || summary.recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">
                No activity logs recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {summary.recentActivities.map((act) => (
                  <div key={act.id} className="text-xs flex items-start space-x-2.5">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        act.status === 'success'
                          ? 'bg-emerald-500'
                          : act.status === 'error'
                          ? 'bg-rose-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div>
                      <p className="text-slate-800 font-semibold leading-tight">{act.action}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{act.details}</p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(act.timestamp).toLocaleTimeString('en-GB', { timeZone: 'Asia/Phnom_Penh' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Storage: Vercel Blob</span>
            <span className="text-emerald-600 font-medium flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Synchronized
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
