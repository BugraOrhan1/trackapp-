import { supabase } from '../config/supabase';
import type { User } from '../types';

export const authService = {
	/**
	 * Login met email en wachtwoord
	 */
	async login(email: string, password: string) {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) throw error;
		return data;
	},

	/**
	 * Registreer nieuwe gebruiker
	 */
	async register(email: string, password: string, username?: string) {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					username: username || email.split('@')[0],
				},
			},
		});

		if (error) throw error;
		return data;
	},

	/**
	 * Logout
	 */
	async logout() {
		const { error } = await supabase.auth.signOut();
		if (error) throw error;
	},

	/**
	 * Reset wachtwoord
	 */
	async resetPassword(email: string) {
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: 'trackapp://reset-password',
		});

		if (error) throw error;
	},

	/**
	 * Haal huidige gebruiker op
	 */
	async getCurrentUser(): Promise<User | null> {
		const { data: { user } } = await supabase.auth.getUser();
    
		if (!user) return null;

		// Haal profiel op
		const { data: profile } = await supabase
			.from('profiles')
			.select('*')
			.eq('id', user.id)
			.single();

		if (!profile) return null;

		return {
			id: user.id,
			email: user.email!,
			username: profile.username || undefined,
			avatarUrl: profile.avatar_url || undefined,
			subscriptionType: profile.subscription_type,
			subscriptionExpiresAt: profile.subscription_expires_at 
				? new Date(profile.subscription_expires_at) 
				: undefined,
			totalReports: profile.total_reports,
			reputationScore: profile.reputation_score,
			createdAt: new Date(profile.created_at),
		};
	},

	/**
	 * Update profiel
	 */
	async updateProfile(updates: Partial<Pick<User, 'username' | 'avatarUrl'>>) {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('Niet ingelogd');

		const { error } = await supabase
			.from('profiles')
			.update({
				username: updates.username,
				avatar_url: updates.avatarUrl,
				updated_at: new Date().toISOString(),
			})
			.eq('id', user.id);

		if (error) throw error;
	},

	/**
	 * Check of gebruiker premium is
	 */
	async isPremium(): Promise<boolean> {
		const user = await this.getCurrentUser();
		if (!user) return false;

		if (user.subscriptionType !== 'premium') return false;

		// Check of abonnement nog geldig is
		if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date()) {
			return false;
		}

		return true;
	},
};
