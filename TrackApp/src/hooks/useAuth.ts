import { useState, useEffect } from 'react';
import { authService } from '../services/auth';
import type { User } from '../types';
import { supabase } from '../config/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check current session
    checkUser();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      setLoading(true);
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Check user error:', err);
      setError('Fout bij laden gebruiker');
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      setLoading(true);
      setError(null);
      await authService.login(email, password);
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (err: any) {
      setError(err.message || 'Login mislukt');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function register(email: string, password: string, username?: string) {
    try {
      setLoading(true);
      setError(null);
      await authService.register(email, password, username);
    } catch (err: any) {
      setError(err.message || 'Registratie mislukt');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
    } catch (err: any) {
      setError(err.message || 'Logout mislukt');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(email: string) {
    try {
      setLoading(true);
      setError(null);
      await authService.resetPassword(email);
    } catch (err: any) {
      setError(err.message || 'Reset mislukt');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(updates: Partial<Pick<User, 'username' | 'avatarUrl'>>) {
    try {
      setLoading(true);
      setError(null);
      await authService.updateProfile(updates);
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (err: any) {
      setError(err.message || 'Update mislukt');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function checkIsPremium(): Promise<boolean> {
    return await authService.isPremium();
  }

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    checkIsPremium,
  };
}