"use client";

import { ArrowUpRight, CalendarDays, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Project } from "@/types";
import { formatDate, isDueSoon, isOverdue, statusLabel } from "@/lib/format";
import { SafeImage } from "@/components/SafeImage";

export function ProjectCard({ project, onEdit, onDelete }: {
  project: Project; onEdit: (project: Project) => void; onDelete: (project: Project) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const overdue = isOverdue(project.dueDate, project.status);
  const dueSoon = isDueSoon(project.dueDate, project.status);
  const open = () => router.push(`/projects/${project.id}`);
  return (
    <article className="project-card" role="link" tabIndex={0} aria-label={`Open ${project.name}`} onClick={open} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } }}>
      <div className="project-cover">
        <SafeImage src={project.coverImageUrl} alt={`${project.name} cover`} placeholderLabel="CreativeBoard" />
        <span className={`status-badge status-${project.status.toLowerCase()}`}>{statusLabel(project.status)}</span>
        <div className="project-menu">
          <button className="icon-button card-menu-trigger" aria-label={`Actions for ${project.name}`} aria-expanded={menuOpen} onClick={(event) => { event.stopPropagation(); setMenuOpen((openState) => !openState); }}><MoreHorizontal size={19} /></button>
          {menuOpen ? <div className="menu-popover" onClick={(event) => event.stopPropagation()}>
            <button onClick={() => { setMenuOpen(false); onEdit(project); }}><Pencil size={15} /> Edit project</button>
            <button className="menu-danger" onClick={() => { setMenuOpen(false); onDelete(project); }}><Trash2 size={15} /> Delete project</button>
          </div> : null}
        </div>
      </div>
      <div className="project-card-content">
        <div className="project-title-line"><h3>{project.name}</h3><ArrowUpRight size={17} className="project-arrow" /></div>
        <p className="project-description">{project.description || "A space for your next creative direction."}</p>
        <div className="project-card-footer">
          <span className="idea-count">{project.ideaCount} {project.ideaCount === 1 ? "idea" : "ideas"} <span className="count-dot">·</span> {project.approvedCount} approved</span>
          {project.dueDate ? <span className={`due-date ${overdue ? "is-overdue" : dueSoon ? "is-due-soon" : ""}`}><CalendarDays size={13} /> {overdue ? "Overdue" : dueSoon ? `Due soon · ${formatDate(project.dueDate)}` : formatDate(project.dueDate)}</span> : null}
        </div>
      </div>
    </article>
  );
}
