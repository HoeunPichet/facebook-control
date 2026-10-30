'use client';

import React, { useEffect, useState } from 'react';
import {
  Share2,
  Plus,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Trash2,
  RefreshCw,
  X,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { GroupItem, GroupSharingTask, Post } from '@/lib/types';

export default function GroupsPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'catalog'>('queue');
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [tasks, setTasks] = useState<GroupSharingTask[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Group Modal
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupUrl, setNewGroupUrl] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Handbag & Fashion');
  const [newGroupMembers, setNewGroupMembers] = useState('');
  const [newGroupRules, setNewGroupRules] = useState('');

  // Queue Task Modal
  const [isQueueTaskOpen, setIsQueueTaskOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsRes, tasksRes, postsRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/groups/queue'),
        fetch('/api/posts'),
      ]);

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups || []);
      }
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }
      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.posts || []);
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to load group management data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCaption = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/groups/queue/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      if (res.ok) {
        setNotification({ type: 'success', text: 'Task marked as completed! Share count updated.' });
        loadData();
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to complete task' });
    }
  };

  const handleSkipTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/groups/queue/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip' }),
      });
      if (res.ok) {
        setNotification({ type: 'success', text: 'Task skipped.' });
        loadData();
      }
    } catch {
      setNotification({ type: 'error', text: 'Failed to skip task' });
    }
  };

  const handleAddGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          url: newGroupUrl,
          category: newGroupCategory,
          memberCountEstimate: newGroupMembers ? parseInt(newGroupMembers, 10) : undefined,
          postGuidelinesKhmer: newGroupRules,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: 'Facebook Group added to catalog!' });
        setIsAddGroupOpen(false);
        setNewGroupName('');
        setNewGroupUrl('');
        setNewGroupRules('');
        loadData();
      } else {
        setNotification({ type: 'error', text: data.error || 'Failed to add group' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Error adding group' });
    }
  };

  const handleQueueTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const post = posts.find((p) => p.id === selectedPostId);
    const group = groups.find((g) => g.id === selectedGroupId);

    if (!post || !group) {
      setNotification({ type: 'error', text: 'Please select both a post and a group' });
      return;
    }

    try {
      const res = await fetch('/api/groups/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: group.id,
          groupName: group.name,
          groupUrl: group.url,
          postId: post.id,
          postCaption: [post.captionKhmer, post.captionEnglish].filter(Boolean).join('\n\n'),
          postImageUrls: post.imageUrls,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: 'Task added to sharing queue!' });
        setIsQueueTaskOpen(false);
        loadData();
      } else {
        setNotification({ type: 'error', text: data.error || 'Failed to queue task' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Error queuing task' });
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facebook Group Management</h1>
          <p className="text-sm text-slate-500">
            Catalog Cambodian shopping groups and manage policy-compliant manual sharing workflows with 1-click templates.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddGroupOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Group</span>
          </button>

          <button
            onClick={() => setIsQueueTaskOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-600/20 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Queue Share Task</span>
          </button>
        </div>
      </div>

      {/* Meta Terms of Service Compliance Guarantee */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200 text-xs text-emerald-900 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">100% Official Meta Terms of Service Compliant Workflow</span>
          <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
            Meta deprecated automatic API publishing to arbitrary Facebook Groups in 2024. To prevent account bans or shadow-banning, our system enforces a safe, semi-automated queue: pre-generating captions, image links, and direct group links for 1-click posting without unauthorized bots, scraping, or cookie extraction.
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

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'queue'
              ? 'bg-pink-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Sharing Tasks Queue ({pendingTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-2 ${
            activeTab === 'catalog'
              ? 'bg-pink-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Group Catalog ({groups.length})</span>
        </button>
      </div>

      {/* Tab 1: Sharing Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pink-500 mb-2" />
              <p className="text-xs">Loading task queue...</p>
            </div>
          ) : pendingTasks.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
              <Share2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No pending group sharing tasks</h4>
              <p className="text-xs text-slate-400 mt-1">
                Click &quot;Queue Share Task&quot; above to select a handbag post and assign it to Cambodian groups.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                        Pending Share
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{task.groupName}</h4>
                    </div>

                    <a
                      href={task.groupUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Open Group in Facebook"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Caption & Image Box */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs text-slate-700 line-clamp-3 whitespace-pre-line">
                      {task.postCaption || '(No caption)'}
                    </p>

                    {task.postImageUrls && task.postImageUrls.length > 0 && (
                      <div className="flex gap-1.5 overflow-x-auto pt-1">
                        {task.postImageUrls.map((url, i) => (
                          <img key={i} src={url} alt="Post item" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleCopyCaption(task.id, task.postCaption)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      {copiedId === task.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Caption</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSkipTask(task.id)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Done</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Group Catalog */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="divide-y divide-slate-100">
            {groups.map((grp) => (
              <div key={grp.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{grp.name}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {grp.category}
                    </span>
                  </div>
                  {grp.postGuidelinesKhmer && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {grp.postGuidelinesKhmer}
                    </p>
                  )}
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-0.5">
                    {grp.memberCountEstimate && (
                      <span>~{grp.memberCountEstimate.toLocaleString()} members</span>
                    )}
                    <span>&bull;</span>
                    <span>Completed shares: {grp.totalSharesCompleted || 0}</span>
                    {grp.lastSharedAt && (
                      <>
                        <span>&bull;</span>
                        <span>Last shared: {new Date(grp.lastSharedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <a
                    href={grp.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold border border-blue-200 transition"
                  >
                    <span>Visit Group</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {isAddGroupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Facebook Group</h3>
              <button onClick={() => setIsAddGroupOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cambodia Online Fashion Club"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Group URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://www.facebook.com/groups/..."
                  value={newGroupUrl}
                  onChange={(e) => setNewGroupUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newGroupCategory}
                    onChange={(e) => setNewGroupCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="Handbag & Fashion">Handbag & Fashion</option>
                    <option value="Local Buy & Sell">Local Buy & Sell</option>
                    <option value="Provincial Delivery">Provincial Delivery</option>
                    <option value="Wholesale">Wholesale</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Est. Members</label>
                  <input
                    type="number"
                    placeholder="25000"
                    value={newGroupMembers}
                    onChange={(e) => setNewGroupMembers(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Posting Guidelines (Khmer)</label>
                <textarea
                  rows={2}
                  placeholder="លក្ខខណ្ឌផុសក្នុងគ្រុប..."
                  value={newGroupRules}
                  onChange={(e) => setNewGroupRules(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddGroupOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-600/20 transition cursor-pointer"
                >
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Queue Task Modal */}
      {isQueueTaskOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Queue Group Sharing Task</h3>
              <button onClick={() => setIsQueueTaskOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQueueTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Handbag Post</label>
                <select
                  required
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                >
                  <option value="">-- Choose a post --</option>
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.captionKhmer ? p.captionKhmer.substring(0, 40) : p.id} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Facebook Group</label>
                <select
                  required
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                >
                  <option value="">-- Choose a group --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsQueueTaskOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-600/20 transition cursor-pointer"
                >
                  Add to Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

