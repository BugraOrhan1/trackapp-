export function trackEvent(name: string, payload: Record<string, unknown> = {}) {
  if (__DEV__) {
    console.log('[analytics]', name, payload);
  }
}
