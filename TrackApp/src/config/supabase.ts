import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ VERVANG DEZE WAARDES MET JE EIGEN SUPABASE PROJECT
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          subscription_type: 'free' | 'premium';
          subscription_expires_at: string | null;
          total_reports: number;
          reputation_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string;
          avatar_url?: string;
          subscription_type?: 'free' | 'premium';
        };
        Update: {
          username?: string;
          avatar_url?: string;
          subscription_type?: 'free' | 'premium';
          subscription_expires_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          latitude: number;
          longitude: number;
          address: string | null;
          description: string | null;
          upvotes: number;
          downvotes: number;
          is_active: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          type: string;
          latitude: number;
          longitude: number;
          address?: string;
          description?: string;
        };
        Update: {
          upvotes?: number;
          downvotes?: number;
          is_active?: boolean;
        };
      };
      speed_cameras: {
        Row: {
          id: string;
          type: 'fixed' | 'trajectory' | 'red_light';
          latitude: number;
          longitude: number;
          speed_limit: number | null;
          direction: string | null;
          road_name: string | null;
          is_active: boolean;
          last_verified: string;
        };
      };
      pi_detections: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          service_type: string;
          frequency: number;
          rssi: number;
          distance_km: number;
          latitude: number;
          longitude: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          session_id?: string;
          service_type: string;
          frequency: number;
          rssi: number;
          distance_km: number;
          latitude: number;
          longitude: number;
        };
      };
    };
  };
};
