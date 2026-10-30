'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  Palette,
  ShieldCheck,
  DollarSign,
  Globe,
  Database,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { AppSettings } from '@/lib/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form fields
  const [themeColor, setThemeColor] = useState('pink');
  const [businessName, setBusinessName] = useState('Cambodia Luxury Handbags');
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [exchangeRate, setExchangeRate] = useState('4100');
  const [dailyLimit, setDailyLimit] = useState('50');
  const [graphVersion, setGraphVersion] = useState('v21.0');
  const [notificationEmail, setNotificationEmail] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const s = data.settings;
        setSettings(s);
        setThemeColor(s.themeColor || 'pink');
        setBusinessName(s.businessName || 'Cambodia Luxury Handbags');
        setCurrency(s.currency || 'USD');
        setExchangeRate(String(s.exchangeRateUsdToKhr || 4100));
        setDailyLimit(String(s.dailySpendingLimitUsd || 50));
        setGraphVersion(s.metaGraphApiVersion || 'v21.0');
        setNotificationEmail(s.notificationEmail || '');
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeColor,
          businessName,
          currency,
          exchangeRateUsdToKhr: parseFloat(exchangeRate) || 4100,
          dailySpendingLimitUsd: parseFloat(dailyLimit) || 50,
          metaGraphApiVersion: graphVersion,
          notificationEmail,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: 'Settings updated successfully!' });
        document.documentElement.setAttribute('data-theme', themeColor);
      } else {
        setNotification({ type: 'error', text: data.error || 'Failed to update settings' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Network error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-sm text-slate-500">
            Configure theme aesthetics, Meta Graph API versions, currency preferences, and daily advertising spending safety limits.
          </p>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="cursor-pointer text-slate-400">
            &times;
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-pink-500 mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading settings from Vercel Blob...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Branding & Appearance */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <Palette className="w-5 h-5 text-pink-600" />
              <h3 className="text-sm font-bold text-slate-900">Branding &amp; Theme Appearance</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Theme Color (Configurable)
                </label>
                <div className="flex items-center space-x-3 pt-1">
                  {[
                    { id: 'pink', label: 'Pink (Default)', colorClass: 'bg-pink-500' },
                    { id: 'rose', label: 'Rose Red', colorClass: 'bg-rose-500' },
                    { id: 'purple', label: 'Purple Luxe', colorClass: 'bg-purple-500' },
                    { id: 'indigo', label: 'Indigo Navy', colorClass: 'bg-indigo-500' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setThemeColor(t.id)}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                        themeColor === t.id
                          ? 'border-slate-800 bg-slate-50 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${t.colorClass}`} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Marketing & Advertising Safety Guardrails */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-pink-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Advertising Safety Limits &amp; Financial Guardrails
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Daily Advertising Safety Limit (USD $)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    min="5"
                    max="1000"
                    required
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hard limit to prevent accidental overspending on Meta Marketing API.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Exchange Rate (USD to KHR)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">៛</span>
                  <input
                    type="number"
                    required
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Used for dual price calculations on handbag posts.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Meta API & Storage Infrastructure */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <Globe className="w-5 h-5 text-pink-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Meta Graph API &amp; Storage Architecture
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta Graph API Version
                </label>
                <select
                  value={graphVersion}
                  onChange={(e) => setGraphVersion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                >
                  <option value="v21.0">v21.0 (Recommended)</option>
                  <option value="v22.0">v22.0</option>
                  <option value="v20.0">v20.0</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Graph API endpoint version used across all Meta API client requests.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Timezone</label>
                <input
                  type="text"
                  disabled
                  value="Asia/Phnom_Penh (UTC+7)"
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Standardized for Cambodian market scheduling.
                </p>
              </div>
            </div>

            {/* Storage Info Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-pink-500" />
                <div>
                  <span className="font-bold text-slate-800">Persistent Storage Engine</span>
                  <p className="text-[11px] text-slate-500">
                    Vercel Blob JSON storage (/config, /posts, /campaigns, /logs) with AES-256-GCM token encryption.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

