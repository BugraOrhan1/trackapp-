import { useState, useEffect, useCallback } from 'react';
import { reportsService } from '../services/reports';
import type { Report, ReportType, UserLocation } from '../types';

export function useReports(userLocation: UserLocation | null, radiusKm: number = 10) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLocation) {
      fetchReports();
      
      // Subscribe to realtime updates
      const unsubscribe = reportsService.subscribeToReports(
        userLocation.latitude,
        userLocation.longitude,
        radiusKm,
        (newReport: Report) => {
          setReports((prev: Report[]) => [newReport, ...prev]);
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [userLocation?.latitude, userLocation?.longitude, radiusKm]);

  async function fetchReports() {
    if (!userLocation) return;

    try {
      setLoading(true);
      const data = await reportsService.getReportsNearby(
        userLocation.latitude,
        userLocation.longitude,
        radiusKm
      );
      setReports(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Fout bij laden meldingen');
    } finally {
      setLoading(false);
    }
  }

  async function createReport(
    type: ReportType,
    description?: string,
    customLocation?: { latitude: number; longitude: number }
  ) {
    const loc = customLocation || userLocation;
    if (!loc) {
      throw new Error('Geen locatie beschikbaar');
    }

    try {
      const newReport = await reportsService.createReport(
        type,
        loc.latitude,
        loc.longitude,
        description
      );
      
      // Add to local state
      setReports((prev: Report[]) => [newReport, ...prev]);
      
      return newReport;
    } catch (err: any) {
      setError(err.message || 'Fout bij maken melding');
      throw err;
    }
  }

  async function voteReport(reportId: string, voteType: 'up' | 'down') {
    try {
      await reportsService.voteReport(reportId, voteType);
      
      // Update local state
      setReports((prev: Report[]) => prev.map((report: Report) => {
        if (report.id === reportId) {
          return {
            ...report,
            upvotes: voteType === 'up' ? report.upvotes + 1 : report.upvotes,
            downvotes: voteType === 'down' ? report.downvotes + 1 : report.downvotes,
          };
        }
        return report;
      }));
    } catch (err: any) {
      setError(err.message || 'Fout bij stemmen');
      throw err;
    }
  }

  async function deleteReport(reportId: string) {
    try {
      await reportsService.deleteReport(reportId);
      
      // Remove from local state
      setReports((prev: Report[]) => prev.filter((r: Report) => r.id !== reportId));
    } catch (err: any) {
      setError(err.message || 'Fout bij verwijderen');
      throw err;
    }
  }

  const refresh = useCallback(() => {
    fetchReports();
  }, [userLocation, radiusKm]);

  return {
    reports,
    loading,
    error,
    createReport,
    voteReport,
    deleteReport,
    refresh,
  };
}