"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, BriefcaseBusiness, Check, ChevronDown, CirclePlus, Command, Layers3, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { PROJECT_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectFormModal } from "@/components/ProjectFormModal";
import { ConfirmDialog } from "@/components/Modal";
import { EmptyState, ErrorState, LoadingCards } from "@/components/Feedback";
import { useToast } from "@/components/ToastProvider";
import type { Project, ProjectStatus } from "@/types";
import { getLocationSearch, subscribeToLocation, updateLocationParams } from "@/lib/location";

export default function DashboardPage() {
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editing, setEditing] = useState<Project | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const locationSearch = useSyncExternalStore(subscribeToLocation, getLocationSearch, () => "");
  const params = useMemo(() => new URLSearchParams(locationSearch), [locationSearch]);
  const search = params.get("search") ?? "";
  const statusValue = params.get("status") ?? "";
  const status = PROJECT_STATUSES.includes(statusValue as ProjectStatus) ? statusValue as ProjectStatus : "";
  const client = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const projectQuery = useQuery({
    queryKey: ["projects", debouncedSearch, status],
    queryFn: ({ signal }) => api.projects(debouncedSearch, status, signal),
  });
  const summaryQuery = useQuery({ queryKey: ["summary"], queryFn: ({ signal }) => api.summary(signal) });
  const projects = projectQuery.data ?? [];
  const isFiltered = Boolean(search.trim() || status);
  const removeProject = useMutation({
    mutationFn: (project: Project) => api.deleteProject(project.id),
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({ queryKey: ["projects"] }), client.invalidateQueries({ queryKey: ["summary"] })]);
      showToast("Project deleted");
      setDeleting(null);
    },
    onError: async (error: Error) => {
      if (error instanceof ApiError && error.status === 404) {
        await Promise.all([client.invalidateQueries({ queryKey: ["projects"] }), client.invalidateQueries({ queryKey: ["summary"] })]);
        showToast("This project was already deleted. Your list is up to date.", "info");
        setDeleting(null);
      } else {
        setDeleteError(error.message);
      }
    },
  });

  const clearFilters = () => { updateLocationParams({ search: null, status: null }); setDebouncedSearch(""); };
  const summary = summaryQuery.data;
  const metrics = useMemo(() => [
    { label: "Projects", value: summary?.totalProjects, icon: BriefcaseBusiness, tint: "violet" },
    { label: "Ideas collected", value: summary?.totalIdeas, icon: Layers3, tint: "blue" },
    { label: "Ready to roll", value: summary?.approvedIdeas, icon: Check, tint: "green" },
  ], [summary]);

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="CreativeBoard home"><span className="brand-icon"><Command size={19} strokeWidth={2.6} /></span><span>creative<span>board</span></span></Link>
        <div className="topbar-right"><span className="workspace-pill"><span className="online-dot" /> Personal workspace</span><span className="avatar" aria-label="Profile initial N">N</span></div>
      </header>
      <div className="dashboard-main">
        <section className="welcome-row">
          <div>
            <span className="eyebrow welcome-eyebrow"><Sparkles size={14} /> YOUR CREATIVE SPACE</span>
            <h1>Make room for <em>great ideas.</em></h1>
            <p className="welcome-copy">A home for the projects you’re imagining and the inspiration that moves them forward.</p>
          </div>
          <button className="button button-primary new-project-button" onClick={() => setEditing(null)}><CirclePlus size={17} /> New project</button>
        </section>

        <section className="metrics-grid" aria-label="Workspace summary">
          {metrics.map(({ label, value, icon: Icon, tint }) => (
            <article className="metric-card" key={label}>
              <span className={`metric-icon metric-${tint}`}><Icon size={18} /></span>
              <span className="metric-value">{value === undefined ? <span className="metric-skeleton" /> : value}</span>
              <span className="metric-label">{label}</span>
            </article>
          ))}
        </section>

        <section className="projects-section">
          <div className="section-heading">
            <div><div className="section-kicker">THE WORK IN PROGRESS</div><h2>Your projects <span className="project-total">{projectQuery.isLoading ? "…" : projects.length}</span></h2></div>
            <span className="sorted-label"><ArrowDownUp size={14} /> Recently created</span>
          </div>
          <div className="filter-toolbar">
            <label className="search-field"><Search size={17} /><input ref={searchInput} value={search} onChange={(event) => updateLocationParams({ search: event.target.value })} placeholder="Find a project…" aria-label="Search projects" /><kbd>⌘ K</kbd></label>
            <label className="status-select-wrap"><span className="filter-caption">STATUS</span><select aria-label="Filter by status" value={status} onChange={(event) => updateLocationParams({ status: event.target.value })}><option value="">All statuses</option>{PROJECT_STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select><ChevronDown size={15} /></label>
            {isFiltered ? <button className="clear-filter" onClick={clearFilters}><X size={15} /> Clear</button> : null}
          </div>

          {projectQuery.isLoading ? <LoadingCards count={3} /> : projectQuery.isError
            ? <ErrorState message={projectQuery.error.message} onRetry={() => void projectQuery.refetch()} />
            : projects.length === 0
              ? <EmptyState filtered={isFiltered} onClear={clearFilters} onCreate={() => setEditing(null)} />
              : <div className="project-grid">{projects.map((project) => <ProjectCard key={project.id} project={project} onEdit={setEditing} onDelete={(item) => { setDeleteError(""); setDeleting(item); }} />)}</div>}
        </section>
        <footer className="dashboard-footer"><span>Made for the beautifully unfinished.</span><span>CreativeBoard <span className="footer-dot">✳</span> Your ideas, in motion</span></footer>
      </div>

      {editing !== undefined ? <ProjectFormModal project={editing ?? undefined} onClose={() => setEditing(undefined)} /> : null}
      {deleting ? <ConfirmDialog title="Delete this project?" confirmLabel={removeProject.isPending ? "Deleting…" : "Delete project"} pending={removeProject.isPending} onCancel={() => setDeleting(null)} onConfirm={() => { setDeleteError(""); removeProject.mutate(deleting); }}>
        <p><strong>{deleting.name}</strong> and its {deleting.ideaCount} {deleting.ideaCount === 1 ? "idea" : "ideas"} will be permanently deleted.</p>
        {deleteError ? <p className="form-error" role="alert">{deleteError}</p> : null}
      </ConfirmDialog> : null}
    </main>
  );
}
