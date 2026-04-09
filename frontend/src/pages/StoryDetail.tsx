import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Heart, Play, Share2, Film, Star,
  User, Calendar, Tag, Lock
} from 'lucide-react';
import { fetchStory, toggleLike, checkLiked, checkPurchased, recordPlay } from '../api';
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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchStory(id)
      .then(async (s) => {
        setStory(s);
        setLikesCount(s.likes_count);
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
    } finally {
      setLikeLoading(false);
    }
  };

  const handlePlay = async () => {
    if (!story || !user) return;
    if (!purchased && story.price_stars > 0) {
      // Trigger Telegram Stars payment via bot
      WebApp.openTelegramLink(
        `https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'lustchoices_bot'}?start=buy_${story.id}`
      );
      return;
    }
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="skeleton h-72 w-full" />
        <div className="px-4 py-6 space-y-4">
          <div className="skeleton h-8 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/3 rounded" />
          <div className="skeleton h-24 w-full rounded" />
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

  return (
    <div className="min-h-screen pb-24 animate-fade-in">
      {/* ── Hero Image ── */}
      <div className="relative">
        <div className="h-72 overflow-hidden relative">
          <img
            src={story.preview_url}
            alt={story.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 glass p-2.5 rounded-full text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="px-4 -mt-8 relative z-10">
        {/* Title & badges */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border border-white/10 ${hardnessClass}`}>
              {hardnessLabel}
            </span>
            {story.price_stars === 0 ? (
              <span className="bg-green-900/40 text-green-400 border border-green-500/30 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                Бесплатно
              </span>
            ) : (
              <span className="bg-yellow-900/40 text-yellow-300 border border-yellow-400/30 px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-300" />
                {story.price_stars} Stars
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-foreground leading-tight">{story.title}</h1>
        </div>

        {/* Meta info */}
        <div className="glass rounded-xl p-3 mb-4 grid grid-cols-3 divide-x divide-white/10">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
              <Film className="w-3 h-3" />
              <span>Сцены</span>
            </div>
            <span className="font-bold text-sm">{story.scenes_count}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
              <Heart className="w-3 h-3" />
              <span>Лайки</span>
            </div>
            <span className="font-bold text-sm">{likesCount}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
              <Play className="w-3 h-3" />
              <span>Играли</span>
            </div>
            <span className="font-bold text-sm">{story.plays_count}</span>
          </div>
        </div>

        {/* Author */}
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span>@{story.author_username || story.author_first_name || 'anonymous'}</span>
          <Calendar className="w-4 h-4 ml-auto" />
          <span>{new Date(story.created_at).toLocaleDateString('ru-RU')}</span>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed mb-5">
          {story.description}
        </p>

        {/* Tags */}
        {story.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {story.tags.map((tag) => (
              <span key={tag} className="tag-badge flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mb-6">
          {/* Play / Buy */}
          <button
            onClick={handlePlay}
            className="flex-1 btn-primary animate-pulse-glow"
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
            <Heart className={`w-5 h-5 ${liked ? 'fill-red-400' : ''}`} />
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
