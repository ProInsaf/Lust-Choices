import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { fetchUserStories, fetchLikedStories } from '../api';

import { Story, HARDNESS_LABEL } from '../types';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Heart, ChevronRight, Clock, CheckCircle, XCircle, Sparkles, Gem, TrendingUp } from 'lucide-react';
import ProfileSettingsModal, { THEMES } from '../components/ProfileSettingsModal';

const STATUS_CONFIG = {
  pending:  { label: 'На проверке', icon: <Clock className="w-3.5 h-3.5" />, cls: 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30' },
  approved: { label: 'Одобрено',    icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'text-green-400 bg-green-900/30 border-green-500/30' },
  rejected: { label: 'Отклонено',   icon: <XCircle className="w-3.5 h-3.5" />,    cls: 'text-red-400 bg-red-900/30 border-red-500/30' },
};


// ── Main Profile ──────────────────────────────────────────────────────────────
export default function Profile() {
  const { user } = useAppStore();
  const navigate = useNavigate();


  const [tab, setTab] = useState<'my' | 'liked'>('my');
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [likedStories, setLikedStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);


  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchUserStories(user.tg_id), fetchLikedStories(user.tg_id)])
      .then(([mine, liked]) => {
        setMyStories(mine);
        setLikedStories(liked);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const displayStories = tab === 'my' ? myStories : likedStories;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <div className="text-5xl mb-4">👤</div>
          <p className="text-muted-foreground font-bold">Откройте через Telegram</p>
        </div>
      </div>
    );
  }

  const isPremium = user.subscription_tier === 'premium';
  const avatarLetter = (user.first_name || user.username || 'U')[0].toUpperCase();
  
  const theme = THEMES.find(t => t.id === user.profile_theme) || THEMES[0];
  const accentColor = theme.colors.primary;

  return (
    <div className={`min-h-screen pb-24 animate-fade-in relative overflow-hidden transition-colors ${theme.colors.bgStyle}`}>
      
      {/* ── Background Glow ── */}
      <div className="fixed top-0 left-0 right-0 h-96 opacity-10 blur-[120px] pointer-events-none z-0" 
           style={{ backgroundColor: accentColor }} />

      {/* ── Profile Header ── */}
      <div className="relative pt-12 px-6">
        
        {/* User Card */}



        {/* User Card */}
        <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative mb-4">
                {user.photo_url ? (
                    <img
                    src={user.photo_url}
                    alt="avatar"
                    className="w-28 h-28 rounded-[40px] border-4 border-background object-cover shadow-2xl"
                    />
                ) : (
                    <div
                    className="w-28 h-28 rounded-[40px] border-4 border-background flex items-center justify-center text-4xl font-black text-white shadow-2xl"
                    style={{ backgroundColor: accentColor }}
                    >
                    {avatarLetter}
                    </div>
                )}
                {isPremium && (
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center border-4 border-background shadow-lg rotate-12">
                        <Gem className="w-5 h-5 text-black" />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-black tracking-tighter" style={{ color: accentColor }}>
                    {user.nickname || user.first_name || 'Пользователь'}
                </h1>
                {isPremium && <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />}
            </div>
            
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-40 mb-4">
                @{user.username || 'user'} · {isPremium ? 'Premium' : 'Basic'}
            </p>

            <div className="flex gap-2 w-full max-w-[280px]">
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex-1 h-11 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                    Изменить профиль
                </button>
            </div>
        </div>


        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-10">
            <StatCard icon={<BookOpen className="w-4 h-4" />} value={myStories.length} label="Сюжета" color={accentColor} />
            <StatCard icon={<Heart className="w-4 h-4" />} value={likedStories.length} label="Лайков" color="#EF4444" />
            <StatCard icon={<TrendingUp className="w-4 h-4" />} value={user.total_earned_stars || 0} label="Доход ⭐" color="#10B981" />
        </div>

        {/* Admin panel link */}
        {user.is_admin && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full mt-8 p-4 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive font-bold text-xs flex items-center justify-between active:scale-[0.98] transition-all"
          >
            <span>🛡️ Панель администратора</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mt-12 mb-6 border-b border-white/5">
          <button
            onClick={() => setTab('my')}
            className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${
              tab === 'my' ? 'text-white' : 'text-muted-foreground'
            }`}
          >
            Мои сюжеты
            {tab === 'my' && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: accentColor }} />}
          </button>
          <button
            onClick={() => setTab('liked')}
            className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${
              tab === 'liked' ? 'text-white' : 'text-muted-foreground'
            }`}
          >
            Любимое
            {tab === 'liked' && <div className="absolute bottom-0 left-0 right-0 h-0.5 shadow-[0_0_10px_rgba(239,68,68,0.5)] bg-red-500" />}
          </button>
        </div>

        {/* List Content */}
        <div className="pb-10">
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
                </div>
            ) : displayStories.length === 0 ? (
                <div className="py-20 text-center opacity-40">
                    <p className="text-sm font-bold">{tab === 'my' ? 'У вас пока нет сюжетов' : 'Вы еще ничего не лайкнули'}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {displayStories.map(story => {
                        const sc = STATUS_CONFIG[story.status];
                        return (
                            <div
                                key={story.id}
                                onClick={() => navigate(`/story/${story.id}`)}
                                className="bg-white/5 border border-white/5 rounded-2xl p-4 flex gap-4 active:scale-[0.98] transition-all"
                            >
                                <img src={story.preview_url} className="w-16 h-16 rounded-xl object-cover" alt="" />
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h4 className="font-bold text-sm truncate mb-1">{story.title}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-black opacity-40">{HARDNESS_LABEL[story.hardness_level]}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${sc.cls}`}>
                                            {sc.label}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <ChevronRight className="w-4 h-4 opacity-20" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>
      
      <ProfileSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}


function StatCard({ icon, value, label, color }: { icon: any, value: number, label: string, color: string }) {
  return (
    <div className="glass rounded-3xl p-4 border border-white/5 flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: `${color}20` }}>
            <div style={{ color }}>{icon}</div>
        </div>
        <p className="text-xl font-black mb-1">{value}</p>
        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{label}</p>
    </div>
  );
}

