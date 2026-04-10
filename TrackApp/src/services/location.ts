import * as Location from 'expo-location';
import type { UserLocation } from '../types';

export const locationService = {
	/**
	 * Request location permissions
	 */
	async requestPermissions(): Promise<boolean> {
		const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
		if (foregroundStatus !== 'granted') {
			return false;
		}

		// Vraag achtergrond permissions (voor alerts)
		const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    
		return backgroundStatus === 'granted';
	},

	/**
	 * Haal huidige locatie op
	 */
	async getCurrentLocation(): Promise<UserLocation> {
		const location = await Location.getCurrentPositionAsync({
			accuracy: Location.Accuracy.High,
		});

		return {
			latitude: location.coords.latitude,
			longitude: location.coords.longitude,
			heading: location.coords.heading || undefined,
			speed: location.coords.speed || undefined,
			accuracy: location.coords.accuracy || undefined,
			timestamp: new Date(location.timestamp),
		};
	},

	/**
	 * Watch location updates
	 */
	async watchLocation(
		callback: (location: UserLocation) => void
	): Promise<Location.LocationSubscription> {
		return await Location.watchPositionAsync(
			{
				accuracy: Location.Accuracy.High,
				timeInterval: 1000, // Elke seconde
				distanceInterval: 10, // Of elke 10 meter
			},
			(location) => {
				callback({
					latitude: location.coords.latitude,
					longitude: location.coords.longitude,
					heading: location.coords.heading || undefined,
					speed: location.coords.speed || undefined,
					accuracy: location.coords.accuracy || undefined,
					timestamp: new Date(location.timestamp),
				});
			}
		);
	},

	/**
	 * Stop watching
	 */
	async stopWatching(subscription: Location.LocationSubscription) {
		subscription.remove();
	},
};
