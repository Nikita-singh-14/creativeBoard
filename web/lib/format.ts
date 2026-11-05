import type { IdeaStage, ProjectStatus } from "@/types";
import { STAGE_LABELS, STATUS_LABELS } from "@/lib/constants";

export function formatDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(year, month - 1, day));
}

export function isOverdue(value: string | null, status: ProjectStatus) {
  if (!value || status === "Completed") return false;
  const due = new Date(`${value.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function isDueSoon(value: string | null, status: ProjectStatus) {
  if (!value || status === "Completed" || isOverdue(value, status)) return false;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const due = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000;
}

export function stageLabel(stage: IdeaStage) {
  return STAGE_LABELS[stage];
}

export function statusLabel(status: ProjectStatus) {
  return STATUS_LABELS[status];
}

export function validHttpUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && !/\s/.test(value);
  } catch {
    return false;
  }
}
