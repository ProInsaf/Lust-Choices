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

export const fetchAdminStats = async () => {
  const { data } = await adminApi.get('/admin/stats');
  return data as { total: number; pending: number; approved: number; rejected: number };
};

export const fetchAdminUsers = async (skip = 0): Promise<UserProfile[]> => {
  const { data } = await adminApi.get('/admin/users', { params: { skip } });
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
