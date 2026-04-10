import { useEffect, useState } from 'react';
import type { Report, Location } from '../types';
import { fetchReportsWithinRadius, subscribeToReports } from '../services/supabase';

export function useReports(center: Location | null, radiusKm = 10) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        if (!center) return;
        const items = await fetchReportsWithinRadius(center, radiusKm);
        if (mounted) setReports(items);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Reports load failed');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const channel = subscribeToReports(load);

    return () => {
      mounted = false;
      void channel.remove();
    };
  }, [center?.latitude, center?.longitude, radiusKm]);

  return { reports, loading, error, refresh: async () => { if (center) setReports(await fetchReportsWithinRadius(center, radiusKm)); } };
}
