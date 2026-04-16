import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { fetchUserStories, fetchLikedStories } from '../api';
import { Story, HARDNESS_LABEL } from '../types';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Heart, Star, ChevronRight, Clock, CheckCircle, XCircle, User } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import DailyBonus from '../components/DailyBonus';

const STATUS_CONFIG = {
  pending:  { label: 'На проверке', icon: <Clock className="w-3.5 h-3.5" />, cls: 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30' },
  approved: { label: 'Одобрено',    icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'text-green-400 bg-green-900/30 border-green-500/30' },
  rejected: { label: 'Отклонено',   icon: <XCircle className="w-3.5 h-3.5" />,    cls: 'text-red-400 bg-red-900/30 border-red-500/30' },
};

export default function Profile() {
  const { user } = useAppStore();
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
          <p className="text-muted-foreground">Открой через Telegram</p>
        </div>
      </div>
    );
  }

  const avatarLetter = (user.first_name || user.username || 'U')[0].toUpperCase();

  return (
    <div className="min-h-screen pb-24 animate-fade-in">
      {/* ── Profile Header ── */}
      <div className="relative">
        {/* BG gradient */}
        <div
          className="h-36"
          style={{ background: 'linear-gradient(135deg, hsl(346,80%,20%), hsl(270,55%,20%))' }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="px-4 -mt-16 relative z-10">
        {/* Avatar & Info */}
        <div className="flex items-center gap-5 mb-8">
          <div className="relative">
            {user.photo_url ? (
                <img
                src={user.photo_url}
                alt="avatar"
                className="w-24 h-24 rounded-[32px] border-4 border-background object-cover shadow-2xl z-10 relative"
                />
            ) : (
                <div
                className="w-24 h-24 rounded-[32px] border-4 border-background flex items-center justify-center text-4xl font-black text-white shadow-2xl z-10 relative"
                style={{ background: 'linear-gradient(135deg, hsl(346,80%,45%), hsl(270,55%,40%))' }}
                >
                {avatarLetter}
                </div>
            )}
            {/* Status Indicator */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-background rounded-full flex items-center justify-center z-20 shadow-lg">
                <div className="w-5 h-5 bg-green-500 rounded-full border-4 border-background animate-pulse" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black leading-tight truncate gradient-text">
                {user.nickname || user.first_name || user.username || 'Пользователь'}
                </h1>
                {user.is_admin && <span className="bg-primary/20 text-primary text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter border border-primary/30">Admin</span>}
            </div>
            <div className="flex flex-col gap-1">
               {user.username && (
                 <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider opacity-60">
                    @{user.username}
                 </p>
               )}
               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/5 rounded-full w-fit">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">Premium Member</span>
               </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex gap-2 mb-8">
            <button 
                onClick={() => WebApp.showPopup({ title: 'Настройки', message: 'Возможность смены ника и аватара появится в следующем обновлении!' })}
                className="flex-1 h-12 glass rounded-2xl flex items-center justify-center gap-2 text-sm font-bold active:scale-95 transition-all border border-white/5"
            >
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                </div>
                Изменить профиль
            </button>
            <button className="w-12 h-12 glass rounded-2xl flex items-center justify-center active:scale-95 transition-all border border-white/5">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            </button>
        </div>

        <DailyBonus />

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="glass rounded-xl p-3 text-center">
            <BookOpen className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-xl font-black">{myStories.length}</p>
            <p className="text-[10px] text-muted-foreground">Сюжета</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <Heart className="w-4 h-4 mx-auto text-red-400 mb-1" />
            <p className="text-xl font-black">{likedStories.length}</p>
            <p className="text-[10px] text-muted-foreground">Лайков</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <Star className="w-4 h-4 mx-auto text-yellow-400 fill-yellow-400 mb-1" />
            <p className="text-xl font-black">{user.stars_balance}</p>
            <p className="text-[10px] text-muted-foreground">Stars</p>
          </div>
        </div>

        {/* Admin panel link */}
        {user.is_admin && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full mb-4 p-3.5 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive font-semibold text-sm flex items-center justify-between"
          >
            <span>🛡️ Панель администратора</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mb-4">
          <button
            onClick={() => setTab('my')}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
              tab === 'my' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            Мои сюжеты
          </button>
          <button
            onClick={() => setTab('liked')}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
              tab === 'liked' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            Любимое
          </button>
        </div>

        {/* Story list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : displayStories.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <div className="text-5xl mb-3">{tab === 'my' ? '📝' : '💔'}</div>
            <p className="text-muted-foreground font-medium">
              {tab === 'my' ? 'Нет загруженных сюжетов' : 'Нет понравившихся сюжетов'}
            </p>
            {tab === 'my' && (
              <button
                onClick={() => navigate('/upload')}
                className="mt-4 px-5 py-2 rounded-xl font-semibold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, hsl(346,80%,50%), hsl(270,55%,48%))' }}
              >
                Загрузить сюжет
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayStories.map((story) => {
              const sc = STATUS_CONFIG[story.status];
              return (
                <div
                  key={story.id}
                  onClick={() => navigate(`/story/${story.id}`)}
                  className="flex gap-3 bg-card border border-border rounded-xl p-3 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <img
                    src={story.preview_url}
                    alt={story.title}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{story.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{HARDNESS_LABEL[story.hardness_level]}</p>
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {tab === 'my' && (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${sc.cls}`}>
                          {sc.icon}
                          {sc.label}
                        </span>
                      )}
                      {story.reject_reason && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {story.reject_reason.slice(0, 40)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                    <span className="text-xs ml-1 text-muted-foreground">{story.likes_count}</span>
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
