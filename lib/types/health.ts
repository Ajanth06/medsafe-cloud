export type DocumentType = "arztbrief" | "blutwerte" | "ct" | "other";

export type TimelineIcon = "blood" | "pill" | "hospital" | "document" | "scan";

export interface HealthDocument {
  id: string;
  title: string;
  source: string;
  date: string;
  type: DocumentType;
  analyzed: boolean;
  summary: string;
  keyPoints: string[];
  originalPreview: string;
  fileName: string | null;
  mimeType: string | null;
  storagePath: string | null;
  fileUrl: string | null;
}

export interface Medication {
  id: string;
  name: string;
  schedule: string;
  note: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  year: number;
  label: string;
  icon: TimelineIcon;
}

export interface TodayItem {
  icon: string;
  label: string;
}

export interface HealthStats {
  documents: number;
  medications: number;
  visits: number;
  therapies: number;
  lastUpdate: string;
}

export interface UserDashboardData {
  displayName: string;
  stats: HealthStats;
  todayItems: TodayItem[];
  aiSummary: string | null;
  documents: HealthDocument[];
  medications: Medication[];
  timelineEvents: TimelineEvent[];
}
