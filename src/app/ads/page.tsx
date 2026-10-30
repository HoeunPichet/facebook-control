'use client';

import React, { useEffect, useState } from 'react';
import {
  Megaphone,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  DollarSign,
  Users,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Info,
  X,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { AdCampaign, AdCampaignObjective } from '@/lib/types';

export default function AdvertisingPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailySpendingLimit, setDailySpendingLimit] = useState<number>(50);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Campaign Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState<AdCampaignObjective>('OUTCOME_MESSAGES');
  const [dailyBudget, setDailyBudget] = useState('10');
  const [targetLocations, setTargetLocations] = useState('Phnom Penh, Siem Reap, Battambang');
  const [targetInterests, setTargetInterests] = useState('Handbag, Fashion accessories, Online shopping');
  const [submitting, setSubmitting] = useState(false);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'launch' | 'resume' | 'budget';
    campaignId: string;
    campaignName: string;
    budget: number;
    confirmed: boolean;
  }>({
    open: false,
    type: 'launch',
    campaignId: '',
    campaignName: '',
    budget: 0,
    confirmed: false,
  });

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ads/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        if (data.dailySpendingLimitUsd) setDailySpendingLimit(data.dailySpendingLimitUsd);
        if (data.selectedAdAccountId) setSelectedAdAccount(data.selectedAdAccountId);
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to load advertising campaigns' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const budgetNum = parseFloat(dailyBudget);

    if (budgetNum > dailySpendingLimit) {
      setNotification({
        type: 'error',
        text: `Daily budget ($${budgetNum}) exceeds your safety spending threshold ($${dailySpendingLimit}/day).`,
      });
      return;
    }

    try {
      setSubmitting(true);
      const locArray = targetLocations.split(',').map((l) => l.trim()).filter(Boolean);
      const intArray = targetInterests.split(',').map((i) => i.trim()).filter(Boolean);

      const res = await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          objective,
          dailyBudgetUsd: budgetNum,
          targetLocations: locArray,
          targetInterests: intArray,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({
          type: 'success',
          text: 'Campaign created in PAUSED state. Administrator confirmation is required before launch.',
        });
        setIsCreateOpen(false);
        setName('');
        setDailyBudget('10');
        loadCampaigns();
      } else {
        setNotification({ type: 'error', text: data.error || 'Failed to create campaign' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Network error while creating campaign' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteConfirmedAction = async () => {
    if (!confirmModal.confirmed) {
      setNotification({ type: 'error', text: 'You must check the confirmation agreement box.' });
      return;
    }

    const { type, campaignId } = confirmModal;

    try {
      let endpoint = '';
      if (type === 'launch') endpoint = `/api/ads/campaigns/${campaignId}/launch`;
      else if (type === 'resume') endpoint = `/api/ads/campaigns/${campaignId}/resume`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminConfirmed: true }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({
          type: 'success',
          text: `Campaign successfully ${type === 'launch' ? 'launched' : 'resumed'} on Meta!`,
        });
        setConfirmModal((prev) => ({ ...prev, open: false }));
        loadCampaigns();
      } else {
        setNotification({ type: 'error', text: data.error || 'Action failed' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to process request' });
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/ads/campaigns/${campaignId}/pause`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: 'Campaign paused successfully.' });
        loadCampaigns();
      } else {
        setNotification({ type: 'error', text: data.error || 'Failed to pause campaign' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Error pausing campaign' });
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const res = await fetch(`/api/ads/campaigns/${campaignId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ type: 'success', text: 'Campaign deleted.' });
        loadCampaigns();
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to delete campaign' });
    }
  };

  const totalActiveBudget = campaigns
    .filter((c) => c.status === 'ACTIVE')
    .reduce((sum, c) => sum + c.dailyBudgetUsd, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facebook Advertising</h1>
          <p className="text-sm text-slate-500">
            Official Meta Marketing API integration for Cambodia handbag sales, Messenger conversations, and traffic.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-pink-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Handbag Campaign</span>
        </button>
      </div>

      {/* Notifications */}
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

      {/* Safety Spending Guardrail Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Safety Limit</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">${dailySpendingLimit}.00 USD/day</h3>
            <p className="text-[11px] text-slate-500">Configured hard ceiling</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Daily Allocation</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">${totalActiveBudget}.00 USD</h3>
            <p className="text-[11px] text-slate-500">Across {campaigns.filter((c) => c.status === 'ACTIVE').length} active campaigns</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Meta Ad Account</p>
            <h3 className="text-sm font-bold text-slate-800 truncate max-w-[180px] mt-0.5">
              {selectedAdAccount || 'None Selected'}
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">Cambodia Targeting Ready</p>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Advertising Campaigns ({campaigns.length})
            </h3>
            <p className="text-xs text-slate-500">
              Meta campaigns configured for handbag online store operations.
            </p>
          </div>
          <button
            onClick={loadCampaigns}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pink-500 mb-2" />
            <p className="text-xs">Loading Meta campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-12 text-center">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No campaigns created</h4>
            <p className="text-xs text-slate-400 mt-1">
              Click &quot;Create Handbag Campaign&quot; above to setup targeted Messenger or Traffic ads for Cambodia.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 mt-2">
            {campaigns.map((camp) => {
              const isActive = camp.status === 'ACTIVE';

              return (
                <div key={camp.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {camp.status}
                      </span>

                      <span className="text-xs font-bold text-slate-900">{camp.name}</span>

                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        {camp.objective}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="font-semibold text-slate-700">
                        Budget: ${camp.dailyBudgetUsd}/day
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                        {camp.targetLocations.join(', ')}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center">
                        <Users className="w-3 h-3 mr-1 text-slate-400" />
                        Age {camp.ageMin}-{camp.ageMax} (Women)
                      </span>
                    </div>

                    {camp.metaCampaignId && (
                      <p className="text-[11px] text-slate-400 font-mono">
                        Meta Campaign ID: {camp.metaCampaignId}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {isActive ? (
                      <button
                        onClick={() => handlePauseCampaign(camp.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            type: camp.adminConfirmed ? 'resume' : 'launch',
                            campaignId: camp.id,
                            campaignName: camp.name,
                            budget: camp.dailyBudgetUsd,
                            confirmed: false,
                          })
                        }
                        className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-xs transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{camp.adminConfirmed ? 'Resume' : 'Launch Live'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete campaign"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-5 h-5 text-pink-600" />
                <h3 className="text-base font-bold text-slate-900">Create Handbag Campaign</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cambodian Luxury Handbag Messenger Drop"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meta Objective</label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as AdCampaignObjective)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-pink-500"
                >
                  <option value="OUTCOME_MESSAGES">OUTCOME_MESSAGES (Recommended for Cambodia: Chat to buy)</option>
                  <option value="OUTCOME_TRAFFIC">OUTCOME_TRAFFIC (Drive link clicks)</option>
                  <option value="OUTCOME_ENGAGEMENT">OUTCOME_ENGAGEMENT (Post likes, shares & comments)</option>
                  <option value="OUTCOME_SALES">OUTCOME_SALES (Catalog & Pixel conversions)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">Daily Budget (USD $)</label>
                  <span className="text-[11px] text-slate-400">Safety Cap: ${dailySpendingLimit}/day</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={dailySpendingLimit}
                  required
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none"
                />
              </div>

              <div className="bg-pink-50/50 p-3.5 rounded-xl border border-pink-100 space-y-3">
                <span className="text-xs font-bold text-pink-900 block">Cambodia Target Audience Preset</span>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-semibold">Cities / Provinces</label>
                  <input
                    type="text"
                    value={targetLocations}
                    onChange={(e) => setTargetLocations(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-pink-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-semibold">Interest Keywords</label>
                  <input
                    type="text"
                    value={targetInterests}
                    onChange={(e) => setTargetInterests(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-pink-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Campaign (PAUSED)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Administrator Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-pink-500 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <Lock className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                Administrator Approval Required
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to <strong>{confirmModal.type.toUpperCase()}</strong> the Meta advertising campaign &quot;{confirmModal.campaignName}&quot; with an active daily budget of <strong>${confirmModal.budget}.00 USD/day</strong>.
            </p>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs">
              <span className="font-bold block mb-1">Safety Notice:</span>
              Live campaigns incur charges directly on your connected Meta billing account. Meta API policies strictly forbid automatic budget increases without explicit approval.
            </div>

            <label className="flex items-start space-x-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmModal.confirmed}
                onChange={(e) => setConfirmModal((prev) => ({ ...prev, confirmed: e.target.checked }))}
                className="mt-0.5 rounded text-pink-600 focus:ring-pink-500"
              />
              <span className="text-xs text-slate-700 font-medium select-none">
                I explicitly authorize this campaign launch and approve daily spending of ${confirmModal.budget}.00 USD.
              </span>
            </label>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmModal.confirmed}
                onClick={handleExecuteConfirmedAction}
                className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-600/20 transition cursor-pointer disabled:opacity-50"
              >
                Confirm &amp; Execute on Meta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

