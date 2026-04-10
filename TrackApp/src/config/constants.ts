export const COLORS = {
	// Brand colors (Flitsmeister inspired)
	primary: '#FF6B00',
	secondary: '#1A1A2E',
	danger: '#FF1744',
	success: '#00C853',
	warning: '#FFD600',
	premium: '#FFD700',
  
	// Grays
	gray50: '#FAFAFA',
	gray100: '#F5F5F5',
	gray200: '#EEEEEE',
	gray300: '#E0E0E0',
	gray400: '#BDBDBD',
	gray500: '#9E9E9E',
	gray600: '#757575',
	gray700: '#616161',
	gray800: '#424242',
	gray900: '#212121',
  
	// Marker colors
	speedCameraFixed: '#FF1744',
	speedCameraMobile: '#FF6B00',
	speedCameraTrajectory: '#9C27B0',
	policeControl: '#2196F3',
	accident: '#F44336',
	trafficJam: '#FFC107',
	roadwork: '#FF9800',
  
	// Emergency services
	police: '#0000FF',
	ambulance: '#FFD700',
	fire: '#FF0000',
	defense: '#008000',
};

export const FONTS = {
	regular: 'System',
	medium: 'System',
	bold: 'System',
	monospace: 'Courier',
};

export const SIZES = {
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48,
};

export const BLE_CONFIG = {
	SERVICE_UUID: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
	DETECTIONS_CHAR_UUID: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
	COMMAND_CHAR_UUID: 'cba1d466-344c-4be3-ab3f-189f80dd7518',
	STATUS_CHAR_UUID: 'd4e1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f',
	DEVICE_NAME: 'TrackApp-RPI',
};

export const ALERT_THRESHOLDS = {
	SPEED_CAMERA: 1000, // 1km
	POLICE_CONTROL: 2000, // 2km
	ACCIDENT: 5000, // 5km
	EMERGENCY_SERVICE: 3000, // 3km
};

export const MAP_CONFIG = {
	INITIAL_REGION: {
		latitude: 52.0907, // Utrecht, NL
		longitude: 5.1214,
		latitudeDelta: 0.0922,
		longitudeDelta: 0.0421,
	},
	MAX_MARKER_DISTANCE: 10000, // 10km - alleen markers binnen deze afstand laden
};

export const SUBSCRIPTION = {
	PRODUCTS: {
		PREMIUM_YEARLY: 'premium_yearly',
		PREMIUM_MONTHLY: 'premium_monthly',
	},
	PRICES: {
		YEARLY: 100.00,
		MONTHLY: 9.99,
	},
	FEATURES: {
		FREE: [
			'Flitsers op kaart',
			'Community meldingen',
			'Zelf meldingen maken',
			'Google Maps',
		],
		PREMIUM: [
			'Alles van Gratis',
			'Raspberry Pi scanner',
			'Hulpdiensten detectie',
			'Real-time alerts',
			'Geen advertenties',
			'Statistieken',
			'Multi-device',
		],
	},
};
