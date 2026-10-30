'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your administrator password');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid administrator password');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Connection failed. Please check network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 bg-pink-500 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-pink-500/30 mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Cambodia Handbag Marketing
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Official Meta Marketing Automation Dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-3 rounded-xl flex items-center space-x-2">
                <span className="font-semibold">Error:</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
              >
                Administrator Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter administrator password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Default local pass: <code className="bg-slate-100 px-1 py-0.5 rounded text-pink-600 font-mono">admin1234</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md shadow-pink-500/20 text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 cursor-pointer transition-all"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Encrypted Meta API Token Storage with Vercel Blob</span>
          </div>
        </div>
      </div>
    </div>
  );
}

