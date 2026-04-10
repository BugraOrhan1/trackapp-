/**
 * Valideer email
 */
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valideer wachtwoord (min 8 karakters)
 */
export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Valideer username
 */
export function validateUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 20;
}

/**
 * Valideer coordinaten
 */
export function validateCoordinates(
  latitude: number,
  longitude: number
): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return validateCoordinates(latitude, longitude);
}

export function isValidEmail(email: string): boolean {
  return validateEmail(email);
}