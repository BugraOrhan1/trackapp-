import { supabase } from '../config/supabase';
import type { SpeedCamera, SpeedCameraType } from '../types';
import { calculateDistance } from '../utils/distance';

export const speedCamerasService = {
	async getSpeedCamerasNearby(
		latitude: number,
		longitude: number,
		radiusKm: number = 10
	): Promise<SpeedCamera[]> {
		const { data, error } = await supabase
			.from('speed_cameras')
			.select('*')
			.eq('is_active', true);

		if (error) throw error;
		if (!data) return [];

		const nearbyCameras = data
			.map(camera => ({
				id: camera.id,
				type: camera.type as SpeedCameraType,
				latitude: camera.latitude,
				longitude: camera.longitude,
				speedLimit: camera.speed_limit || undefined,
				direction: camera.direction || undefined,
				roadName: camera.road_name || undefined,
				isActive: camera.is_active,
				distance: calculateDistance(
					latitude,
					longitude,
					camera.latitude,
					camera.longitude
				),
			}))
			.filter(camera => camera.distance! <= radiusKm * 1000)
			.sort((a, b) => a.distance! - b.distance!);

		return nearbyCameras;
	},

	async getAllSpeedCameras(): Promise<SpeedCamera[]> {
		const { data, error } = await supabase
			.from('speed_cameras')
			.select('*')
			.eq('is_active', true);

		if (error) throw error;
		if (!data) return [];

		return data.map(camera => ({
			id: camera.id,
			type: camera.type as SpeedCameraType,
			latitude: camera.latitude,
			longitude: camera.longitude,
			speedLimit: camera.speed_limit || undefined,
			direction: camera.direction || undefined,
			roadName: camera.road_name || undefined,
			isActive: camera.is_active,
		}));
	},
};
