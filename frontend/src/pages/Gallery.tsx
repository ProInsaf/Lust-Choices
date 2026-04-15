import React, { useEffect, useState, useCallback } from 'react';
import { Search, Flame, TrendingUp, Heart, Gift, Star, X, Sparkles } from 'lucide-react';
import { fetchStories, fetchRecommended } from '../api';
import { Story, SortFilter } from '../types';
import StoryCard from '../components/StoryCard';
import SkeletonCard from '../components/SkeletonCard';
import { useAppStore } from '../store';

const FILTERS: { key: SortFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'new',      label: 'Новые',    icon: <Flame className="w-3.5 h-3.5" /> },
  { key: 'popular',  label: 'Топ',      icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: 'top_liked',label: 'Лайки',    icon: <Heart className="w-3.5 h-3.5" /> },
  { key: 'free',     label: 'Бесплатно',icon: <Gift className="w-3.5 h-3.5" /> },
  { key: 'paid',     label: 'Платные',  icon: <Star className="w-3.5 h-3.5" /> },
];

/* ── Horizontal Row Component ──────────────────────────────────────────── */
function StoryRow({ title, icon, stories, loading }: { title: string; icon: React.ReactNode; stories: Story[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="mb-7">
        <div className="flex items-center gap-2 px-4 mb-3">
          {icon}
          <h2 className="text-sm font-black uppercase tracking-wider">{title}</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pl-4 pr-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-36">
              <SkeletonCard />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stories.length === 0) return null;

  return (
    <div className="mb-7">
      <div className="flex items-center gap-2 px-4 mb-3">
        {icon}
        <h2 className="text-sm font-black uppercase tracking-wider">{title}</h2>
        <span className="text-[10px] text-muted-foreground font-bold ml-auto mr-4 uppercase tracking-widest opacity-50">{stories.length}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pl-4 pr-2 pb-1">
        {stories.map((story, i) => (
          <div key={story.id} className="flex-shrink-0 w-40">
            <StoryCard story={story} style={{ animationDelay: `${i * 60}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Gallery() {
  const { user } = useAppStore();
  const [stories, setStories] = useState<Story[]>([]);
  const [recommended, setRecommended] = useState<Story[]>([]);
  const [trending, setTrending] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortFilter>('new');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Load featured rows (For You, Trending)
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const [trendingData] = await Promise.all([
          fetchStories('popular', '', '', 0),
        ]);
        setTrending(trendingData.slice(0, 10));

        if (user) {
          const rec = await fetchRecommended(user.tg_id, 10);
          setRecommended(rec);
        }
      } catch { /* silent */ }
    };
    loadFeatured();
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStories(sort, search);
      setStories(data);
    } catch {
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [sort, search]);

  useEffect(() => {
    load();
  }, [load]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setIsSearchMode(searchInput.length > 0);
  }, [searchInput]);

  return (
    <div className="min-h-screen pb-24">
      {/* ── Header ── */}
      <div className="pt-5 px-4 pb-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg, hsl(346,80%,50%), hsl(270,55%,48%))' }}>
            🔥
          </div>
          <div>
            <h1 className="text-xl font-black gradient-text leading-none">Lust Choices</h1>
            <p className="text-[10px] text-muted-foreground font-medium">18+ Interactive Stories</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Найти сюжет..."
            className="w-full bg-input rounded-full py-2.5 pl-10 pr-10 text-sm border border-border focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearch(''); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setSort(f.key)}
              className={`filter-chip flex items-center gap-1.5 ${sort === f.key ? 'filter-chip-active' : 'filter-chip-inactive'}`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Featured Rows (hidden during search) ── */}
      {!isSearchMode && (
        <>
          {recommended.length > 0 && (
            <StoryRow
              title="Для тебя"
              icon={<Sparkles className="w-4 h-4 text-yellow-400" />}
              stories={recommended}
              loading={false}
            />
          )}
          {trending.length > 0 && (
            <StoryRow
              title="В тренде"
              icon={<TrendingUp className="w-4 h-4 text-red-400" />}
              stories={trending}
              loading={false}
            />
          )}

          {/* Section label */}
          <div className="flex items-center gap-2 px-4 mb-3 mt-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-black uppercase tracking-wider">Все сюжеты</h2>
          </div>
        </>
      )}

      {/* ── Grid ── */}
      <div className="px-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="text-5xl mb-4">😔</div>
            <p className="text-muted-foreground font-medium">Сюжеты не найдены</p>
            <p className="text-muted-foreground text-sm mt-1">Попробуй другой запрос</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stories.map((story, i) => (
              <StoryCard
                key={story.id}
                story={story}
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
