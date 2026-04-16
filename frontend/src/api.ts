import axios from 'axios';
import { Story, SortFilter, UserProfile } from './types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || 'insafbober';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'ngrok-skip-browser-warning': 'true' }
});

const adminApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
    'x-admin-key': ADMIN_KEY
  },
});

// ─── Stories ─────────────────────────────────────────────────────────────────

export const fetchStories = async (
  sort: SortFilter = 'new',
  search = '',
  tag = '',
  skip = 0,
): Promise<Story[]> => {
  const { data } = await api.get('/stories/', {
    params: { sort, search: search || undefined, tag: tag || undefined, skip, limit: 20 },
  });
  return data;
};

export const fetchStory = async (id: string): Promise<Story> => {
  const { data } = await api.get(`/stories/${id}`);
  return data;
};

export const fetchUserStories = async (tgId: number): Promise<Story[]> => {
  const { data } = await api.get(`/stories/user/${tgId}`);
  return data;
};

export const fetchLikedStories = async (tgId: number): Promise<Story[]> => {
  const { data } = await api.get(`/stories/user/${tgId}/liked`);
  return data;
};

export const uploadStory = async (formData: FormData): Promise<Story> => {
  const { data } = await api.post('/stories/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// ─── Likes ───────────────────────────────────────────────────────────────────

export const toggleLike = async (storyId: string, userTgId: number) => {
  const { data } = await api.post(`/stories/${storyId}/like`, null, {
    params: { user_tg_id: userTgId },
  });
  return data as { liked: boolean; likes_count: number };
};

export const checkLiked = async (storyId: string, userTgId: number) => {
  const { data } = await api.get(`/stories/${storyId}/liked`, {
    params: { user_tg_id: userTgId },
  });
  return data as { liked: boolean };
};

// ─── Purchase ─────────────────────────────────────────────────────────────────

export const checkPurchased = async (storyId: string, userTgId: number) => {
  const { data } = await api.get(`/stories/${storyId}/purchased`, {
    params: { user_tg_id: userTgId },
  });
  return data as { purchased: boolean; free: boolean };
};

export const recordPlay = async (storyId: string, userTgId: number) => {
  const { data } = await api.post(`/stories/${storyId}/play`, null, {
    params: { user_tg_id: userTgId },
  });
  return data;
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const upsertUser = async (profile: {
  tg_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}): Promise<UserProfile> => {
  const { data } = await api.post('/users/upsert', profile);
  return data;
};

export const updateUserNickname = async (tgId: number, nickname: string) => {
  const { data } = await api.post(`/users/${tgId}/nickname`, { nickname });
  return data;
};

export const syncActivity = async (user_tg_id: number, seconds: number, story_id?: string) => {
  const { data } = await api.post('/users/activity', { user_tg_id, seconds, story_id });
  return data;
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const fetchAdminPending = async (): Promise<Story[]> => {
  const { data } = await adminApi.get('/admin/stories/pending');
  return data;
};

export const fetchAdminAll = async (status?: string): Promise<Story[]> => {
  const { data } = await adminApi.get('/admin/stories/all', {
    params: { status },
  });
  return data;
};

export const adminApprove = async (storyId: string) => {
  const { data } = await adminApi.post(`/admin/stories/${storyId}/approve`);
  return data;
};

export const adminReject = async (storyId: string, reason: string) => {
  const { data } = await adminApi.post(`/admin/stories/${storyId}/reject`, { reason });
  return data;
};

export const adminDelete = async (storyId: string) => {
  const { data } = await adminApi.delete(`/admin/stories/${storyId}`);
  return data;
};

export interface AdminStats {
  summary: {
    stories_total: number;
    stories_pending: number;
    stories_approved: number;
    stories_rejected: number;
    stories_last_7d: number;
    users_total: number;
    users_active_24h: number;
    users_active_7d: number;
    users_new_24h: number;
    stars_spent_total: number;
    stars_in_balances: number;
    plays_total: number;
    likes_total: number;
    engagement_total_hours: number;
    engagement_avg_minutes: number;
    conversion_rate: number;
    avg_purchase_value: number;
    unique_buyers: number;
  };
  top_stories: { id: string; title: string; plays: number; seconds: number; author: string }[];
  top_authors: { tg_id: number; name: string; plays: number; seconds: number }[];
  chart_data: { date: string; new_users: number; stars_spent: number; active_users: number }[];
}

export const fetchAdminStats = async (): Promise<AdminStats> => {
  const { data } = await adminApi.get('/admin/stats');
  return data;
};

export const adminBroadcast = async (message: string, userId?: number) => {
  const formData = new FormData();
  formData.append('message', message);
  if (userId) formData.append('user_id', String(userId));
  const { data } = await adminApi.post('/admin/broadcast', formData);
  return data;
};

export const fetchAdminUsers = async (skip = 0, search = ''): Promise<UserProfile[]> => {
  const { data } = await adminApi.get('/admin/users', { params: { skip, search: search || undefined } });
  return data;
};

export const adminAddBalance = async (userId: number, addStars: number) => {
  const { data } = await adminApi.post(`/admin/users/${userId}/balance`, null, { params: { add_stars: addStars } });
  return data;
};

export const adminToggleBan = async (userId: number) => {
  const { data } = await adminApi.post(`/admin/users/${userId}/ban`);
  return data;
};

// ─── Analytics ───────────────────────────────────────────────────────────────

export const trackEvent = async (
  eventType: string,
  userTgId?: number,
  storyId?: string,
) => {
  try {
    await api.post('/analytics/event', {
      event_type: eventType,
      user_tg_id: userTgId || null,
      story_id: storyId || null,
    });
  } catch {
    // Silently fail — analytics should never block UI
  }
};

export const fetchRecommended = async (userTgId: number, limit = 10): Promise<Story[]> => {
  const { data } = await api.get('/stories/', {
    params: { sort: 'recommended', user_tg_id: userTgId, limit },
  });
  return data;
};

// ─── Premium ─────────────────────────────────────────────────────────────────

export const createPremiumInvoice = async (tgId: number) => {
  const { data } = await api.post('/premium/create-invoice', null, {
    params: { user_tg_id: tgId }
  });
  return data as { invoice_link: string };
};

export const verifyPremium = async (tgId: number, chargeId: string) => {
  const { data } = await api.post('/premium/verify', {
    user_tg_id: tgId,
    telegram_payment_charge_id: chargeId,
    stars_paid: 149
  });
  return data as UserProfile;
};

