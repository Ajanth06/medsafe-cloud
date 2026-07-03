import { createClient } from "@/lib/supabase/server";
import type {
  HealthDocument,
  HealthStats,
  Medication,
  TimelineEvent,
  TimelineIcon,
  TodayItem,
} from "@/lib/types/health";

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatLastUpdate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return isToday
    ? "Heute"
    : date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

function mapDocument(
  row: {
    id: string;
    title: string;
    source: string | null;
    document_date: string | null;
    type: string;
    analyzed: boolean;
    summary: string | null;
    key_points: unknown;
    original_preview: string | null;
    file_name?: string | null;
    mime_type?: string | null;
    storage_path?: string | null;
  },
  fileUrl: string | null = null,
): HealthDocument {
  const keyPoints = Array.isArray(row.key_points)
    ? row.key_points.filter((item): item is string => typeof item === "string")
    : [];

  return {
    id: row.id,
    title: row.title,
    source: row.source ?? "",
    date: formatDate(row.document_date),
    type: row.type as HealthDocument["type"],
    analyzed: row.analyzed,
    summary: row.summary ?? "",
    keyPoints,
    originalPreview: row.original_preview ?? "",
    fileName: row.file_name ?? null,
    mimeType: row.mime_type ?? null,
    storagePath: row.storage_path ?? null,
    fileUrl,
  };
}

function mapMedication(row: {
  id: string;
  name: string;
  schedule: string | null;
  note: string | null;
}): Medication {
  return {
    id: row.id,
    name: row.name,
    schedule: row.schedule ?? "",
    note: row.note ?? "",
  };
}

function mapTimelineEvent(row: {
  id: string;
  event_date: string;
  label: string;
  icon: string;
}): TimelineEvent {
  const date = new Date(row.event_date);
  return {
    id: row.id,
    date: formatDate(row.event_date),
    year: Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear(),
    label: row.label,
    icon: row.icon as TimelineIcon,
  };
}

export async function getUserDocuments(): Promise<HealthDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("document_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => mapDocument(row));
}

export async function getUserDocument(id: string): Promise<HealthDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  let fileUrl: string | null = null;
  if (data.storage_path) {
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(data.storage_path, 60 * 60);
    fileUrl = signed?.signedUrl ?? null;
  }

  return mapDocument(data, fileUrl);
}

export async function getUserMedications(): Promise<Medication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapMedication);
}

export async function getUserTimelineEvents(): Promise<TimelineEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .select("*")
    .order("event_date", { ascending: false });

  if (error || !data) return [];
  return data.map(mapTimelineEvent);
}

export async function getUserHealthSummary(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("health_summaries")
    .select("summary_text")
    .maybeSingle();

  if (error || !data?.summary_text?.trim()) return null;
  return data.summary_text.trim();
}

export async function getUserHealthStats(): Promise<HealthStats> {
  const supabase = await createClient();

  const [
    documentsCountResult,
    latestDocumentResult,
    medicationsResult,
    timelineResult,
    summaryResult,
  ] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase
      .from("documents")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("medications")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase.from("timeline_events").select("icon"),
    supabase.from("health_summaries").select("updated_at").maybeSingle(),
  ]);

  const timeline = timelineResult.data ?? [];

  const visits = timeline.filter(
    (event) => event.icon === "hospital" || event.icon === "document",
  ).length;

  const therapies = timeline.filter((event) => event.icon === "pill").length;

  return {
    documents: documentsCountResult.count ?? 0,
    medications: medicationsResult.count ?? 0,
    visits,
    therapies: Math.max(therapies, medicationsResult.count ?? 0),
    lastUpdate: formatLastUpdate(
      summaryResult.data?.updated_at ?? latestDocumentResult.data?.updated_at,
    ),
  };
}

export function buildTodayItems(
  documents: HealthDocument[],
  medications: Medication[],
): TodayItem[] {
  const items: TodayItem[] = [];
  const today = new Date().toLocaleDateString("de-DE");

  const newDocuments = documents.filter((doc) => doc.date === today).length;
  const recentBloodwork = documents.some((doc) => doc.type === "blutwerte");

  if (medications.length > 0) {
    items.push({
      icon: "💊",
      label: `${medications.length} Medikament${medications.length === 1 ? "" : "e"}`,
    });
  }

  if (newDocuments > 0) {
    items.push({
      icon: "📄",
      label: `${newDocuments} neuer Arztbrief`,
    });
  }

  if (recentBloodwork) {
    items.push({ icon: "🩸", label: "Neue Blutwerte" });
  }

  return items;
}

export async function getUserDashboardData() {
  const [documents, medications, timelineEvents, aiSummary, stats] =
    await Promise.all([
      getUserDocuments(),
      getUserMedications(),
      getUserTimelineEvents(),
      getUserHealthSummary(),
      getUserHealthStats(),
    ]);

  return {
    stats,
    todayItems: buildTodayItems(documents, medications),
    aiSummary,
    documents,
    medications,
    timelineEvents,
  };
}
