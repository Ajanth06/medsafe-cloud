import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import {
  claimJobFromDb,
  persistDeadLetterJob,
  persistJob,
} from "@/lib/market-intelligence/persistence/jobs-repository";
import type { BackgroundJob, BackgroundJobStatus, BackgroundJobType } from "@/lib/types/market";

const MAX_ATTEMPTS = 5;
const BASE_RETRY_MS = 5_000;

const jobs = new Map<string, BackgroundJob>();
const deadLetter: BackgroundJob[] = [];
const claimedKeys = new Set<string>();

let jobCounter = 0;

function nextId(): string {
  jobCounter += 1;
  return `job-${Date.now()}-${jobCounter}`;
}

export function enqueueJob(input: {
  type: BackgroundJobType;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
}): BackgroundJob {
  if (input.idempotencyKey) {
    const existing = [...jobs.values()].find(
      (j) =>
        j.idempotencyKey === input.idempotencyKey &&
        j.status !== "COMPLETED" &&
        j.status !== "CANCELLED" &&
        j.status !== "DEAD_LETTER",
    );
    if (existing) return existing;
  }

  const now = new Date().toISOString();
  const job: BackgroundJob = {
    id: nextId(),
    type: input.type,
    status: "QUEUED",
    payload: input.payload,
    createdAt: now,
    queuedAt: now,
    attempts: 0,
    idempotencyKey: input.idempotencyKey,
  };
  jobs.set(job.id, job);
  marketLogger.info("job_queued", { jobId: job.id, type: job.type });
  if (isMiPersistenceEnabled()) void persistJob(job);
  return job;
}

export function claimJob(type?: BackgroundJobType): BackgroundJob | null {
  const now = Date.now();
  const candidate = [...jobs.values()]
    .filter((j) => {
      if (j.status !== "QUEUED" && j.status !== "RETRYING") return false;
      if (type && j.type !== type) return false;
      if (j.nextRetryAt && new Date(j.nextRetryAt).getTime() > now) return false;
      if (j.idempotencyKey && claimedKeys.has(j.idempotencyKey)) return false;
      return true;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

  if (!candidate) return null;

  const startedAt = new Date().toISOString();
  candidate.status = "RUNNING";
  candidate.startedAt = startedAt;
  candidate.attempts += 1;
  if (candidate.idempotencyKey) claimedKeys.add(candidate.idempotencyKey);

  marketLogger.info("job_claimed", { jobId: candidate.id, type: candidate.type, attempt: candidate.attempts });
  return candidate;
}

export async function claimJobAsync(type?: BackgroundJobType): Promise<BackgroundJob | null> {
  if (isMiPersistenceEnabled()) {
    const dbJob = await claimJobFromDb(type);
    if (dbJob) {
      jobs.set(dbJob.id, dbJob);
      marketLogger.info("job_claimed", { jobId: dbJob.id, type: dbJob.type, attempt: dbJob.attempts, source: "db" });
      return dbJob;
    }
    return null;
  }
  return claimJob(type);
}

export function completeJob(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "COMPLETED";
  job.completedAt = new Date().toISOString();
  if (job.idempotencyKey) claimedKeys.delete(job.idempotencyKey);
  marketLogger.info("job_completed", { jobId });
  if (isMiPersistenceEnabled()) void persistJob(job);
}

export function failJob(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (!job) return;

  job.lastError = error;
  if (job.idempotencyKey) claimedKeys.delete(job.idempotencyKey);

  if (job.attempts >= MAX_ATTEMPTS) {
    job.status = "DEAD_LETTER";
    job.completedAt = new Date().toISOString();
    deadLetter.push({ ...job });
    marketLogger.error("job_dead_letter", { jobId, type: job.type, error });
    if (isMiPersistenceEnabled()) void persistDeadLetterJob(job);
    return;
  }

  const backoff = BASE_RETRY_MS * 2 ** (job.attempts - 1);
  job.status = "RETRYING";
  job.nextRetryAt = new Date(Date.now() + backoff).toISOString();
  marketLogger.warn("job_failed", { jobId, attempt: job.attempts, nextRetryAt: job.nextRetryAt, error });
  if (isMiPersistenceEnabled()) void persistJob(job);
}

export function getJobs(filter?: { status?: BackgroundJobStatus; type?: BackgroundJobType }): BackgroundJob[] {
  return [...jobs.values()].filter((j) => {
    if (filter?.status && j.status !== filter.status) return false;
    if (filter?.type && j.type !== filter.type) return false;
    return true;
  });
}

export function getDeadLetterJobs(): BackgroundJob[] {
  return [...deadLetter];
}

export function resetJobQueue(): void {
  jobs.clear();
  deadLetter.length = 0;
  claimedKeys.clear();
  jobCounter = 0;
}

export function getJobStats(): { pending: number; running: number; failed: number; deadLetter: number } {
  const all = [...jobs.values()];
  return {
    pending: all.filter((j) => j.status === "QUEUED" || j.status === "PENDING" || j.status === "RETRYING").length,
    running: all.filter((j) => j.status === "RUNNING").length,
    failed: all.filter((j) => j.status === "FAILED").length,
    deadLetter: deadLetter.length,
  };
}
