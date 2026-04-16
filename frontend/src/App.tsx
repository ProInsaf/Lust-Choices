import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import Gallery from './pages/Gallery';
import StoryDetail from './pages/StoryDetail';
import Upload from './pages/Upload';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { useAppStore } from './store';
import { upsertUser, trackEvent } from './api';
import { Home, PlusCircle, User } from 'lucide-react';

import Onboarding from './components/Onboarding';

// ─── Nav Item ────────────────────────────────────────────────────────────────
function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'nav-active' : 'text-muted-foreground'}`}
    >
      <div
        className={`p-2 rounded-xl transition-all ${active ? 'bg-primary/20' : 'bg-transparent'}`}
      >
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </Link>
  );
}

// ─── Bottom Nav (hidden on detail/admin pages) ───────────────────────────────
function BottomNav() {
  const location = useLocation();
  const hidden = location.pathname.startsWith('/story/') || location.pathname === '/admin';
  if (hidden) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-2xl border-t border-white/5 pb-safe rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
      <div className="flex justify-around items-center px-6 py-4">
        <NavItem to="/"        icon={<Home size={22} />}       label="Галерея" />
        <NavItem to="/upload"  icon={<PlusCircle size={22} />} label="Создать" />
        <NavItem to="/profile" icon={<User size={22} />}       label="Профиль" />
      </div>
    </nav>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function AppContent() {
  const { user, setUser } = useAppStore();

  useEffect(() => {
    // Initialize Telegram WebApp
    WebApp.ready();
    WebApp.expand();
    WebApp.setHeaderColor('#0a0a0a');
    WebApp.setBackgroundColor('#0a0a0a');

    // Get Telegram user
    const tgUser = WebApp.initDataUnsafe?.user;
    if (tgUser) {
      upsertUser({
        tg_id: tgUser.id,
        username: tgUser.username,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name,
        photo_url: (tgUser as any).photo_url,
      })
        .then((profile) => {
          setUser(profile);
          trackEvent('app_open', profile.tg_id);
        })
        .catch(() => {
          // Fallback offline user
          setUser({
            tg_id: tgUser.id,
            username: tgUser.username || null,
            nickname: null,
            first_name: tgUser.first_name || null,
            last_name: tgUser.last_name || null,
            photo_url: null,
            is_admin: false,
            is_banned: false,
            stars_balance: 0,
            total_spent_stars: 0,
            total_seconds_spent: 0,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
          });
        });
    }
  }, [setUser]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background Decor */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-float" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[150px] pointer-events-none animate-float" style={{ animationDelay: '-3s' }} />

      {/* Onboarding Overlay */}
      {user && !user.nickname && (
        <Onboarding 
            tgId={user.tg_id} 
            onComplete={(nick) => setUser({ ...user, nickname: nick })} 
        />
      )}

      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <Routes>
          <Route path="/"           element={<Gallery />}     />
          <Route path="/story/:id"  element={<StoryDetail />} />
          <Route path="/upload"     element={<Upload />}      />
          <Route path="/profile"    element={<Profile />}     />
          <Route path="/admin"      element={<Admin />}       />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
