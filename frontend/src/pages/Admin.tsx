import { useEffect, useState } from 'react';
import {
  fetchAdminPending, fetchAdminAll, fetchAdminStats,
  adminApprove, adminReject, adminDelete, fetchAdminUsers, adminToggleBan, adminAddBalance, adminBroadcast
} from '../api';
import { Story, HARDNESS_LABEL, UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import {
  Check, X, Trash2, Eye, ArrowLeft, Users, Activity, PlayCircle, Search, Trophy, Flame, Send, CloudLightning, TrendingUp, DollarSign
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

type AdminTab = 'stats' | 'pending' | 'approved' | 'rejected' | 'users';

export default function Admin() {
  const { user } = useAppStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState<AdminTab>('stats');
  const [stories, setStories] = useState<Story[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  // Admin guard
  useEffect(() => {
    if (user && !user.is_admin) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    WebApp.BackButton.show();
    WebApp.BackButton.onClick(() => navigate('/profile'));
    return () => WebApp.BackButton.hide();
  }, [navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(userSearch), 500);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const load = async () => {
    setLoading(true);
    try {
      const s = await fetchAdminStats();
      setStats(s);

      if (tab === 'users') {
        const u = await fetchAdminUsers(0, debouncedSearch);
        setUsersList(u);
      } else if (tab !== 'stats') {
        const data = tab === 'pending' ? await fetchAdminPending() : await fetchAdminAll(tab as string);
        setStories(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab, debouncedSearch]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await adminApprove(id);
      setStories((s) => s.filter((x) => x.id !== id));
      setStats((s: any) => ({ ...s, summary: { ...s.summary, stories_pending: s.summary.stories_pending - 1, stories_approved: s.summary.stories_approved + 1 } }));
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
      setStats((s: any) => ({ ...s, summary: { ...s.summary, stories_pending: s.summary.stories_pending - 1, stories_rejected: s.summary.stories_rejected + 1 } }));
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

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    if (!confirm(`Отправить сообщение ${stats.summary?.users_total} пользователям?`)) return;
    
    setBroadcasting(true);
    try {
        const res = await adminBroadcast(broadcastMsg);
        WebApp.showPopup({ title: 'Готово', message: `Отправлено ${res.sent_count} пользователям` });
        setBroadcastMsg('');
        WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) {
        WebApp.showPopup({ title: 'Ошибка', message: 'Не удалось запустить рассылку' });
    } finally {
        setBroadcasting(false);
    }
  };

  const TABS: { key: AdminTab; label: string; count?: number }[] = [
    { key: 'stats', label: 'Стата' },
    { key: 'pending',  label: 'Очередь',  count: stats.summary?.stories_pending },
    { key: 'approved', label: 'Одобрено' },
    { key: 'rejected', label: 'Отказы' },
    { key: 'users', label: 'Люди' },
  ];

  return (
    <div className="min-h-screen pb-24 animate-fade-in bg-background">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate('/profile')} className="p-2 glass rounded-xl shadow-lg active:scale-90 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">ПАНЕЛЬ БОССА</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black opacity-70">Administrative Command Center</p>
          </div>
        </div>

        {/* Dynamic Nav */}
        <div className="flex border-b border-border/40 overflow-x-auto hide-scrollbar -mx-4 px-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap px-5 pb-3 text-[13px] font-bold transition-all flex items-center justify-center gap-2 relative ${
                tab === t.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-destructive text-white text-[10px] rounded-full px-1.5 min-w-[18px] h-4.5 flex items-center justify-center shadow-lg shadow-destructive/30 animate-pulse">
                  {t.count}
                </span>
              )}
              {tab === t.key && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_6px_rgba(255,0,0,0.4)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {loading && !debouncedSearch ? (
          <div className="space-y-4">
            <div className="skeleton h-32 rounded-2xl" />
            <div className="skeleton h-48 rounded-2xl" />
            <div className="grid grid-cols-2 gap-3">
              <div className="skeleton h-24 rounded-2xl" />
              <div className="skeleton h-24 rounded-2xl" />
            </div>
          </div>
        ) : tab === 'stats' ? (
          <div className="space-y-6 pb-12">
            
            {/* Health indicators */}
            <div className="grid grid-cols-3 gap-3">
                <div className="glass !bg-green-500/5 rounded-2xl p-3 border border-green-500/10 text-center">
                    <div className="text-[9px] font-black text-green-400/60 uppercase mb-1">Conversion</div>
                    <div className="text-sm font-black text-green-400">{stats.summary?.conversion_rate || 0}%</div>
                </div>
                <div className="glass !bg-blue-500/5 rounded-2xl p-3 border border-blue-500/10 text-center">
                    <div className="text-[9px] font-black text-blue-400/60 uppercase mb-1">Velocity</div>
                    <div className="text-sm font-black text-blue-400">+{stats.summary?.stories_last_7d || 0}</div>
                </div>
                <div className="glass !bg-yellow-500/5 rounded-2xl p-3 border border-yellow-500/10 text-center">
                    <div className="text-[9px] font-black text-yellow-400/60 uppercase mb-1">Avg Check</div>
                    <div className="text-sm font-black text-yellow-400">{Math.round(stats.summary?.avg_purchase_value || 0)}s</div>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative overflow-hidden glass !bg-blue-500/5 rounded-3xl p-5 border border-blue-500/10 group">
                <div className="absolute -right-2 -top-2 opacity-10 group-hover:scale-125 transition-transform">
                    <Users className="w-16 h-16 text-blue-500" />
                </div>
                <Users className="w-5 h-5 text-blue-400 mb-3" />
                <div className="text-3xl font-black tracking-tight">{stats.summary?.unique_buyers || 0}<span className="text-xs opacity-30 text-white ml-1">/ {stats.summary?.users_total}</span></div>
                <div className="text-[11px] font-bold text-blue-400 mt-1 uppercase tracking-wider">Платящие юзеры</div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-[10px] font-bold">
                  <Activity className="w-3 h-3" />
                  +{stats.summary?.users_new_24h || 0} за 24ч
                </div>
              </div>

              <div className="relative overflow-hidden glass !bg-yellow-500/5 rounded-3xl p-5 border border-yellow-500/10 group">
                <div className="absolute -right-2 -top-2 opacity-10 group-hover:scale-125 transition-transform">
                    <TrendingUp className="w-16 h-16 text-yellow-500" />
                </div>
                <DollarSign className="w-5 h-5 text-yellow-400 mb-3" />
                <div className="text-3xl font-black tracking-tight text-yellow-400">{stats.summary?.stars_spent_total || 0}</div>
                <div className="text-[11px] font-bold text-yellow-500/70 mt-1 uppercase tracking-wider">Revenue Stars</div>
                <div className="text-[10px] text-muted-foreground mt-3 font-semibold">Балансы: {stats.summary?.stars_in_balances}</div>
              </div>

              <div className="relative overflow-hidden glass !bg-purple-500/5 rounded-3xl p-5 border border-purple-500/10 group">
                 <div className="absolute -right-2 -top-2 opacity-10 group-hover:scale-125 transition-transform">
                    <PlayCircle className="w-16 h-16 text-purple-500" />
                </div>
                <PlayCircle className="w-5 h-5 text-purple-400 mb-3" />
                <div className="text-3xl font-black tracking-tight text-white">{stats.summary?.engagement_total_hours || 0}ч</div>
                <div className="text-[11px] font-bold text-purple-400 mt-1 uppercase tracking-wider">Play Time (Total)</div>
                <div className="text-[10px] text-muted-foreground mt-3 font-semibold">Avg: {stats.summary?.engagement_avg_minutes} мин/чел</div>
              </div>

              <div className="relative overflow-hidden glass !bg-red-500/5 rounded-3xl p-5 border border-red-500/10 group">
                 <div className="absolute -right-2 -top-2 opacity-10 group-hover:scale-125 transition-transform">
                    <Flame className="w-16 h-16 text-red-500" />
                </div>
                <Flame className="w-5 h-5 text-red-400 mb-3" />
                <div className="text-3xl font-black tracking-tight text-white">{stats.summary?.users_active_24h || 0}</div>
                <div className="text-[11px] font-bold text-red-400 mt-1 uppercase tracking-wider">Daily Actives</div>
                <div className="text-[10px] text-muted-foreground mt-3 font-semibold">Weekly: {stats.summary?.users_active_7d}</div>
              </div>
            </div>

            {/* Leaderboards */}
            <div className="grid grid-cols-1 gap-6">
                 {/* Top Stories */}
                 <div className="glass !bg-card/30 rounded-3xl p-6 border border-border/40">
                    <h3 className="text-base font-black mb-5 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        ТОП СЮЖЕТОВ (ИГРЫ)
                    </h3>
                    <div className="space-y-4">
                        {stats.top_stories?.map((s: any, i: number) => (
                            <div key={s.id} className="flex items-center gap-4 group">
                                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center font-black text-sm group-first:bg-yellow-500 group-first:text-black transition-colors">
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm truncate uppercase tracking-tight">{s.title}</div>
                                    <div className="text-[10px] text-muted-foreground font-bold">@{s.author}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black">{s.plays}</div>
                                    <div className="text-[9px] text-muted-foreground font-bold uppercase">{Math.round(s.seconds / 60)} мин</div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Top Authors */}
                 <div className="glass !bg-card/30 rounded-3xl p-6 border border-border/40">
                    <h3 className="text-base font-black mb-5 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        ТОП ПО УДЕРЖАНИЮ
                    </h3>
                    <div className="space-y-4">
                        {stats.top_authors?.map((a: any, i: number) => (
                            <div key={a.tg_id} className="flex items-center gap-4 group">
                                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center font-black text-sm group-first:bg-blue-500 group-first:text-white transition-colors text-blue-400">
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm truncate uppercase tracking-tight">@{a.name}</div>
                                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">ID {a.tg_id}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-blue-400">{Math.round(a.seconds / 3600)} ч</div>
                                    <div className="text-[9px] text-muted-foreground font-bold uppercase">{a.plays} запусков</div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>

            {/* Charts Section */}
            {stats.chart_data && stats.chart_data.length > 0 && (
              <div className="space-y-6 pb-20">
                <div className="glass !bg-card/20 rounded-3xl p-6 border border-border/40">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black flex items-center gap-2 text-primary uppercase tracking-widest">
                        <Activity className="w-4 h-4" />
                        Аудитория
                    </h3>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full uppercase tracking-tighter">DAU & New</span>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.chart_data}>
                        <defs>
                          <linearGradient id="colorDAU" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="date" tick={{fontSize: 9, fill: '#666'}} axisLine={false} tickLine={false} tickFormatter={(val) => val.slice(5)} />
                        <YAxis tick={{fontSize: 9, fill: '#666'}} axisLine={false} tickLine={false} width={25} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                          labelStyle={{ color: '#888', fontSize: '10px', marginBottom: '4px' }}
                          itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="active_users" name="DAU" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorDAU)" />
                        <Area type="monotone" dataKey="new_users" name="New" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorNew)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass !bg-card/20 rounded-3xl p-6 border border-border/40">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black flex items-center gap-2 text-yellow-500 uppercase tracking-widest">
                        <DollarSign className="w-4 h-4" />
                        Выручка
                    </h3>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.chart_data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="date" tick={{fontSize: 9, fill: '#666'}} axisLine={false} tickLine={false} tickFormatter={(val) => val.slice(5)} />
                        <YAxis tick={{fontSize: 9, fill: '#666'}} axisLine={false} tickLine={false} width={25} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                          labelStyle={{ color: '#888', fontSize: '10px' }}
                          itemStyle={{ color: '#eab308', fontSize: '12px', fontWeight: 'bold' }}
                          cursor={{fill: 'rgba(234, 179, 8, 0.05)'}}
                        />
                        <Bar dataKey="stars_spent" name="Stars" fill="#eab308" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : tab === 'users' ? (
          <div className="space-y-4">
            
            {/* Broadcast Tool */}
            <div className="glass !bg-primary/5 rounded-3xl p-5 border border-primary/20 mb-6 group">
                <div className="flex items-center gap-2 mb-4">
                    <CloudLightning className="w-5 h-5 text-primary animate-pulse" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-primary">Массовая рассылка</h3>
                </div>
                <div className="relative">
                    <textarea 
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                        placeholder="Текст сообщения для ВСЕХ пользователей (HTML поддерживается)..."
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-medium h-24 outline-none focus:border-primary/40 transition-all resize-none"
                    />
                    <button 
                        onClick={handleBroadcast}
                        disabled={broadcasting || !broadcastMsg.trim()}
                        className="absolute bottom-3 right-3 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 disabled:opacity-0 transition-all"
                    >
                        {broadcasting ? <Activity className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
                <p className="text-[9px] text-muted-foreground mt-2 px-1 font-bold">⚠️ Осторожно: сообщение улетит {stats.summary?.users_total} людям!</p>
            </div>

            {/* Search Bar */}
            <div className="sticky top-0 z-10 pt-2 pb-4 -mx-4 px-4 bg-background/80 backdrop-blur-xl">
                 <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                        type="text"
                        placeholder="Поиск по Username, Нику или TG ID..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full bg-card/50 border border-border/50 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all shadow-inner"
                    />
                 </div>
            </div>

            <div className="space-y-3 pb-10">
                {usersList.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">Никого не нашли</p>
                    </div>
                ) : (
                    usersList.map((u) => (
                    <div key={u.tg_id} className="bg-card/60 backdrop-blur-lg rounded-3xl border border-border/40 p-5 shadow-sm hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-muted to-card flex items-center justify-center text-lg font-black border border-border/50 shadow-inner">
                                {u.first_name?.[0] || '?'}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-black text-[15px] flex items-center gap-2 truncate uppercase tracking-tight">
                                    {u.nickname || u.first_name} 
                                    {u.is_admin && <span className="text-[7px] bg-red-500 text-white px-1.5 py-0.5 rounded-md uppercase font-black tracking-widest">BOSS</span>}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5 mt-0.5 uppercase tracking-widest">
                                    {u.username && <span className="text-blue-400">@{u.username}</span>}
                                    <span className="opacity-20">|</span>
                                    <span>ID {u.tg_id}</span>
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleBalance(u.tg_id)} className="w-11 h-11 bg-yellow-500/10 text-yellow-500 rounded-2xl text-xl font-bold flex items-center justify-center hover:bg-yellow-500/20 active:scale-90 transition-all border border-yellow-500/10 shadow-lg shadow-yellow-500/5">
                            ⭐
                            </button>
                            <button onClick={() => handleBan(u.tg_id)} className={`w-11 h-11 rounded-2xl text-[10px] font-black flex items-center justify-center border transition-all active:scale-90 shadow-lg ${u.is_banned ? 'bg-green-500/10 text-green-500 border-green-500/20 shadow-green-500/5' : 'bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/5'}`}>
                            {u.is_banned ? 'UNBAN' : 'BAN'}
                            </button>
                        </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/20 rounded-2xl p-3 border border-border/30">
                            <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Баланс</div>
                            <div className="font-black text-yellow-400 text-lg flex items-center gap-1">
                                {u.stars_balance}
                                <span className="text-[10px] opacity-70">⭐</span>
                            </div>
                        </div>
                        <div className="bg-black/20 rounded-2xl p-3 border border-border/30">
                            <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Потрачено</div>
                            <div className="font-black text-white text-lg">
                                {u.total_spent_stars}
                                <span className="text-[10px] opacity-30 ml-1">stars</span>
                            </div>
                        </div>
                        </div>
                    </div>
                    ))
                )}
            </div>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-24 animate-fade-in glass rounded-[2.5rem] m-4 border border-border/30 shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
             <div className="text-6xl mb-6 bg-primary/10 w-24 h-24 mx-auto rounded-full flex items-center justify-center border border-primary/20 shadow-inner">🌙</div>
             <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-50">Очередь пуста</p>
             <p className="mt-2 text-sm font-bold">Спи спокойно, Босс</p>
          </div>
        ) : (
          <div className="space-y-5 pb-12">
            {stories.map((story) => (
              <div
                key={story.id}
                className={`bg-card/70 backdrop-blur-xl rounded-[2rem] border border-border/40 overflow-hidden shadow-2xl transition-all ${
                  processing === story.id ? 'opacity-50 scale-[0.97]' : 'hover:border-primary/30'
                }`}
              >
                {/* Preview */}
                <div className="flex gap-4 p-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-muted flex-shrink-0 relative shadow-lg border border-border/50">
                    <img
                      src={story.preview_url}
                      alt={story.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex justify-center">
                       <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                           story.hardness_level >= 3 ? 'bg-red-500' : 'bg-primary'
                       }`}>
                          {HARDNESS_LABEL[story.hardness_level]}
                       </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-black text-[17px] truncate tracking-tighter uppercase">{story.title}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-black text-primary uppercase">Author</div>
                        <p className="text-[11px] text-muted-foreground font-black uppercase tracking-tighter">
                           <b className="text-foreground">@{story.author_nickname || story.author_username || story.author_first_name || 'anon'}</b>
                        </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed font-medium">{story.description}</p>

                    <div className="flex gap-2 mt-3 flex-wrap">
                      {story.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="bg-black/30 text-[9px] font-black py-0.5 px-2 rounded-lg text-muted-foreground border border-border/50 uppercase tracking-widest">{tag}</span>
                      ))}
                      {story.price_stars > 0 && (
                        <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] font-black py-0.5 px-2 rounded-lg uppercase">⭐ {story.price_stars}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reject reason */}
                {story.reject_reason && (
                  <div className="mx-4 mb-4 bg-destructive/10 border border-destructive/20 rounded-2xl p-3 text-[11px] text-destructive leading-normal font-medium animate-shake">
                    <b className="font-black uppercase tracking-widest mr-1 opacity-70">Отклонено:</b> {story.reject_reason}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 px-4 pb-4">
                  {tab === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(story.id)}
                        className="flex-[2] bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <Check className="w-4 h-4" />
                        Одобрить
                      </button>
                      <button
                        onClick={() => { setRejectModal({ id: story.id, title: story.title }); setRejectReason(''); }}
                        className="flex-1 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter flex items-center justify-center gap-1 transition-all active:scale-95"
                      >
                        <X className="w-4 h-4" />
                        REJECT
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => navigate(`/story/${story.id}`)}
                    className="aspect-square w-12 bg-muted hover:bg-muted/80 rounded-2xl text-foreground transition-all flex items-center justify-center border border-border/50 active:scale-95"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(story.id)}
                    className="aspect-square w-12 bg-destructive/10 hover:bg-destructive/20 rounded-2xl text-destructive transition-all flex items-center justify-center border border-destructive/20 active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal - Native Bottom Sheet Style */}
      {rejectModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-md px-4 pb-8 transition-opacity">
          <div className="bg-card border border-border/50 shadow-2xl rounded-[2.5rem] w-full max-w-sm p-6 animate-slide-up relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-destructive via-primary to-destructive/20" />
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6 opacity-30" />
            
            <div className="mb-6">
                <h3 className="font-black text-2xl tracking-tighter mb-1 uppercase">Готов убить?</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate">«{rejectModal.title}»</p>
            </div>

            <label className="block text-[10px] font-black mb-3 text-muted-foreground uppercase tracking-widest ml-1">Причина для автора</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-black/40 border border-border/50 rounded-2xl h-32 p-4 text-sm font-medium resize-none focus:ring-1 focus:ring-destructive/50 focus:border-destructive/50 outline-none transition-all placeholder:opacity-30"
              placeholder="Слишком много эротики? Плохая грамматика? Опиши почему..."
            />

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                onClick={() => setRejectModal(null)}
                className="py-4 rounded-2xl bg-muted hover:bg-muted/80 text-foreground text-xs font-black uppercase tracking-widest transition-all active:scale-95"
              >
                ОТМЕНА
              </button>
              <button
                onClick={handleRejectConfirm}
                className="py-4 rounded-2xl bg-destructive hover:bg-destructive shadow-lg shadow-destructive/20 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
                REJECT IT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
