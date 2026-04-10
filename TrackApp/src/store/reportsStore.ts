import { create } from 'zustand';
import type { Report } from '../types';

interface ReportsState {
  reports: Report[];
  pendingReports: Report[];
  setReports: (reports: Report[]) => void;
  queueReport: (report: Report) => void;
  clearPendingReports: () => void;
}

export const useReportsStore = create<ReportsState>((set) => ({
  reports: [],
  pendingReports: [],
  setReports: (reports) => set({ reports }),
  queueReport: (report) => set((state) => ({ pendingReports: [...state.pendingReports, report] })),
  clearPendingReports: () => set({ pendingReports: [] }),
}));
