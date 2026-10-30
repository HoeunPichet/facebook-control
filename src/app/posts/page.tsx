'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  FileEdit,
  Plus,
  Image as ImageIcon,
  Send,
  Calendar,
  Trash2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  MessageCircle,
  Share2,
  Sparkles,
  DollarSign,
  Tag,
  Globe,
  UploadCloud,
  X,
} from 'lucide-react';
import { Post, PostStatus } from '@/lib/types';

const KHMER_PRESETS = [
  {
    title: 'New Arrival (ម៉ូតថ្មី)',
    text: '✨ ម៉ូតថ្មីទើបតែមកដល់ក្តៅៗ! កាបូបយួរដៃម៉ាកប្រណិត ស្បែកទន់ស្អាត ធន់នឹងការប្រើប្រាស់ ស័ក្តិសមគ្រប់កាលៈទេសៈ។\n📦 មានស្តុកស្រាប់ ដឹកជញ្ជូនរហ័សទូទាំងប្រទេសកម្ពុជា!',
  },
  {
    title: 'Special Promotion (ប្រូម៉ូសិន)',
    text: '🔥 ប្រូម៉ូសិនពិសេសប្រចាំខែ! បញ្ចុះតម្លៃពិសេស និងថែមជូនកាដូអនុស្សាវរីយ៍យ៉ាងស្រស់ស្អាតភ្លាមៗ។\n🚚 ដឹកជញ្ជូនឥតគិតថ្លៃសម្រាប់អតិថិជននៅរាជធានីភ្នំពេញ!',
  },
  {
    title: 'Premium Quality (គុណភាពខ្ពស់)',
    text: '💎 កាបូបម៉ូដទាន់សម័យ គុណភាពកម្រិត Premium រចនាម៉ូដយ៉ាងប្រណិត ធានាគុណភាពពេញចិត្ត ១០០%។\n📲 ផ្ញើសារមកកាន់ផេកឥឡូវនេះ ដើម្បីកុម្ម៉ង់ទិញ!',
  },
];

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [counts, setCounts] = useState({ all: 0, published: 0, scheduled: 0, draft: 0, failed: 0 });

  // Creation Form State
  const [isCreating, setIsCreating] = useState(false);
  const [captionKhmer, setCaptionKhmer] = useState('');
  const [captionEnglish, setCaptionEnglish] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [priceKhr, setPriceKhr] = useState('');
  const [tags, setTags] = useState('handbag, luxury, cambodia, fashion');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageInfo, setPageInfo] = useState<{ name: string; profilePictureUrl?: string } | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to load posts' });
    } finally {
      setLoading(false);
    }
  };

  const loadPageInfo = async () => {
    try {
      const res = await fetch('/api/facebook/account');
      if (res.ok) {
        const data = await res.json();
        if (data.account?.pages) {
          const selected = data.account.pages.find((p: any) => p.id === data.account.selectedPageId) || data.account.pages[0];
          if (selected) {
            setPageInfo({ name: selected.name, profilePictureUrl: selected.profilePictureUrl });
          }
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadPosts();
    loadPageInfo();
  }, [statusFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUploadedImages((prev) => [...prev, ...data.urls]);
        setNotification({ type: 'success', text: `Uploaded ${data.urls.length} handbag image(s) to Vercel Blob.` });
      } else {
        setNotification({ type: 'error', text: data.error || 'Upload failed' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Error uploading image' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async (publishNow = false) => {
    if (!captionKhmer && !captionEnglish && uploadedImages.length === 0) {
      setNotification({ type: 'error', text: 'Please provide at least a caption or one product photo' });
      return;
    }

    try {
      setSubmitting(true);
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captionKhmer,
          captionEnglish,
          imageUrls: uploadedImages,
          productPriceUsd: priceUsd ? parseFloat(priceUsd) : undefined,
          productPriceKhr: priceKhr ? parseInt(priceKhr, 10) : undefined,
          tags: tagArray,
          publishNow,
          status: publishNow ? 'publishing' : 'draft',
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setNotification({
          type: 'success',
          text: publishNow
            ? 'Post successfully published directly to your Facebook Page!'
            : 'Post draft saved to Vercel Blob storage.',
        });
        setIsCreating(false);
        // reset form
        setCaptionKhmer('');
        setCaptionEnglish('');
        setPriceUsd('');
        setPriceKhr('');
        setUploadedImages([]);
        loadPosts();
      } else {
        setNotification({ type: 'error', text: data.error || 'Failed to save or publish post' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Network error while creating post' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishExisting = async (postId: string) => {
    if (!confirm('Publish this post to your official Facebook Page now?')) return;

    try {
      const res = await fetch('/api/posts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: 'Post successfully published to Facebook!' });
        loadPosts();
      } else {
        setNotification({ type: 'error', text: data.error || 'Failed to publish post' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Error publishing post' });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ type: 'success', text: 'Post deleted successfully.' });
        loadPosts();
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to delete post' });
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.captionKhmer.toLowerCase().includes(q) ||
      p.captionEnglish.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Post Management</h1>
          <p className="text-sm text-slate-500">
            Create, preview, and publish luxury handbag posts with dual Khmer & English captions directly to your Facebook Page.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-pink-600/20 transition cursor-pointer"
        >
          {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isCreating ? 'Close Creator' : 'Create New Post'}</span>
        </button>
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
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="cursor-pointer text-slate-400">
            &times;
          </button>
        </div>
      )}

      {/* Post Creator Studio (Expandable) */}
      {isCreating && (
        <div className="bg-white rounded-2xl p-6 border-2 border-pink-200 shadow-md">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Handbag Post Studio</h3>
                <p className="text-xs text-slate-500">Dual language compose with real-time Facebook feed simulator</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
              Publishing to: {pageInfo?.name || 'Active Facebook Page'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 7 cols: Editor Form */}
            <div className="lg:col-span-7 space-y-5">
              {/* Khmer Presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Khmer Caption Presets</label>
                  <span className="text-[11px] text-pink-600 font-medium">Click to populate</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {KHMER_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCaptionKhmer(preset.text)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-pink-100 hover:text-pink-800 rounded-lg text-slate-700 transition cursor-pointer"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Khmer Caption */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  អត្ថបទជាភាសាខ្មែរ (Khmer Caption)
                </label>
                <textarea
                  rows={4}
                  value={captionKhmer}
                  onChange={(e) => setCaptionKhmer(e.target.value)}
                  placeholder="សរសេរព័ត៌មានលម្អិតអំពីកាបូប គុណភាព ពណ៌ និងសេវាកម្មដឹកជញ្ជូន..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none transition"
                />
              </div>

              {/* English Caption */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  English Caption (Optional)
                </label>
                <textarea
                  rows={3}
                  value={captionEnglish}
                  onChange={(e) => setCaptionEnglish(e.target.value)}
                  placeholder="Elegant handbag for casual & formal luxury styling. Order via Messenger..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none transition"
                />
              </div>

              {/* Price & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (USD $)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="45.00"
                      value={priceUsd}
                      onChange={(e) => {
                        setPriceUsd(e.target.value);
                        if (e.target.value) {
                          setPriceKhr(String(Math.round(parseFloat(e.target.value) * 4100)));
                        }
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (KHR ៛)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">៛</span>
                    <input
                      type="number"
                      placeholder="184,500"
                      value={priceKhr}
                      onChange={(e) => setPriceKhr(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hashtags</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="bag, handbag, phnompenh"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
              </div>

              {/* Handbag Images Uploader */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Handbag Product Images (Multi-upload to Vercel Blob)
                </label>

                <div className="flex flex-wrap gap-3">
                  {uploadedImages.map((url, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden group">
                      <img src={url} alt={`Product ${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white p-1 rounded-full opacity-90 transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <label className="w-24 h-24 rounded-xl border-2 border-dashed border-pink-300 hover:border-pink-500 bg-pink-50/40 hover:bg-pink-50 flex flex-col items-center justify-center text-pink-600 transition cursor-pointer">
                    {isUploading ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <UploadCloud className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold">Add Photo</span>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Images are stored persistently in Vercel Blob and attached automatically to Facebook Page posts.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleCreatePost(false)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleCreatePost(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-pink-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{submitting ? 'Publishing to Meta...' : 'Publish to Facebook Now'}</span>
                </button>
              </div>
            </div>

            {/* Right 5 cols: Live Facebook Mockup */}
            <div className="lg:col-span-5">
              <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>Facebook Feed Live Preview</span>
                </p>

                {/* Simulated Facebook Card */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
                  {/* Card Header */}
                  <div className="p-3.5 flex items-center space-x-2.5">
                    {pageInfo?.profilePictureUrl ? (
                      <img
                        src={pageInfo.profilePictureUrl}
                        alt="Page"
                        className="w-10 h-10 rounded-full object-cover border border-slate-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-xs">
                        {pageInfo?.name?.substring(0, 1) || 'H'}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {pageInfo?.name || 'Cambodia Luxury Handbags'}
                      </h4>
                      <p className="text-[10px] text-slate-400 flex items-center">
                        Just now &bull; <Globe className="w-2.5 h-2.5 ml-1 text-slate-400" />
                      </p>
                    </div>
                  </div>

                  {/* Card Captions */}
                  <div className="px-3.5 pb-3 space-y-2 text-xs text-slate-800">
                    {captionKhmer && <p className="whitespace-pre-line leading-relaxed">{captionKhmer}</p>}
                    {captionEnglish && <p className="whitespace-pre-line text-slate-600 italic">{captionEnglish}</p>}
                    {priceUsd && (
                      <p className="font-bold text-pink-600">
                        💰 Price: ${priceUsd} {priceKhr ? `(${parseInt(priceKhr).toLocaleString()} ៛)` : ''}
                      </p>
                    )}
                    {!captionKhmer && !captionEnglish && (
                      <p className="text-slate-400 italic">Captions will appear here as you type...</p>
                    )}
                  </div>

                  {/* Image Grid Simulator */}
                  {uploadedImages.length > 0 ? (
                    <div className="bg-slate-900">
                      {uploadedImages.length === 1 ? (
                        <img src={uploadedImages[0]} alt="Post" className="w-full max-h-72 object-cover" />
                      ) : (
                        <div className="grid grid-cols-2 gap-0.5 max-h-72 overflow-hidden">
                          {uploadedImages.slice(0, 4).map((img, i) => (
                            <img key={i} src={img} alt={`Preview ${i}`} className="w-full h-36 object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border-y border-slate-100 py-12 text-center text-slate-400">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <span className="text-[11px]">Upload photos to preview image gallery</span>
                    </div>
                  )}

                  {/* Feed Reactions & Actions */}
                  <div className="p-3 border-t border-slate-100 flex items-center justify-around text-slate-500 text-xs font-semibold">
                    <span className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer">
                      <ThumbsUp className="w-4 h-4" />
                      <span>Like</span>
                    </span>
                    <span className="flex items-center space-x-1 hover:text-slate-700 cursor-pointer">
                      <MessageCircle className="w-4 h-4" />
                      <span>Comment</span>
                    </span>
                    <span className="flex items-center space-x-1 hover:text-slate-700 cursor-pointer">
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts Table & Filters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: 'all', label: 'All Posts', count: counts.all },
              { key: 'published', label: 'Published', count: counts.published },
              { key: 'scheduled', label: 'Scheduled', count: counts.scheduled },
              { key: 'draft', label: 'Drafts', count: counts.draft },
              { key: 'failed', label: 'Failed', count: counts.failed },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                  statusFilter === tab.key
                    ? 'bg-pink-50 text-pink-700 border border-pink-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white border border-slate-200 text-slate-500">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-500 w-48"
            />
            <button
              onClick={loadPosts}
              title="Refresh posts"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pink-500 mb-2" />
            <p className="text-xs">Loading posts from Vercel Blob...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-12 text-center">
            <FileEdit className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No posts found</h4>
            <p className="text-xs text-slate-400 mt-1">
              Create your first luxury handbag post or switch filter tabs.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 mt-2">
            {filteredPosts.map((post) => {
              const statusColors: Record<PostStatus, string> = {
                published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
                draft: 'bg-slate-100 text-slate-700 border-slate-200',
                publishing: 'bg-amber-100 text-amber-800 border-amber-200',
                failed: 'bg-rose-100 text-rose-800 border-rose-200',
                cancelled: 'bg-zinc-100 text-zinc-600 border-zinc-200',
              };

              return (
                <div key={post.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    {post.imageUrls && post.imageUrls.length > 0 ? (
                      <img
                        src={post.imageUrls[0]}
                        alt="Product"
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            statusColors[post.status]
                          }`}
                        >
                          {post.status}
                        </span>
                        {post.productPriceUsd && (
                          <span className="text-xs font-bold text-pink-600">
                            ${post.productPriceUsd} {post.productPriceKhr ? `(${post.productPriceKhr.toLocaleString()}៛)` : ''}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 font-medium line-clamp-2 max-w-xl">
                        {post.captionKhmer || post.captionEnglish || '(No caption)'}
                      </p>

                      {post.lastError && (
                        <p className="text-[11px] text-rose-600 font-medium">
                          Error: {post.lastError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
                    {post.facebookPermalink && (
                      <a
                        href={post.facebookPermalink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition"
                      >
                        <span>View on Facebook</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {(post.status === 'draft' || post.status === 'failed') && (
                      <button
                        onClick={() => handlePublishExisting(post.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-xs transition cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Publish Now</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete post"
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
    </div>
  );
}

