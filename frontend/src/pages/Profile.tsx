import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { fetchUserStories, fetchLikedStories, updateUserProfile } from '../api';

import { Story, HARDNESS_LABEL } from '../types';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Heart, ChevronRight, Clock, CheckCircle, XCircle, Edit3, Crown, Sparkles, Gem, Palette, ShoppingBag, TrendingUp } from 'lucide-react';

import WebApp from '@twa-dev/sdk';


const STATUS_CONFIG = {
  pending:  { label: 'На проверке', icon: <Clock className="w-3.5 h-3.5" />, cls: 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30' },
  approved: { label: 'Одобрено',    icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'text-green-400 bg-green-900/30 border-green-500/30' },
  rejected: { label: 'Отклонено',   icon: <XCircle className="w-3.5 h-3.5" />,    cls: 'text-red-400 bg-red-900/30 border-red-500/30' },
};

// ── Profile Editors ───────────────────────────────────────────────────────────

function BioEditor({ tgId, currentBio, onSave }: { tgId: number; currentBio: string; onSave: (bio: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentBio);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await updateUserProfile(tgId, { bio: value });
      onSave(res.bio || '');
      setEditing(false);
      WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) {
      WebApp.HapticFeedback.notificationOccurred('error');
    } finally {
      setLoading(false);
    }
  };

  if (!editing) {
    return (
      <div 
        onClick={() => setEditing(true)}
        className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-all group"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">О себе</p>
          <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs leading-relaxed italic opacity-80">
          {currentBio || 'Расскажите о себе (жанры, которые вы любите, или ваши предпочтения)...'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-primary/20 animate-fade-in shadow-xl shadow-primary/10">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="О себе..."
        className="w-full h-24 bg-transparent text-sm focus:outline-none resize-none placeholder:text-muted-foreground/30"
        maxLength={200}
        autoFocus
      />
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground">Отмена</button>
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white disabled:opacity-50"
        >
          {loading ? '...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

function ColorPicker({ tgId, currentColor, onSave, isPremium }: { tgId: number; currentColor: string; onSave: (color: string) => void; isPremium: boolean }) {
  const COLORS = ['#DC2650', '#7C3AED', '#2563EB', '#059669', '#D97706', '#DB2777', '#4B5563'];
  const [loading, setLoading] = useState(false);

  const handleSelect = async (color: string) => {
    if (!isPremium) {
      WebApp.showPopup({ 
        title: '💎 Premium функция', 
        message: 'Смена цвета профиля доступна только пользователям с Premium подпиской.' 
      });
      return;
    }
    setLoading(true);
    try {
      const res = await updateUserProfile(tgId, { accent_color: color });
      onSave(res.accent_color);
      WebApp.HapticFeedback.selectionChanged();
    } catch (e) {
      WebApp.HapticFeedback.notificationOccurred('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Цвет профиля</p>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => handleSelect(c)}
            disabled={loading}
            className={`w-8 h-8 rounded-full border-2 transition-all active:scale-95 flex-shrink-0 ${currentColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent shadow-md opacity-70'}`}
            style={{ backgroundColor: c }}
          />
        ))}
        {!isPremium && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center"><Crown className="w-4 h-4 text-muted-foreground/30" /></div>}
      </div>
    </div>
  );
}

// ── Main Profile ──────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, setUser } = useAppStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'my' | 'liked'>('my');
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [likedStories, setLikedStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

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
  const accentColor = user.accent_color || '#DC2650';

  return (
    <div className="min-h-screen pb-24 animate-fade-in relative overflow-hidden">
      
      {/* ── Background Glow ── */}
      <div className="fixed top-0 left-0 right-0 h-96 opacity-10 blur-[120px] pointer-events-none z-0" 
           style={{ backgroundColor: accentColor }} />

      {/* ── Profile Header ── */}
      <div className="relative pt-12 px-6">
        
        {/* Top Actions */}
        <div className="flex justify-end gap-3 mb-6 relative z-10">
            <button 
                onClick={() => navigate('/store')}
                className="h-10 px-4 glass rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest border border-yellow-500/20 active:scale-95 transition-all text-yellow-400"
            >
                <ShoppingBag className="w-4 h-4" />
                Магазин
            </button>
        </div>

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
                    onClick={() => WebApp.showPopup({ title: 'Редактор профиля', message: 'Нажмите на никнейм или блок "О себе" для редактирования.' })}
                    className="flex-1 h-11 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest"
                >
                    Изменить профиль
                </button>
            </div>
        </div>

        {/* Bio Section */}
        <BioEditor 
            tgId={user.tg_id} 
            currentBio={user.bio || ''} 
            onSave={(b) => setUser({ ...user, bio: b })} 
        />

        {/* Profile Color Selection */}
        <ColorPicker 
            tgId={user.tg_id} 
            currentColor={accentColor} 
            onSave={(c) => setUser({ ...user, accent_color: c })} 
            isPremium={isPremium} 
        />

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

