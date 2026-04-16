import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { X, Crown, Palette, Type } from 'lucide-react';
import { useAppStore } from '../store';
import { updateUserProfile } from '../api';

interface Themes {
  id: string;
  name: string;
  isPremium: boolean;
  colors: {
    primary: string;
    bgStyle: string;
    borderStyle: string;
  };
}

export const THEMES: Themes[] = [
  {
    id: 'default',
    name: 'Базовая',
    isPremium: false,
    colors: {
      primary: '#DC2650',
      bgStyle: 'bg-[#121212]',
      borderStyle: 'border-white/10'
    }
  },
  {
    id: 'dark_neon',
    name: 'Dark Neon',
    isPremium: false,
    colors: {
      primary: '#8B5CF6',
      bgStyle: 'bg-indigo-950/20',
      borderStyle: 'border-indigo-500/30'
    }
  },
  {
    id: 'glass_pink',
    name: 'Pink Glass',
    isPremium: true,
    colors: {
      primary: '#EC4899',
      bgStyle: 'bg-pink-900/10 backdrop-blur-xl',
      borderStyle: 'border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]'
    }
  },
  {
    id: 'gold_premium',
    name: 'Boss Gold',
    isPremium: true,
    colors: {
      primary: '#EAB308',
      bgStyle: 'bg-yellow-900/10 bg-[url("https://www.transparenttextures.com/patterns/carbon-fibre.png")] bg-blend-overlay',
      borderStyle: 'border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.2)]'
    }
  }
];

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const { user, setUser } = useAppStore();
  const [nickname, setNickname] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (user && isOpen) {
      setNickname(user.nickname || '');
      setSelectedTheme(user.profile_theme || 'default');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const isPremium = user.subscription_tier === 'premium';
  const isAdmin = user.is_admin;
  
  // Calculate cooldown
  let cooldownDaysLeft = 0;
  if (!isAdmin && user.last_nickname_updated_at) {
    const updated = new Date(user.last_nickname_updated_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - updated.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      cooldownDaysLeft = 30 - diffDays;
    }
  }

  const handleSave = async () => {
    if (!nickname.trim()) {
      WebApp.showPopup({ message: 'Никнейм не может быть пустым' });
      return;
    }

    const theme = THEMES.find(t => t.id === selectedTheme);
    if (theme?.isPremium && !isPremium) {
      WebApp.showPopup({ message: 'Эта тема доступна только для Premium пользователей!' });
      return;
    }

    setLoading(true);
    try {
      const updates: { nickname?: string; profile_theme?: string } = {};
      
      if (nickname !== user.nickname) {
        if (cooldownDaysLeft > 0) {
           WebApp.showPopup({ message: `Вы не можете менять никнейм еще ${cooldownDaysLeft} дней.` });
           setLoading(false);
           return;
        }
        updates.nickname = nickname.trim();
      }

      if (selectedTheme !== user.profile_theme) {
        updates.profile_theme = selectedTheme;
      }

      if (Object.keys(updates).length > 0) {
         const updatedUser = await updateUserProfile(user.tg_id, updates);
         setUser(updatedUser);
         WebApp.HapticFeedback.notificationOccurred('success');
      }
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Ошибка при сохранении';
      WebApp.showPopup({ title: 'Ошибка', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1A1A1A] rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">

        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 relative bg-gradient-to-b from-white/5 to-transparent">
          <h2 className="text-xl font-black tracking-tighter">НАСТРОЙКИ</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* Nickname Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Псевдоним</h3>
            </div>
            
            <div className="relative">
              <input 
                type="text" 
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={20}
                disabled={cooldownDaysLeft > 0}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                placeholder="Ваш никнейм..."
              />
              {cooldownDaysLeft > 0 && (
                <div className="mx-2 mt-2 text-[10px] text-red-400 font-bold">
                  Смена недоступна: {cooldownDaysLeft} дней
                </div>
              )}
            </div>
          </div>

          {/* Theme Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Тема профиля</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`relative p-4 rounded-2xl border transition-all text-left overflow-hidden ${theme.colors.bgStyle} ${
                    selectedTheme === theme.id 
                      ? theme.colors.borderStyle + ' ring-2 ring-[var(--primary)] shadow-lg' 
                      : 'border-white/5 opacity-70 hover:opacity-100'
                  }`}
                  style={{ '--primary': theme.colors.primary } as React.CSSProperties}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: theme.colors.primary }} />
                    {theme.isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <div className="text-xs font-black uppercase tracking-wider truncate">
                    {theme.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
          
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-primary text-white font-black uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20 flex justify-center"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </div>
  );
}
