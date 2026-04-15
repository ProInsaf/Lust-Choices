// Shared types for the Lust Choices app

export type StoryStatus = 'pending' | 'approved' | 'rejected';

export type SortFilter = 'new' | 'popular' | 'top_liked' | 'free' | 'paid' | 'recommended';

export const HARDNESS_LABEL: Record<number, string> = {
  1: 'Soft',
  2: 'Medium',
  3: 'Hard',
  4: 'Extreme',
};

export const HARDNESS_CLASS: Record<number, string> = {
  1: 'hardness-soft',
  2: 'hardness-medium',
  3: 'hardness-hard',
  4: 'hardness-extreme',
};

export interface Story {
  id: string;
  title: string;
  description: string;
  long_description: string | null;
  characters_info: Record<string, any> | null;
  completion_rate: number;
  author_tg_id: number;
  author_username: string | null;
  author_nickname: string | null;
  author_first_name: string | null;
  preview_url: string;
  preview_urls: string[];
  json_url: string;
  tags: string[];
  hardness_level: number;
  price_stars: number;
  status: StoryStatus;
  reject_reason: string | null;
  likes_count: number;
  scenes_count: number;
  plays_count: number;
  total_seconds_spent: number;
  created_at: string;
}

export interface UserProfile {
  tg_id: number;
  username: string | null;
  nickname: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  is_admin: boolean;
  is_banned: boolean;
  stars_balance: number;
  total_spent_stars: number;
  total_seconds_spent: number;
  created_at: string;
  last_active: string;
}
