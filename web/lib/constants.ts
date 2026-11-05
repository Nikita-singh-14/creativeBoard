import type { IdeaStage, ProjectStatus } from "@/types";

export const PROJECT_STATUSES: ProjectStatus[] = ["Planning", "Active", "OnHold", "Completed"];
export const IDEA_STAGES: IdeaStage[] = ["Idea", "InReview", "Approved"];
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  Planning: "Planning",
  Active: "Active",
  OnHold: "On Hold",
  Completed: "Completed",
};
export const STAGE_LABELS: Record<IdeaStage, string> = {
  Idea: "Idea",
  InReview: "In Review",
  Approved: "Approved",
};
export const LIMITS = { name: 100, description: 1000, title: 120, note: 500, url: 2048 };
