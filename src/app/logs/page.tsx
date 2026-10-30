'use client';

import React, { useEffect, useState } from 'react';
import {
  ScrollText,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  KeyRound,
} from 'lucide-react';
import { ActivityLog } from '@/lib/types';

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/logs?category=${categoryFilter}&status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [categoryFilter, statusFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Activity &amp; Audit Logs</h1>
          <p className="text-sm text-slate-500">
            Immutable audit record of OAuth operations, post publishing, scheduler jobs, and campaign budget modifications.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-xs cursor-pointer transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Security Privacy Notice */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 border border-pink-100 flex items-center justify-between text-xs text-slate-700">
        <div className="flex items-center space-x-2">
          <KeyRound className="w-4 h-4 text-pink-600 shrink-0" />
          <span>
            <strong>Zero Secret Exposure:</strong> Meta access tokens, secrets, and authorization keys are automatically scrubbed before any entry is written to Vercel Blob logs.
          </span>
        </div>
        <span className="hidden md:inline-flex items-center text-[10px] bg-white border border-pink-200 text-pink-700 font-bold px-2 py-0.5 rounded-full">
          Audit Compliant
        </span>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs font-semibold pb-1 md:pb-0">
          {[
            { key: 'all', label: 'All Categories' },
            { key: 'auth', label: 'OAuth & Auth' },
            { key: 'posts', label: 'Posts' },
            { key: 'cron', label: 'Cron Worker' },
            { key: 'ads', label: 'Advertising' },
            { key: 'groups', label: 'Groups' },
            { key: 'settings', label: 'Settings' },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(c.key)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                categoryFilter === c.key
                  ? 'bg-pink-50 text-pink-700 border border-pink-200 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full sm:w-64 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pink-500 mb-2" />
            <p className="text-xs">Loading activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ScrollText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs">No activity records match your filter criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const statusColors = {
                success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                warning: 'bg-amber-50 text-amber-700 border-amber-200',
                error: 'bg-rose-50 text-rose-700 border-rose-200',
                info: 'bg-blue-50 text-blue-700 border-blue-200',
              };

              return (
                <div key={log.id} className="p-4 hover:bg-slate-50/60 transition-colors flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          statusColors[log.status]
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="font-mono font-bold text-slate-900">{log.action}</span>
                      <span className="text-[11px] text-slate-400 font-mono">[{log.category}]</span>
                      <span className="text-[11px] text-slate-500">&bull; Actor: {log.actor}</span>
                    </div>

                    <p className="text-slate-700 leading-relaxed font-normal">{log.details}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-slate-400 font-mono block">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono font-semibold block">
                      {new Date(log.timestamp).toLocaleTimeString('en-GB', { timeZone: 'Asia/Phnom_Penh' })} (KH)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

