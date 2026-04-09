import { create } from 'zustand';
import { UserProfile } from './types';

interface AppState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  isAdmin: boolean;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAdmin: false,
  setUser: (user) =>
    set({
      user,
      isAdmin: user?.is_admin ?? false,
    }),
}));
