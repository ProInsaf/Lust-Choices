import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Heart, Play, Share2, Film, Star,
  Lock, ChevronDown, ChevronUp,
  Eye, Clock, BarChart3
} from 'lucide-react';
import { fetchStory, toggleLike, checkLiked, checkPurchased, recordPlay, trackEvent } from '../api';
import { Story, HARDNESS_LABEL, HARDNESS_CLASS } from '../types';
import { useAppStore } from '../store';
import WebApp from '@twa-dev/sdk';

export default function StoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [purchased, setPurchased] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Touch swipe support
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchStory(id)
      .then(async (s) => {
        setStory(s);
        setLikesCount(s.likes_count);
        // Track story view
        if (user) {
          trackEvent('story_viewed', user.tg_id, s.id);
        }
        if (user) {
          const [lk, pur] = await Promise.all([
            checkLiked(s.id, user.tg_id),
            checkPurchased(s.id, user.tg_id),
          ]);
          setLiked(lk.liked);
          setPurchased(pur.purchased);
        }
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  // Back button
  useEffect(() => {
    WebApp.BackButton.show();
    WebApp.BackButton.onClick(() => navigate(-1));
    return () => { WebApp.BackButton.hide(); };
  }, [navigate]);

  const handleLike = async () => {
    if (!story || !user || likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await toggleLike(story.id, user.tg_id);
      setLiked(res.liked);
      setLikesCount(res.likes_count);
      WebApp.HapticFeedback.impactOccurred('light');
    } finally {
      setLikeLoading(false);
    }
  };

  const handlePlay = async () => {
    if (!story || !user) return;
    if (!purchased && story.price_stars > 0) {
      WebApp.openTelegramLink(
        `https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'lustchoices_bot'}?start=buy_${story.id}`
      );
      return;
    }
    trackEvent('story_started', user.tg_id, story.id);
    await recordPlay(story.id, user.tg_id);
    WebApp.openTelegramLink(
      `https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'lustchoices_bot'}?start=play_${story.id}`
    );
  };

  const handleShare = () => {
    if (!story) return;
    WebApp.openTelegramLink(
      `https://t.me/share/url?url=https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'lustchoices_bot'}?start=story_${story.id}&text=${encodeURIComponent(story.title)}`
    );
  };

  const handleSwipe = (images: string[]) => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && activeImg < images.length - 1) setActiveImg(a => a + 1);
      if (diff < 0 && activeImg > 0) setActiveImg(a => a - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="skeleton h-80 w-full" />
        <div className="px-4 py-6 space-y-4">
          <div className="skeleton h-8 w-3/4 rounded-xl" />
          <div className="skeleton h-4 w-1/3 rounded-xl" />
          <div className="skeleton h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-muted-foreground">Сюжет не найден</p>
        </div>
      </div>
    );
  }

  const hardnessClass = HARDNESS_CLASS[story.hardness_level];
  const hardnessLabel = HARDNESS_LABEL[story.hardness_level];
  const images = story.preview_urls && story.preview_urls.length > 0 ? story.preview_urls : [story.preview_url];
  const displayDescription = story.long_description || story.description;
  const isLongDesc = displayDescription.length > 200;
  const engagementMinutes = Math.round(story.total_seconds_spent / 60);

  return (
    <div className="min-h-screen pb-28 animate-fade-in">
      {/* ── Hero Image Gallery ── */}
      <div className="relative">
        <div
          className="h-[360px] overflow-hidden relative bg-black"
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            touchEndX.current = e.changedTouches[0].clientX;
            handleSwipe(images);
          }}
        >
          <div
            className="flex transition-transform duration-500 ease-out h-full"
            style={{ transform: `translateX(-${activeImg * 100}%)`, width: `${images.length * 100}%` }}
          >
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`${story.title} ${i}`}
                className="w-full h-full object-cover flex-shrink-0"
                style={{ width: `${100 / images.length}%` }}
              />
            ))}
          </div>

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30 pointer-events-none" />

          {/* Gallery Indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1.5 z-20">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${activeImg === i ? 'w-7 bg-primary shadow-lg shadow-primary/50' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                />
              ))}
            </div>
          )}

          {/* Image counter badge */}
          {images.length > 1 && (
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-xl px-2.5 py-1 rounded-lg text-[10px] font-bold border border-white/10 z-20">
              {activeImg + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 glass p-2.5 rounded-full text-white z-30 shadow-xl active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="px-4 -mt-10 relative z-10">
        {/* Badges row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border border-white/10 ${hardnessClass}`}>
            {hardnessLabel}
          </span>
          {story.price_stars === 0 ? (
            <span className="bg-green-900/40 text-green-400 border border-green-500/30 px-2.5 py-1 rounded-xl text-xs font-bold">
              Бесплатно
            </span>
          ) : (
            <span className="bg-yellow-900/40 text-yellow-300 border border-yellow-400/30 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-300" />
              {story.price_stars} Stars
            </span>
          )}
          {story.completion_rate > 0 && (
            <span className="bg-purple-900/40 text-purple-300 border border-purple-400/30 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {Math.round(story.completion_rate)}%
            </span>
          )}
        </div>

        {/* Title */}
        <div className="mb-4">
            <h1 className="text-3xl font-black text-foreground leading-[1.15] tracking-tight mb-1 glow-text-primary">{story.title}</h1>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-50">Story id: {story.id.toString().slice(0, 8)}</p>
        </div>

        {/* Author card */}
        <div className="flex items-center gap-4 mb-6 glass-thick rounded-3xl p-4 border border-white/10 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-lg font-black shadow-lg border border-white/20">
            {story.author_nickname?.[0] || story.author_first_name?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm truncate uppercase tracking-wider">
              {story.author_nickname || story.author_first_name || story.author_username || 'anonymous'}
            </div>
            <div className="text-[10px] text-primary font-black flex items-center gap-1 uppercase tracking-widest mt-0.5">
               Verified Author
            </div>
          </div>
          <div className="flex flex-col items-end opacity-60">
             <span className="text-[9px] font-black uppercase tracking-widest">Released</span>
             <span className="text-[10px] font-bold">{new Date(story.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>


        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <div className="glass rounded-2xl p-3 text-center border border-border/30">
            <Film className="w-4 h-4 mx-auto mb-1 text-blue-400" />
            <div className="text-sm font-black">{story.scenes_count}</div>
            <div className="text-[9px] text-muted-foreground font-bold uppercase">Сцены</div>
          </div>
          <div className="glass rounded-2xl p-3 text-center border border-border/30">
            <Heart className="w-4 h-4 mx-auto mb-1 text-red-400" />
            <div className="text-sm font-black">{likesCount}</div>
            <div className="text-[9px] text-muted-foreground font-bold uppercase">Лайки</div>
          </div>
          <div className="glass rounded-2xl p-3 text-center border border-border/30">
            <Eye className="w-4 h-4 mx-auto mb-1 text-green-400" />
            <div className="text-sm font-black">{story.plays_count}</div>
            <div className="text-[9px] text-muted-foreground font-bold uppercase">Играли</div>
          </div>
          <div className="glass rounded-2xl p-3 text-center border border-border/30">
            <Clock className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
            <div className="text-sm font-black">{engagementMinutes}м</div>
            <div className="text-[9px] text-muted-foreground font-bold uppercase">Время</div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Описание</h3>
          <p className={`text-muted-foreground text-sm leading-relaxed ${!showFullDesc && isLongDesc ? 'line-clamp-4' : ''}`}>
            {displayDescription}
          </p>
          {isLongDesc && (
            <button
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="flex items-center gap-1 text-primary text-xs font-bold mt-2 hover:opacity-80 transition-opacity"
            >
              {showFullDesc ? <><ChevronUp className="w-3 h-3" /> Свернуть</> : <><ChevronDown className="w-3 h-3" /> Читать полностью</>}
            </button>
          )}
        </div>

        {/* Characters info (if available) */}
        {story.characters_info && typeof story.characters_info === 'object' && Object.keys(story.characters_info).length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Персонажи</h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {Object.entries(story.characters_info).map(([name, info]) => (
                <div key={name} className="flex-shrink-0 w-28 glass rounded-2xl p-3 border border-border/30 text-center">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-lg mb-2 border border-primary/10">
                    {typeof info === 'object' && info?.emoji ? info.emoji : '👤'}
                  </div>
                  <div className="text-xs font-bold truncate">{name}</div>
                  {typeof info === 'object' && info?.role && (
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">{info.role}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {story.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Теги</h3>
            <div className="flex flex-wrap gap-1.5">
              {story.tags.map((tag) => (
                <span key={tag} className="tag-badge flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed Bottom Action Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border p-4 pb-safe">
        <div className="flex gap-2.5">
          {/* Play / Buy */}
          <button
            onClick={handlePlay}
            className="flex-1 btn-primary animate-pulse-glow text-sm"
          >
            {story.price_stars > 0 && !purchased ? (
              <>
                <Lock className="w-4 h-4" />
                Купить за ⭐ {story.price_stars}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Играть в боте
              </>
            )}
          </button>

          {/* Like */}
          <button
            onClick={handleLike}
            disabled={likeLoading}
            className={`p-3.5 rounded-xl border transition-all active:scale-95 ${
              liked
                ? 'bg-red-900/40 border-red-500/40 text-red-400'
                : 'bg-card border-border text-foreground'
            }`}
          >
            <Heart className={`w-5 h-5 transition-transform ${liked ? 'fill-red-400 scale-110' : ''}`} />
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="p-3.5 rounded-xl border border-border bg-card text-foreground active:scale-95 transition-all"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
