import React, { useEffect, useState } from 'react';
import {
  fetchAdminPending, fetchAdminAll, fetchAdminStats,
  adminApprove, adminReject, adminDelete, fetchAdminUsers, adminToggleBan, adminAddBalance
} from '../api';
import { Story, HARDNESS_LABEL, UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import {
  Check, X, Trash2, Eye, Clock, BarChart2,
  ChevronLeft, ArrowLeft, ImageIcon
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';

type AdminTab = 'pending' | 'approved' | 'rejected' | 'users';

export default function Admin() {
  const { user } = useAppStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState<AdminTab>('pending');
  const [stories, setStories] = useState<Story[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  // Admin guard
  useEffect(() => {
    if (user && !user.is_admin) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    WebApp.BackButton.show();
    WebApp.BackButton.onClick(() => navigate('/profile'));
    return () => WebApp.BackButton.hide();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'users') {
        const u = await fetchAdminUsers();
        setUsersList(u);
      } else {
        const data = tab === 'pending' ? await fetchAdminPending() : await fetchAdminAll(tab);
        setStories(data);
        const s = await fetchAdminStats();
        setStats(s);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await adminApprove(id);
      setStories((s) => s.filter((x) => x.id !== id));
      setStats((s) => ({ ...s, pending: s.pending - 1, approved: s.approved + 1 }));
      WebApp.HapticFeedback.notificationOccurred('success');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal.id);
    try {
      await adminReject(rejectModal.id, rejectReason || 'Не соответствует правилам');
      setStories((s) => s.filter((x) => x.id !== rejectModal.id));
      setStats((s) => ({ ...s, pending: s.pending - 1, rejected: s.rejected + 1 }));
      setRejectModal(null);
      setRejectReason('');
      WebApp.HapticFeedback.notificationOccurred('warning');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить сюжет навсегда?')) return;
    setProcessing(id);
    try {
      await adminDelete(id);
      setStories((s) => s.filter((x) => x.id !== id));
    } finally {
      setProcessing(null);
    }
  };

  const TABS: { key: AdminTab; label: string; count?: number }[] = [
    { key: 'pending',  label: 'Очередь',  count: stats.pending },
    { key: 'approved', label: 'Одобрено' },
    { key: 'rejected', label: 'Отказы' },
    { key: 'users', label: 'Люди' },
  ];

  const handleBan = async (id: number) => {
    setProcessing(String(id));
    try {
      const res = await adminToggleBan(id);
      setUsersList((curr) => curr.map(u => u.tg_id === id ? { ...u, is_banned: res.is_banned } : u));
    } finally {
      setProcessing(null);
    }
  };

  const handleBalance = async (id: number) => {
    const qty = prompt("Сколько Stars добавить? (можно с минусом)");
    if (!qty || isNaN(Number(qty))) return;
    setProcessing(String(id));
    try {
      const res = await adminAddBalance(id, Number(qty));
      setUsersList((curr) => curr.map(u => u.tg_id === id ? { ...u, stars_balance: res.new_balance } : u));
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen pb-24 animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate('/profile')} className="p-2 glass rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-destructive">Админ Панель</h1>
            <p className="text-xs text-muted-foreground">Модерация контента</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Всего', value: stats.total, color: 'text-foreground' },
            { label: 'Очередь', value: stats.pending, color: 'text-yellow-400' },
            { label: 'OK', value: stats.approved, color: 'text-green-400' },
            { label: 'Отклон.', value: stats.rejected, color: 'text-red-400' },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-2 text-center">
              <p className={`text-lg font-black ${s.color}`}>{s.value ?? '—'}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 pb-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                tab === t.key ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-destructive text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-32 rounded-2xl" />
            ))}
          </div>
        ) : tab === 'users' ? (
          <div className="space-y-4">
            {usersList.map((u) => (
              <div key={u.tg_id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-bold text-sm">@{u.username || u.first_name} {u.is_admin && <span className="text-primary text-xs">(Admin)</span>}</span>
                  <span className="text-xs text-muted-foreground">⭐ {u.stars_balance} (Спенд: {u.total_spent_stars})</span>
                  {u.is_banned && <span className="text-xs font-bold text-destructive">Забанен</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleBalance(u.tg_id)} className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg text-xs font-bold w-10 h-10 flex items-center justify-center">
                    +⭐
                  </button>
                  <button onClick={() => handleBan(u.tg_id)} className={`p-2 rounded-lg text-xs font-bold w-10 h-10 flex items-center justify-center ${u.is_banned ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                    {u.is_banned ? 'Unban' : 'Ban'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-muted-foreground font-medium">Ничего не найдено!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story) => (
              <div
                key={story.id}
                className={`bg-card rounded-2xl border border-border overflow-hidden ${
                  processing === story.id ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {/* Preview */}
                <div className="flex gap-3 p-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={story.preview_url}
                      alt={story.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{story.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      @{story.author_username || story.author_first_name || 'anon'} · {HARDNESS_LABEL[story.hardness_level]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{story.description}</p>

                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {story.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="tag-badge">{tag}</span>
                      ))}
                      {story.price_stars > 0 && (
                        <span className="tag-badge text-yellow-400">⭐ {story.price_stars}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reject reason */}
                {story.reject_reason && (
                  <div className="mx-3 mb-3 bg-destructive/10 border border-destructive/20 rounded-lg p-2 text-xs text-destructive">
                    <b>Причина отказа:</b> {story.reject_reason}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 px-3 pb-3">
                  {tab === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(story.id)}
                        className="flex-1 bg-green-900/40 text-green-400 border border-green-500/40 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                      >
                        <Check className="w-4 h-4" />
                        Одобрить
                      </button>
                      <button
                        onClick={() => { setRejectModal({ id: story.id, title: story.title }); setRejectReason(''); }}
                        className="flex-1 bg-destructive/20 text-destructive border border-destructive/40 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                      >
                        <X className="w-4 h-4" />
                        Отклонить
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => navigate(`/story/${story.id}`)}
                    className="p-2.5 bg-muted rounded-xl text-muted-foreground active:scale-95 transition-transform"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(story.id)}
                    className="p-2.5 bg-destructive/20 rounded-xl text-destructive active:scale-95 transition-transform"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm px-4 pb-8">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 animate-slide-up">
            <h3 className="font-black text-lg mb-1">Отклонить сюжет</h3>
            <p className="text-sm text-muted-foreground mb-4">«{rejectModal.title}»</p>

            <label className="block text-sm font-semibold mb-1.5">Причина отказа</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input-base h-24 resize-none mb-4"
              placeholder="Укажи причину, чтобы автор знал что исправить..."
            />

            <div className="flex gap-2">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={handleRejectConfirm}
                className="flex-1 py-3 rounded-xl bg-destructive text-white text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
