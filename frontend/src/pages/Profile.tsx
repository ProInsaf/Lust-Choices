import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { fetchUserStories, fetchLikedStories, updateUserNickname, createPremiumInvoice, verifyPremium } from '../api';
import { Story, HARDNESS_LABEL } from '../types';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Heart, Star, ChevronRight, Clock, CheckCircle, XCircle, Edit3, Check, X, Crown, Zap, Shield, Sparkles, TrendingUp, Gem } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

const STATUS_CONFIG = {
  pending:  { label: 'На проверке', icon: <Clock className="w-3.5 h-3.5" />, cls: 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30' },
  approved: { label: 'Одобрено',    icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'text-green-400 bg-green-900/30 border-green-500/30' },
  rejected: { label: 'Отклонено',   icon: <XCircle className="w-3.5 h-3.5" />,    cls: 'text-red-400 bg-red-900/30 border-red-500/30' },
};

// ── Subscription Card ─────────────────────────────────────────────────────────
function SubscriptionSection({ user, onUpgrade }: { user: any; onUpgrade: (newUser: any) => void }) {
  const [loading, setLoading] = useState(false);
  const isPremium = user.subscription_tier === 'premium';

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // 1. Create Invoice Link
      const { invoice_link } = await createPremiumInvoice(user.tg_id);
      
      // 2. Open Telegram Invoice
      WebApp.openInvoice(invoice_link, async (status) => {
        if (status === 'paid') {
          try {
            // 3. Verify Payment and Upgrade
            const updatedUser = await verifyPremium(user.tg_id, 'STAR_PAYMENT_PROCESSED');
            WebApp.HapticFeedback.notificationOccurred('success');
            WebApp.showPopup({
              title: '👑 Premium Активирован!',
              message: 'Поздравляем! Теперь у вас есть полный доступ ко всем функциям платформы.'
            });
            onUpgrade(updatedUser);
          } catch (e) {
            console.error('Verification failed', e);
            WebApp.showPopup({ title: 'Ошибка', message: 'Не удалось подтвердить оплату. Обратитесь в поддержку.' });
          }
        } else if (status === 'cancelled') {
           // Standard cancel, no need for popup
        } else {
          WebApp.showPopup({ title: 'Оплата не прошла', message: 'Произошла ошибка при проведении транзакции.' });
        }
        setLoading(false);
      });
    } catch (err) {
      console.error('Invoice creation failed', err);
      WebApp.showPopup({ title: 'Ошибка', message: 'Не удалось создать счет на оплату. Попробуйте позже.' });
      setLoading(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-4 h-4 text-yellow-400" />
        <h2 className="text-sm font-black uppercase tracking-wider">Подписка</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Basic Card */}
        <div className={`relative rounded-2xl p-4 border transition-all ${
          !isPremium 
            ? 'border-primary/40 bg-primary/5 shadow-[0_0_20px_rgba(220,38,80,0.1)]' 
            : 'border-white/5 bg-white/[0.02]'
        }`}>
          {!isPremium && (
            <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-primary text-white shadow-lg">
              Текущий
            </div>
          )}
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
            <Shield className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-black mb-1">Basic</h3>
          <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">Бесплатный доступ к платформе</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">3 сюжета/мес</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Комиссия 15%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Базовый профиль</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5">
            <span className="text-lg font-black">Free</span>
          </div>
        </div>

        {/* Premium Card */}
        <div className={`relative rounded-2xl p-4 border transition-all overflow-hidden ${
          isPremium 
            ? 'border-yellow-500/40 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.1)]' 
            : 'border-white/10 bg-white/[0.02] hover:border-yellow-500/20'
        }`}>
          {/* Premium glow bg */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 blur-2xl rounded-full translate-x-6 -translate-y-6 pointer-events-none" />
          
          {isPremium && (
            <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg">
              Активна
            </div>
          )}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
               style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.2), rgba(245,158,11,0.2))' }}>
            <Gem className="w-5 h-5 text-yellow-400" />
          </div>
          <h3 className="text-sm font-black mb-1 flex items-center gap-1.5">
            Premium
            <Sparkles className="w-3 h-3 text-yellow-400" />
          </h3>
          <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">Максимум возможностей</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-200/80">∞ сюжетов</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-200/80">Комиссия 10%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-200/80">💎 Бейдж автора</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-200/80">Ранний доступ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-200/80">Приоритет в ленте</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-yellow-500/10">
            <span className="text-lg font-black text-yellow-400">149</span>
            <span className="text-xs text-muted-foreground ml-1">⭐/мес</span>
          </div>
          {!isPremium && (
            <button 
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full mt-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-black transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #EAB308, #F59E0B)' }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>Оформить <Crown className="w-3.5 h-3.5" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Nickname Editor ───────────────────────────────────────────────────────────
function NicknameEditor({ tgId, currentNickname, onSave }: { tgId: number; currentNickname: string; onSave: (nick: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentNickname);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setError('Минимум 3 символа');
      return;
    }
    if (trimmed === currentNickname) {
      setEditing(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await updateUserNickname(tgId, trimmed);
      WebApp.HapticFeedback.notificationOccurred('success');
      onSave(res.nickname);
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Этот ник уже занят');
      WebApp.HapticFeedback.notificationOccurred('error');
    } finally {
      setLoading(false);
    }
  };

  if (!editing) {
    return (
      <button 
        onClick={() => { setEditing(true); setValue(currentNickname); }}
        className="flex-1 h-12 glass rounded-2xl flex items-center justify-center gap-2 text-sm font-bold active:scale-95 transition-all border border-white/5"
      >
        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
          <Edit3 className="w-4 h-4 text-muted-foreground" />
        </div>
        Изменить ник
      </button>
    );
  }

  return (
    <div className="flex-1 animate-fade-in">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
            placeholder="Новый никнейм..."
            className={`w-full h-12 bg-white/5 rounded-2xl px-4 text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${
              error ? 'border-red-500/50' : 'border-white/5'
            }`}
            autoFocus
            maxLength={30}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-green-500/30 bg-green-500/10"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5 text-green-400" />
          )}
        </button>
        <button
          onClick={() => { setEditing(false); setError(null); }}
          className="w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-white/5 bg-white/5"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
      {error && (
        <p className="text-[10px] text-red-400 font-bold mt-1.5 px-1 animate-fade-in">{error}</p>
      )}
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
          <p className="text-muted-foreground">Откройте через Telegram</p>
        </div>
      </div>
    );
  }

  const avatarLetter = (user.first_name || user.username || 'U')[0].toUpperCase();
  const isPremium = user.subscription_tier === 'premium';

  return (
    <div className="min-h-screen pb-24 animate-fade-in">
      {/* ── Profile Header ── */}
      <div className="relative">
        {/* BG gradient */}
        <div
          className="h-36"
          style={{ background: isPremium 
            ? 'linear-gradient(135deg, hsl(45,90%,20%), hsl(30,80%,18%))' 
            : 'linear-gradient(135deg, hsl(346,80%,20%), hsl(270,55%,20%))' 
          }}
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
                style={{ background: isPremium
                  ? 'linear-gradient(135deg, hsl(45,90%,45%), hsl(30,80%,40%))'
                  : 'linear-gradient(135deg, hsl(346,80%,45%), hsl(270,55%,40%))'
                }}
                >
                {avatarLetter}
                </div>
            )}
            {/* Status Indicator */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-background rounded-full flex items-center justify-center z-20 shadow-lg">
                {isPremium ? (
                  <Gem className="w-5 h-5 text-yellow-400" />
                ) : (
                  <div className="w-5 h-5 bg-green-500 rounded-full border-4 border-background animate-pulse" />
                )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black leading-tight truncate gradient-text">
                {user.nickname || user.first_name || user.username || 'Пользователь'}
                </h1>
                {user.is_admin && <span className="bg-primary/20 text-primary text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter border border-primary/30">Admin</span>}
                {isPremium && <span className="bg-yellow-500/20 text-yellow-400 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter border border-yellow-500/30">PRO</span>}
            </div>
            <div className="flex flex-col gap-1">
               {user.username && (
                 <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider opacity-60">
                    @{user.username}
                 </p>
               )}
               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/5 rounded-full w-fit">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPremium ? 'bg-yellow-400' : 'bg-primary'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isPremium ? 'text-yellow-400/80' : 'text-primary/80'}`}>
                    {isPremium ? 'Premium Member' : 'Basic Member'}
                  </span>
               </div>
            </div>
          </div>
        </div>

        {/* Action Bar — now just the nickname editor */}
        <div className="flex gap-2 mb-8">
          <NicknameEditor 
            tgId={user.tg_id} 
            currentNickname={user.nickname || ''} 
            onSave={(nick) => setUser({ ...user, nickname: nick })} 
          />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-2 mb-6">
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
            <p className="text-[10px] text-muted-foreground">Баланс</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto text-green-400 mb-1" />
            <p className="text-xl font-black">{user.total_earned_stars || 0}</p>
            <p className="text-[10px] text-muted-foreground">Доход</p>
          </div>
        </div>

        {/* Earnings info bar */}
        {(user.total_earned_stars || 0) > 0 && (
          <div className="glass rounded-2xl p-4 mb-6 border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">Заработок</p>
                  <p className="text-[10px] text-muted-foreground">
                    Комиссия: {isPremium ? '10%' : '15%'} · {isPremium ? 'Premium' : 'Сниженная с Premium'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-green-400">{user.total_earned_stars} ⭐</p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Section */}
        <SubscriptionSection user={user} onUpgrade={(newUser) => setUser(newUser)} />

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
