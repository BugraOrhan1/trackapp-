import { supabase } from '../config/supabase';
import type { Report, ReportType } from '../types';
import { calculateDistance } from '../utils/distance';

export const reportsService = {
	/**
	 * Haal meldingen op binnen bereik
	 */
	async getReportsNearby(
		latitude: number, 
		longitude: number, 
		radiusKm: number = 10
	): Promise<Report[]> {
		const { data, error } = await supabase
			.from('reports')
			.select('*')
			.eq('is_active', true)
			.gte('expires_at', new Date().toISOString())
			.order('created_at', { ascending: false });

		if (error) throw error;
		if (!data) return [];

		// Filter op afstand
		const nearbyReports = data
			.map(report => ({
				id: report.id,
				userId: report.user_id,
				type: report.type as ReportType,
				latitude: report.latitude,
				longitude: report.longitude,
				address: report.address || undefined,
				description: report.description || undefined,
				upvotes: report.upvotes,
				downvotes: report.downvotes,
				isActive: report.is_active,
				expiresAt: new Date(report.expires_at),
				createdAt: new Date(report.created_at),
				distance: calculateDistance(
					latitude,
					longitude,
					report.latitude,
					report.longitude
				),
			}))
			.filter(report => report.distance! <= radiusKm * 1000)
			.sort((a, b) => a.distance! - b.distance!);

		return nearbyReports;
	},

	/**
	 * Maak nieuwe melding
	 */
	async createReport(
		type: ReportType,
		latitude: number,
		longitude: number,
		description?: string,
		address?: string
	): Promise<Report> {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('Niet ingelogd');

		const { data, error } = await supabase
			.from('reports')
			.insert({
				user_id: user.id,
				type,
				latitude,
				longitude,
				description,
				address,
			})
			.select()
			.single();

		if (error) throw error;

		// Update total_reports in profile
		await supabase.rpc('increment_user_reports', { user_id: user.id });

		return {
			id: data.id,
			userId: data.user_id,
			type: data.type as ReportType,
			latitude: data.latitude,
			longitude: data.longitude,
			address: data.address || undefined,
			description: data.description || undefined,
			upvotes: data.upvotes,
			downvotes: data.downvotes,
			isActive: data.is_active,
			expiresAt: new Date(data.expires_at),
			createdAt: new Date(data.created_at),
		};
	},

	/**
	 * Vote op melding
	 */
	async voteReport(reportId: string, voteType: 'up' | 'down') {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('Niet ingelogd');

		// Check of al gestemd
		const { data: existing } = await supabase
			.from('report_votes')
			.select('*')
			.eq('report_id', reportId)
			.eq('user_id', user.id)
			.single();

		if (existing) {
			// Update bestaande stem
			const { error } = await supabase
				.from('report_votes')
				.update({ vote_type: voteType })
				.eq('id', existing.id);

			if (error) throw error;
		} else {
			// Nieuwe stem
			const { error } = await supabase
				.from('report_votes')
				.insert({
					report_id: reportId,
					user_id: user.id,
					vote_type: voteType,
				});

			if (error) throw error;
		}
	},

	/**
	 * Verwijder melding (eigen meldingen)
	 */
	async deleteReport(reportId: string) {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('Niet ingelogd');

		const { error } = await supabase
			.from('reports')
			.delete()
			.eq('id', reportId)
			.eq('user_id', user.id);

		if (error) throw error;
	},

	/**
	 * Subscribe naar realtime updates
	 */
	subscribeToReports(
		latitude: number,
		longitude: number,
		radiusKm: number,
		callback: (report: Report) => void
	) {
		const channel = supabase
			.channel('reports-changes')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'reports',
				},
				(payload) => {
					const report = payload.new;
					const distance = calculateDistance(
						latitude,
						longitude,
						report.latitude,
						report.longitude
					);

					// Alleen callback als binnen bereik
					if (distance <= radiusKm * 1000) {
						callback({
							id: report.id,
							userId: report.user_id,
							type: report.type as ReportType,
							latitude: report.latitude,
							longitude: report.longitude,
							address: report.address || undefined,
							description: report.description || undefined,
							upvotes: report.upvotes,
							downvotes: report.downvotes,
							isActive: report.is_active,
							expiresAt: new Date(report.expires_at),
							createdAt: new Date(report.created_at),
							distance,
						});
					}
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	},
};
