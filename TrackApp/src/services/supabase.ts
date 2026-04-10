import { supabase } from '../config/supabase';
import type { Detection, Location, Report, ReportType, SpeedCamera, SubscriptionType, User } from '../types';

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function register(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function forgotPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return mapAuthUserToUser(data.user.id, data.user.email ?? '', data.user.user_metadata?.username ?? data.user.email ?? 'user');
}

export async function getSubscriptionType(userId: string): Promise<SubscriptionType> {
  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', userId)
    .single();
  if (error || !data) return 'free';
  return data.subscription_type as SubscriptionType;
}

export async function fetchReportsWithinRadius(_center: Location, _radiusKm: number): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(mapReportRow);
}

export async function createReport(report: Omit<Report, 'id' | 'upvotes' | 'downvotes' | 'isActive' | 'createdAt' | 'expiresAt'>) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const payload = {
    user_id: userId,
    type: report.type,
    latitude: report.latitude,
    longitude: report.longitude,
    address: report.address ?? null,
    description: report.description ?? null,
  };

  const { data, error } = await supabase.from('reports').insert(payload).select('*').single();
  if (error) throw error;
  return mapReportRow(data);
}

export async function voteReport(reportId: string, voteType: 'up' | 'down') {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { error } = await supabase.from('report_votes').upsert({ report_id: reportId, user_id: userId, vote_type: voteType }, { onConflict: 'report_id,user_id' });
  if (error) throw error;
}

export async function deleteReport(reportId: string) {
  const { error } = await supabase.from('reports').delete().eq('id', reportId);
  if (error) throw error;
}

export async function fetchSpeedCameras(): Promise<SpeedCamera[]> {
  const { data, error } = await supabase.from('speed_cameras').select('*').eq('is_active', true);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    latitude: row.latitude,
    longitude: row.longitude,
    speedLimit: row.speed_limit ?? undefined,
    direction: row.direction ?? undefined,
    roadName: row.road_name ?? undefined,
    isActive: row.is_active,
  }));
}

export async function fetchPiDetections(userId: string): Promise<Detection[]> {
  const { data, error } = await supabase.from('pi_detections').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDetectionRow);
}

export async function createPiDetection(detection: Omit<Detection, 'id' | 'createdAt'>) {
  const payload = {
    user_id: detection.userId,
    session_id: null,
    service_type: detection.serviceType,
    frequency: detection.frequency,
    rssi: detection.rssi,
    distance_km: detection.distanceKm,
    latitude: detection.latitude,
    longitude: detection.longitude,
  };
  const { data, error } = await supabase.from('pi_detections').insert(payload).select('*').single();
  if (error) throw error;
  return mapDetectionRow(data);
}

export function subscribeToReports(onChange: () => void) {
  return supabase
    .channel('reports-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, onChange)
    .subscribe();
}

export async function isPremiumUser(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('subscription_type').eq('id', userId).single();
  if (error || !data) return false;
  return data.subscription_type === 'premium';
}

function mapReportRow(row: any): Report {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ?? undefined,
    description: row.description ?? undefined,
    upvotes: row.upvotes ?? 0,
    downvotes: row.downvotes ?? 0,
    isActive: Boolean(row.is_active),
    expiresAt: new Date(row.expires_at),
    createdAt: new Date(row.created_at),
  };
}

function mapDetectionRow(row: any): Detection {
  return {
    id: row.id,
    userId: row.user_id,
    serviceType: row.service_type,
    frequency: Number(row.frequency ?? 0),
    rssi: Number(row.rssi ?? 0),
    distanceKm: Number(row.distance_km ?? 0),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    createdAt: new Date(row.created_at),
  };
}

function mapAuthUserToUser(id: string, email: string, username: string): User {
  return {
    id,
    email,
    username,
    subscriptionType: 'free',
    totalReports: 0,
    reputationScore: 0,
  };
}
