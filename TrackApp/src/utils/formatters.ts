/**
 * Format afstand (meters → leesbaar)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format snelheid (m/s → km/h)
 */
export function formatSpeed(metersPerSecond: number | undefined): string {
  if (metersPerSecond === undefined) return '0 km/h';
  const kmh = metersPerSecond * 3.6;
  return `${Math.round(kmh)} km/h`;
}

/**
 * Format tijd (Date → relatief)
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'zojuist';
  if (minutes < 60) return `${minutes}m geleden`;
  if (hours < 24) return `${hours}u geleden`;
  if (days < 7) return `${days}d geleden`;
  
  return date.toLocaleDateString('nl-NL');
}

/**
 * Format subscription expire date
 */
export function formatSubscriptionExpiry(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Verlopen';
  if (days === 0) return 'Vandaag verloopt';
  if (days === 1) return 'Morgen verloopt';
  if (days < 7) return `Verloopt over ${days} dagen`;
  if (days < 30) return `Verloopt over ${Math.ceil(days / 7)} weken`;
  
  return `Verloopt ${date.toLocaleDateString('nl-NL')}`;
}

/**
 * Format report type naar leesbare tekst
 */
export function formatReportType(type: string): string {
  const types: Record<string, string> = {
    speed_camera_mobile: 'Mobiele flitser',
    police_control: 'Politiecontrole',
    accident: 'Ongeluk',
    traffic_jam: 'File',
    roadwork: 'Wegwerkzaamheden',
    danger: 'Gevaar',
    other: 'Overig',
  };
  return types[type] || type;
}

/**
 * Format emergency service type
 */
export function formatEmergencyService(type: string): string {
  const services: Record<string, string> = {
    police: '🚓 Politie',
    ambulance: '🚑 Ambulance',
    fire: '🚒 Brandweer',
    defense: '🎖️ Defensie',
    unknown: '❓ Onbekend',
  };
  return services[type] || type;
}

export function formatDistanceKm(distanceKm: number): string {
  return formatDistance(distanceKm * 1000);
}

export function formatDistanceMeters(distanceMeters: number): string {
  return formatDistance(distanceMeters);
}