'use client';

import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  Play,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  Trash2,
  Send,
  Globe,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Post } from '@/lib/types';

export default function SchedulerPage() {
  const [scheduledPosts, setScheduledPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCron, setRunningCron] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Schedule Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [captionKhmer, setCaptionKhmer] = useState('');
  const [captionEnglish, setCaptionEnglish] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('18:00'); // Default 6 PM peak Cambodia shopping time
  const [priceUsd, setPriceUsd] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadScheduledPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/posts?status=scheduled');
      if (res.ok) {
        const data = await res.json();
        setScheduledPosts(data.posts || []);
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to load scheduled queue' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set default tomorrow date in Asia/Phnom_Penh
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setScheduleDate(dateStr);

    loadScheduledPosts();
  }, []);

  const handleRunCronWorker = async () => {
    try {
      setRunningCron(true);
      setCronResult(null);
      const res = await fetch('/api/cron/process-tasks');
      const data = await res.json();
      setCronResult(data);

      if (res.ok && data.success) {
        setNotification({
          type: 'success',
          text: `Worker completed! Processed: ${data.results?.dueCount || 0}, Published: ${data.results?.succeeded || 0}`,
        });
        loadScheduledPosts();
      } else {
        setNotification({ type: 'error', text: data.error || 'Worker run failed' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to execute cron worker' });
    } finally {
      setRunningCron(false);
    }
  };

  const handleCancelPost = async (postId: string) => {
    if (!confirm('Cancel this scheduled post? It will be moved back to drafts.')) return;

    try {
      const res = await fetch(`/api/posts/${postId}/cancel`, { method: 'POST' });
      if (res.ok) {
        setNotification({ type: 'success', text: 'Scheduled task cancelled and moved to drafts.' });
        loadScheduledPosts();
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to cancel scheduled post' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadedImages((prev) => [...prev, ...data.urls]);
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to upload photo' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDate || !scheduleTime) {
      setNotification({ type: 'error', text: 'Please pick a valid publishing date and time.' });
      return;
    }

    try {
      setSubmitting(true);
      // Combine date and time in Phnom Penh timezone (+07:00)
      const combinedIso = `${scheduleDate}T${scheduleTime}:00+07:00`;

      const res = await fetch('/api/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captionKhmer,
          captionEnglish,
          imageUrls: uploadedImages,
          scheduledPublishTime: combinedIso,
          productPriceUsd: priceUsd ? parseFloat(priceUsd) : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: 'Handbag post successfully scheduled!' });
        setIsModalOpen(false);
        setCaptionKhmer('');
        setCaptionEnglish('');
        setUploadedImages([]);
        loadScheduledPosts();
      } else {
        setNotification({ type: 'error', text: data.error || 'Failed to schedule post' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Network error while scheduling post' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Post Scheduler</h1>
          <p className="text-sm text-slate-500">
            Queue handbag promotions for automatic publication via Vercel Cron in Cambodia time (Asia/Phnom_Penh).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunCronWorker}
            disabled={runningCron}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {runningCron ? (
              <RefreshCw className="w-4 h-4 animate-spin text-pink-600" />
            ) : (
              <Play className="w-4 h-4 text-emerald-600 fill-current" />
            )}
            <span>{runningCron ? 'Processing Tasks...' : 'Run Worker Now'}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-pink-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Post</span>
          </button>
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

      {/* Cron Result Diagnostics Banner */}
      {cronResult && (
        <div className="p-4 rounded-xl bg-slate-900 text-white text-xs font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>Cron Execution Response</span>
            <span>{cronResult.timestamp}</span>
          </div>
          <p className="text-emerald-400">
            Status: {cronResult.message || `Processed ${cronResult.results?.dueCount || 0} tasks`}
          </p>
          {cronResult.results?.details?.map((d: any, idx: number) => (
            <p key={idx} className="text-slate-300">
              &bull; Task {d.id}: {d.status} ({d.message})
            </p>
          ))}
        </div>
      )}

      {/* Cron Architecture Banner */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-5 border border-pink-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Vercel Cron Automation Engine (Asia/Phnom_Penh UTC+7)
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Vercel Cron triggers <code className="bg-white/80 px-1 py-0.5 rounded text-pink-700 font-mono">/api/cron/process-tasks</code> automatically every 10 minutes. Tasks are validated with idempotency keys, safe concurrency locks, and 3-stage exponential retry recovery.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-white/80 px-3 py-1.5 rounded-xl border border-pink-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Duplicate Publishing Protection Active</span>
        </div>
      </div>

      {/* Scheduled Queue */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Pending Scheduled Queue ({scheduledPosts.length})
            </h3>
            <p className="text-xs text-slate-500">
              Posts waiting to be published automatically at their assigned Cambodian time.
            </p>
          </div>
          <button
            onClick={loadScheduledPosts}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pink-500 mb-2" />
            <p className="text-xs">Loading scheduled task queue...</p>
          </div>
        ) : scheduledPosts.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No scheduled posts queued</h4>
            <p className="text-xs text-slate-400 mt-1">
              Click &quot;Schedule Post&quot; above to plan your upcoming handbag releases.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 mt-2">
            {scheduledPosts.map((post) => {
              const targetDate = post.scheduledPublishTime ? new Date(post.scheduledPublishTime) : null;
              const formattedTime = targetDate
                ? targetDate.toLocaleString('en-GB', {
                    timeZone: 'Asia/Phnom_Penh',
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Unknown';

              const isPastDue = targetDate ? targetDate.getTime() <= Date.now() : false;

              return (
                <div key={post.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    {post.imageUrls && post.imageUrls.length > 0 ? (
                      <img
                        src={post.imageUrls[0]}
                        alt="Product"
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                        <Clock className="w-6 h-6" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isPastDue
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}
                        >
                          {isPastDue ? 'Due Next Cron Check' : 'Scheduled'}
                        </span>

                        <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                          <Globe className="w-3 h-3 text-pink-500" />
                          <span>{formattedTime} (Phnom Penh)</span>
                        </span>

                        {post.retryCount > 0 && (
                          <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded font-mono">
                            Retry: {post.retryCount}/{post.maxRetries}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 font-medium line-clamp-2 max-w-xl">
                        {post.captionKhmer || post.captionEnglish || '(No caption)'}
                      </p>

                      {post.lastError && (
                        <p className="text-[11px] text-rose-600 font-medium">
                          Last Error: {post.lastError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => handleCancelPost(post.id)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel Schedule</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CalendarClock className="w-5 h-5 text-pink-600" />
                <h3 className="text-base font-bold text-slate-900">Schedule Facebook Handbag Post</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              {/* Date & Time Selectors */}
              <div className="grid grid-cols-2 gap-3 bg-pink-50/50 p-3.5 rounded-xl border border-pink-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Publish Date
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-pink-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Cambodia Time (UTC+7)
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-pink-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Captions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khmer Caption</label>
                <textarea
                  rows={3}
                  value={captionKhmer}
                  onChange={(e) => setCaptionKhmer(e.target.value)}
                  placeholder="សរសេរព័ត៌មានអំពីកាបូប... ✨"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">English Caption (Optional)</label>
                <textarea
                  rows={2}
                  value={captionEnglish}
                  onChange={(e) => setCaptionEnglish(e.target.value)}
                  placeholder="New handbag collection..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price (USD $)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="39.99"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Images</label>
                <div className="flex flex-wrap gap-2">
                  {uploadedImages.map((url, i) => (
                    <img key={i} src={url} alt="Uploaded" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                  ))}
                  <label className="w-14 h-14 rounded-lg border-2 border-dashed border-pink-300 hover:border-pink-500 bg-pink-50/50 flex items-center justify-center text-pink-600 transition cursor-pointer">
                    {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

