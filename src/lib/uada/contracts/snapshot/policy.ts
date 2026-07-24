// H12.5 — Snapshot lifecycle & retention policy (ADR-0026).

export type SnapshotState = "building" | "active" | "archived" | "deprecated";

export interface RetentionPolicy {
  /** Always 1 — invariant. */
  keepActive: 1;
  /** Number of archived snapshots to keep before purging by age. */
  keepArchived: number;
  /** Auto-archive an active snapshot older than N days when a new one activates. */
  archiveAfterDays: number;
  /** Purge archived snapshots older than N days. */
  purgeAfterDays: number;
}

export const DEFAULT_RETENTION: RetentionPolicy = {
  keepActive: 1,
  keepArchived: 10,
  archiveAfterDays: 30,
  purgeAfterDays: 180,
};

export interface SnapshotRecord {
  id: string;
  version: number;
  state: SnapshotState;
  createdAt: string; // ISO
  activatedAt?: string;
  archivedAt?: string;
}

export interface RebuildPlan {
  reason: "model_change" | "schema_change" | "manual" | "corruption";
  targets: Array<"knowledge" | "graph">;
  requestedBy: string;
  requestedAt: string;
}

// ---- State machine ----------------------------------------------------------

const ALLOWED: Record<SnapshotState, SnapshotState[]> = {
  building: ["active", "deprecated"],
  active: ["archived", "deprecated"],
  archived: ["deprecated"],
  deprecated: [],
};

export function canTransition(from: SnapshotState, to: SnapshotState): boolean {
  return ALLOWED[from].includes(to);
}

export class InvalidSnapshotTransition extends Error {
  constructor(from: SnapshotState, to: SnapshotState) {
    super(`Invalid snapshot transition: ${from} → ${to}`);
    this.name = "InvalidSnapshotTransition";
  }
}

export function assertTransition(from: SnapshotState, to: SnapshotState): void {
  if (!canTransition(from, to)) throw new InvalidSnapshotTransition(from, to);
}

// ---- Retention --------------------------------------------------------------

export interface RetentionOutcome {
  keep: SnapshotRecord[];
  purge: SnapshotRecord[];
  archive: SnapshotRecord[];
}

/**
 * Pure helper — decides which snapshots to keep, archive, or purge.
 * The store applies the outcome; this function has zero side effects.
 */
export function applyRetention(
  snapshots: SnapshotRecord[],
  policy: RetentionPolicy = DEFAULT_RETENTION,
  now: Date = new Date(),
): RetentionOutcome {
  const outcome: RetentionOutcome = { keep: [], purge: [], archive: [] };
  const dayMs = 24 * 60 * 60 * 1000;

  const actives = snapshots.filter((s) => s.state === "active");
  const archived = snapshots
    .filter((s) => s.state === "archived")
    .sort((a, b) => (b.archivedAt ?? b.createdAt).localeCompare(a.archivedAt ?? a.createdAt));

  // Enforce the single-active invariant: keep the newest, archive the rest.
  actives
    .sort((a, b) => (b.activatedAt ?? b.createdAt).localeCompare(a.activatedAt ?? a.createdAt))
    .forEach((s, idx) => {
      if (idx === 0) {
        // Age-based auto-archive of the sole active snapshot.
        const ageDays = (now.getTime() - new Date(s.activatedAt ?? s.createdAt).getTime()) / dayMs;
        if (ageDays > policy.archiveAfterDays) outcome.archive.push(s);
        else outcome.keep.push(s);
      } else {
        outcome.archive.push(s);
      }
    });

  // Archived: keep newest N, purge the rest and anything past purgeAfterDays.
  archived.forEach((s, idx) => {
    const ageDays =
      (now.getTime() - new Date(s.archivedAt ?? s.createdAt).getTime()) / dayMs;
    if (idx >= policy.keepArchived || ageDays > policy.purgeAfterDays) {
      outcome.purge.push(s);
    } else {
      outcome.keep.push(s);
    }
  });

  // Deprecated is always purged; building is always kept.
  for (const s of snapshots) {
    if (s.state === "building") outcome.keep.push(s);
    if (s.state === "deprecated") outcome.purge.push(s);
  }

  return outcome;
}
