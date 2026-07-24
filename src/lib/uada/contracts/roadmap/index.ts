// H12.5 — Roadmap awareness item (consumed by H20 Context Engine).

export type RoadmapStatus = "done" | "planned" | "blocked" | "in_progress";

export interface RoadmapItem {
  id: string;
  title: string;
  status: RoadmapStatus;
  sprint?: string;
  source: "adr" | "tech-debt" | "plan" | "manual";
  path?: string;
  notes?: string;
}
