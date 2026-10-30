'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Layers,
  KeyRound,
  ExternalLink,
  Info,
  Check,
  X,
  Megaphone,
} from 'lucide-react';

function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

interface SanitizedAccount {
  userId: string;
  userName: string;
  userEmail?: string;
  profilePictureUrl?: string;
  isConnected: boolean;
  isTokenExpired: boolean;
  tokenExpiresAt?: string;
  lastConnectedAt: string;
  grantedPermissions: string[];
  selectedPageId?: string;
  selectedAdAccountId?: string;
  pages: Array<{
    id: string;
    name: string;
    category?: string;
    profilePictureUrl?: string;
    isConnected: boolean;
    tasks: string[];
  }>;
  adAccounts: Array<{
    id: string;
    accountId: string;
    name: string;
    currency: string;
    accountStatus: number;
  }>;
}

const REQUIRED_PERMISSIONS = [
  { key: 'pages_show_list', label: 'View Pages List', desc: 'Allows discovering Facebook pages you manage' },
  { key: 'pages_manage_posts', label: 'Manage & Publish Posts', desc: 'Required to create, schedule and publish feed posts' },
  { key: 'pages_read_engagement', label: 'Read Engagement', desc: 'Required for post metrics and comments' },
  { key: 'ads_management', label: 'Ads Management', desc: 'Required to create and manage campaigns in Cambodia' },
  { key: 'ads_read', label: 'Read Ads & Insights', desc: 'Required for ad spend and performance analytics' },
  { key: 'business_management', label: 'Business Management', desc: 'Access to business assets and handbag ad accounts' },
];

export default function AccountsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-pink-500 mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading Facebook accounts...</p>
        </div>
      }
    >
      <AccountsContent />
    </React.Suspense>
  );
}

function AccountsContent() {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<SanitizedAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingPage, setSavingPage] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAccount = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/facebook/account');
      if (res.ok) {
        const data = await res.json();
        setAccount(data.account);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to fetch Facebook account state' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const successMsg = searchParams.get('success');
    const errorMsg = searchParams.get('error');

    if (successMsg) {
      setMessage({ type: 'success', text: successMsg });
    } else if (errorMsg) {
      setMessage({ type: 'error', text: errorMsg });
    }

    loadAccount();
  }, [searchParams]);

  const handleConnect = () => {
    window.location.href = '/api/facebook/connect';
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this Facebook account? All automated post scheduling and ad tracking will be paused.')) {
      return;
    }

    try {
      setDisconnecting(true);
      const res = await fetch('/api/facebook/disconnect', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccount(null);
        setMessage({ type: 'success', text: 'Facebook account disconnected successfully.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to disconnect account' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error while disconnecting' });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSelectPage = async (pageId: string) => {
    try {
      setSavingPage(pageId);
      const res = await fetch('/api/facebook/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPageId: pageId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccount(data.account);
        setMessage({ type: 'success', text: 'Active Facebook Page updated.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to change active page' });
    } finally {
      setSavingPage(null);
    }
  };

  const handleSelectAdAccount = async (adAccountId: string) => {
    try {
      const res = await fetch('/api/facebook/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedAdAccountId: adAccountId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccount(data.account);
        setMessage({ type: 'success', text: 'Active Ad Account updated.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to change active ad account' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Facebook Account Management
          </h1>
          <p className="text-sm text-slate-500">
            Connect official Meta credentials to authorize Page posting and Marketing API automation for your Cambodia handbag business.
          </p>
        </div>

        <div>
          {account?.isConnected ? (
            <button
              onClick={handleConnect}
              className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-semibold rounded-xl shadow-xs hover:bg-slate-50 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Reconnect / Refresh Permissions</span>
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <FacebookIcon className="w-4 h-4" />
              <span>Connect Facebook Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-pink-500 mb-3" />
          <p className="text-sm text-slate-500 font-medium">Checking Meta connection state...</p>
        </div>
      ) : account && account.isConnected ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Connected Account Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  User Profile
                </span>
                <span className="inline-flex items-center text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                  Connected
                </span>
              </div>

              <div className="mt-4 flex items-center space-x-3">
                {account.profilePictureUrl ? (
                  <img
                    src={account.profilePictureUrl}
                    alt={account.userName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-pink-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                    {account.userName.substring(0, 1)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{account.userName}</h3>
                  {account.userEmail && (
                    <p className="text-xs text-slate-500">{account.userEmail}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    ID: {account.userId}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Connected:</span>
                  <span className="font-medium">
                    {new Date(account.lastConnectedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Token Status:</span>
                  <span className={account.isTokenExpired ? 'text-rose-600 font-bold' : 'text-emerald-600 font-medium'}>
                    {account.isTokenExpired ? 'Expired' : 'Valid (Long-lived)'}
                  </span>
                </div>
                {account.tokenExpiresAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Token Expires:</span>
                    <span className="font-medium text-slate-600">
                      {new Date(account.tokenExpiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{disconnecting ? 'Disconnecting...' : 'Disconnect Account'}</span>
                </button>
              </div>
            </div>

            {/* Security Guarantee Box */}
            <div className="bg-gradient-to-br from-pink-50/70 to-rose-50/40 rounded-2xl p-5 border border-pink-100 text-xs text-slate-600">
              <div className="flex items-center space-x-2 text-pink-700 font-bold mb-2">
                <ShieldCheck className="w-4 h-4 text-pink-600" />
                <span>Zero Password & Encrypted Storage</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Facebook passwords are never requested or stored. Access tokens are encrypted via AES-256-GCM and kept safely in private Vercel Blob storage. Encryption keys reside strictly in server environment variables.
              </p>
            </div>
          </div>

          {/* Column 2 & 3: Pages and Permissions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Facebook Pages Selection */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Accessible Facebook Pages ({account.pages.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select which Facebook Page should be used for handbag marketing, post publishing, and scheduling.
                  </p>
                </div>
              </div>

              {account.pages.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    No Facebook Pages detected. Make sure your user account has administrative or editor access to your store's Facebook Page.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {account.pages.map((page) => {
                    const isSelected = page.id === account.selectedPageId;
                    return (
                      <div
                        key={page.id}
                        onClick={() => handleSelectPage(page.id)}
                        className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start justify-between ${
                          isSelected
                            ? 'border-pink-500 bg-pink-50/40 shadow-xs'
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {page.profilePictureUrl ? (
                            <img
                              src={page.profilePictureUrl}
                              alt={page.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-sm">
                              {page.name.substring(0, 1)}
                            </div>
                          )}
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                              {page.name}
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              {page.category || 'Retail Handbags'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {page.id}
                            </p>
                          </div>
                        </div>

                        <div>
                          {isSelected ? (
                            <span className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-transparent hover:border-slate-300">
                              &bull;
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ad Accounts Selection */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Connected Ad Accounts ({account.adAccounts?.length || 0})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select your Meta Ad Account for handbag campaign budgeting and performance tracking.
                  </p>
                </div>
              </div>

              {(!account.adAccounts || account.adAccounts.length === 0) ? (
                <div className="text-center py-6">
                  <Megaphone className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    No Meta Ad Account found with <code className="bg-slate-100 px-1 py-0.5 rounded text-pink-600 font-mono">ads_management</code> permission.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {account.adAccounts.map((ad) => {
                    const isSelected = ad.id === account.selectedAdAccountId;
                    return (
                      <div
                        key={ad.id}
                        onClick={() => handleSelectAdAccount(ad.id)}
                        className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-pink-500 bg-pink-50/40 shadow-xs'
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{ad.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {ad.id} &bull; Currency: {ad.currency}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Granted Permissions Audit */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-1">
                Permission Validation Checklist
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Meta Graph API operations require specific permissions granted during OAuth login.
              </p>

              <div className="space-y-2.5">
                {REQUIRED_PERMISSIONS.map((perm) => {
                  const isGranted = account.grantedPermissions?.includes(perm.key);
                  return (
                    <div
                      key={perm.key}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100"
                    >
                      <div className="flex items-start space-x-2.5">
                        <div className="mt-0.5">
                          {isGranted ? (
                            <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                              <X className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-800 font-mono">
                            {perm.key}
                          </span>
                          <p className="text-[11px] text-slate-500">{perm.desc}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isGranted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isGranted ? 'GRANTED' : 'MISSING'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Disconnected State / CTA */
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 shadow-xs max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <FacebookIcon className="w-9 h-9" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Connect Your Facebook Business Account
          </h2>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Authorize our system using official Meta OAuth to manage your handbag Facebook Page, schedule product drops, and run targeted Cambodian advertising campaigns.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleConnect}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <FacebookIcon className="w-4 h-4" />
              <span>Connect with Facebook</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-center space-x-4">
            <span className="flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mr-1" />
              AES-256 Token Encryption
            </span>
            <span className="flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mr-1" />
              Official Graph API v21.0
            </span>
            <span className="flex items-center">
              <KeyRound className="w-3.5 h-3.5 text-pink-500 mr-1" />
              No Passwords Stored
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
