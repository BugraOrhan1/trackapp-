export function formatDistanceKm(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`;
}

export function formatDistanceMeters(distanceMeters: number): string {
  return distanceMeters >= 1000 ? formatDistanceKm(distanceMeters / 1000) : `${Math.round(distanceMeters)} m`;
}
