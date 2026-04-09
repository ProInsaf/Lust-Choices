import React from 'react';
import { Story, HARDNESS_LABEL, HARDNESS_CLASS } from '../types';
import { Heart, Star, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  story: Story;
  style?: React.CSSProperties;
}

export default function StoryCard({ story, style }: Props) {
  const navigate = useNavigate();

  return (
    <div
      className="story-card bg-card rounded-2xl overflow-hidden border border-border cursor-pointer animate-fade-in"
      style={style}
      onClick={() => navigate(`/story/${story.id}`)}
    >
      {/* Preview Image */}
      <div className="relative h-44 overflow-hidden bg-muted">
        <img
          src={story.preview_url}
          alt={story.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23111" width="100" height="100"/%3E%3Ctext fill="%23333" x="50" y="55" text-anchor="middle" font-size="30"%3E🔥%3C/text%3E%3C/svg%3E';
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Price badge */}
        <div className="absolute top-2 right-2">
          {story.price_stars === 0 ? (
            <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-xs font-bold text-green-400 border border-green-500/30">
              FREE
            </span>
          ) : (
            <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-xs font-bold text-yellow-300 flex items-center gap-1 border border-yellow-400/30">
              <Star className="w-3 h-3 fill-yellow-300" />
              {story.price_stars}
            </span>
          )}
        </div>

        {/* Hardness badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border border-white/10 ${HARDNESS_CLASS[story.hardness_level] || ''}`}
          >
            {HARDNESS_LABEL[story.hardness_level] || 'Soft'}
          </span>
        </div>

        {/* Bottom stats */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <Film className="w-3 h-3" />
            <span>{story.scenes_count} сцен</span>
          </div>
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <Heart className="w-3 h-3 fill-red-400 text-red-400" />
            <span>{story.likes_count}</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm leading-tight truncate">{story.title}</h3>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          @{story.author_username || story.author_first_name || 'anonymous'}
        </p>

        {/* Tags */}
        {story.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {story.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="tag-badge">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
