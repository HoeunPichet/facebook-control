'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  Users,
  MousePointerClick,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Globe,
} from 'lucide-react';

interface InsightItem {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  messagesCount: number;
  costPerMessage: number;
}

export default function AnalyticsPage() {
  const [datePreset, setDatePreset] = useState<string>('last_30d');
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [totals, setTotals] = useState({ spend: 0, impressions: 0, reach: 0, clicks: 0, messages: 0 });
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ads/insights?datePreset=${datePreset}`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
        if (data.totals) setTotals(data.totals);
        setIsLive(!!data.isLive);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [datePreset]);

  const handleExportCsv = (type: 'campaigns' | 'posts') => {
    setExporting(true);
    window.location.href = `/api/analytics/export?type=${type}`;
    setTimeout(() => setExporting(false), 1500);
  };

  const avgCtr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00';
  const avgCpc = totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : '0.00';
  const avgCpm = totals.impressions > 0 ? ((totals.spend / totals.impressions) * 1000).toFixed(2) : '0.00';
  const avgCostPerMsg = totals.messages > 0 ? (totals.spend / totals.messages).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Advertising Analytics</h1>
          <p className="text-sm text-slate-500">
            Performance metrics, customer reach, click-through rates, and Messenger inquiry costs from Meta Marketing API.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs text-xs font-semibold">
            {[
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'last_7d', label: 'Last 7 Days' },
              { key: 'last_30d', label: 'Last 30 Days' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setDatePreset(p.key)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  datePreset === p.key
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Export Dropdown / Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExportCsv('campaigns')}
              disabled={exporting}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Ads CSV</span>
            </button>

            <button
              onClick={() => handleExportCsv('posts')}
              disabled={exporting}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Posts CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Meta API Live Status Indicator */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-pink-50/70 border border-pink-100 text-xs">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-pink-600" />
          <span className="font-semibold text-pink-900">
            Source: Official Meta Marketing API Insights
          </span>
          <span className="text-pink-600 font-mono">({datePreset})</span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isLive
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isLive ? 'LIVE META FEED' : 'STANDBY CACHE'}
        </span>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Amount Spent</span>
            <DollarSign className="w-4 h-4 text-pink-500" />
          </div>
          <h3 className="text-lg font-black text-slate-900">${totals.spend.toFixed(2)}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">USD</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Impressions</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <h3 className="text-lg font-black text-slate-900">{totals.impressions.toLocaleString()}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Total ad views</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Unique Reach</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-lg font-black text-slate-900">{totals.reach.toLocaleString()}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Unique people</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Clicks & CTR</span>
            <MousePointerClick className="w-4 h-4 text-purple-500" />
          </div>
          <h3 className="text-lg font-black text-slate-900">{totals.clicks.toLocaleString()}</h3>
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">CTR: {avgCtr}%</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">CPC & CPM</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-lg font-black text-slate-900">${avgCpc}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">CPM: ${avgCpm}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Messages</span>
            <MessageSquare className="w-4 h-4 text-pink-600" />
          </div>
          <h3 className="text-lg font-black text-slate-900">{totals.messages}</h3>
          <p className="text-[10px] text-pink-600 font-semibold mt-0.5">
            {totals.messages > 0 ? `$${avgCostPerMsg} / msg` : 'No messages'}
          </p>
        </div>
      </div>

      {/* Visual Performance Chart Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Campaign Metric Distribution</h3>
        <p className="text-xs text-slate-500 mb-6">Visual comparison of handbag campaign engagement metrics</p>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pink-500 mb-2" />
            <p className="text-xs">Fetching insights data...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <BarChart3 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs">No advertising activity recorded for the selected period.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((item, idx) => {
              const maxSpend = Math.max(...insights.map((i) => i.spend), 1);
              const percentage = Math.min(100, Math.round((item.spend / maxSpend) * 100));

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-800">{item.campaignName}</span>
                    <span className="font-mono text-slate-600">
                      ${item.spend.toFixed(2)} USD &bull; {item.impressions.toLocaleString()} Impr &bull; {item.clicks} Clicks
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Campaign Breakdown Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Campaign Performance Breakdown</h3>
            <p className="text-xs text-slate-500">
              Detailed Meta insights metrics per campaign. Distinguishes unavailable metrics from zero values.
            </p>
          </div>
          <button
            onClick={loadInsights}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Campaign Name</th>
                <th className="py-3 px-3">Spend</th>
                <th className="py-3 px-3">Impressions</th>
                <th className="py-3 px-3">Reach</th>
                <th className="py-3 px-3">Clicks</th>
                <th className="py-3 px-3">CTR</th>
                <th className="py-3 px-3">CPC</th>
                <th className="py-3 px-3">Messages</th>
                <th className="py-3 px-3">Cost / Msg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {insights.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    No active campaign data found for this date range.
                  </td>
                </tr>
              ) : (
                insights.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{item.campaignName}</td>
                    <td className="py-3 px-3 font-mono">${item.spend.toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono">{item.impressions.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono">{item.reach.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono">{item.clicks.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono">{item.ctr ? `${item.ctr.toFixed(2)}%` : 'N/A'}</td>
                    <td className="py-3 px-3 font-mono">{item.cpc ? `$${item.cpc.toFixed(2)}` : 'N/A'}</td>
                    <td className="py-3 px-3 font-mono">{item.messagesCount > 0 ? item.messagesCount : '0'}</td>
                    <td className="py-3 px-3 font-mono">
                      {item.costPerMessage > 0 ? `$${item.costPerMessage.toFixed(2)}` : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

