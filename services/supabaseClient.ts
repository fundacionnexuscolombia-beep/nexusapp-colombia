/// <reference types="vite/client" />
export interface NexusAuditMetrics {
  totalUsers: number;
  activeStudents: number;
  blockedUsers: number;
  usersWithoutCohort: number;

  totalRevenue: number;
  pendingPayments: number;
  overduePayments: number;

  completedLessons: number;
  averageScore: number;
  inactiveStudents: number;

  totalNews: number;
  unreadNotifications: number;

  healthScore: number;
  alerts: string[];
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isConfigured =
  supabaseUrl &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

if (!isConfigured) {
  console.warn('Supabase URL or Anon Key is missing or default. Check .env.local');
}

const validUrl =
  isConfigured && supabaseUrl.startsWith('http')
    ? supabaseUrl
    : 'https://placeholder.supabase.co';

const validKey =
  isConfigured
    ? supabaseAnonKey
    : 'placeholder-key';

export const supabase = createClient(validUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
