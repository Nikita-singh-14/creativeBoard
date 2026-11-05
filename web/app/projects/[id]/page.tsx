"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Check, CirclePlus, Command, ImagePlus, Layers3, MoreHorizontal, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { IDEA_STAGES, STAGE_LABELS } from "@/lib/constants";
import { formatDate, isOverdue, statusLabel } from "@/lib/format";
import { SafeImage } from "@/components/SafeImage";
import { IdeaCard } from "@/components/IdeaCard";
import { IdeaFormModal } from "@/components/IdeaFormModal";
import { ProjectFormModal } from "@/components/ProjectFormModal";
import { ConfirmDialog } from "@/components/Modal";
import { ErrorState, NotFoundState } from "@/components/Feedback";
import { useToast } from "@/components/ToastProvider";
import type { Idea, IdeaStage, Project } from "@/types";
import { getLocationSearch, subscribeToLocation, updateLocationParams } from "@/lib/location";

const EMPTY_IDEAS: Idea[] = [];

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const validId = Number.isSafeInteger(projectId) && projectId > 0;
  const [editingIdea, setEditingIdea] = useState<Idea | null | undefined>(undefined);
  const [editingProject, setEditingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [deletingIdea, setDeletingIdea] = useState<Idea | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const client = useQueryClient();
  const { showToast } = useToast();
  const locationSearch = useSyncExternalStore(subscribeToLocation, getLocationSearch, () => "");
  const stageValue = new URLSearchParams(locationSearch).get("stage") ?? "";
  const stage = IDEA_STAGES.includes(stageValue as IdeaStage) ? stageValue as IdeaStage : "";
  const projectQuery = useQuery({ queryKey: ["project", projectId], queryFn: ({ signal }) => api.project(projectId, signal), enabled: validId });
  const ideaQuery = useQuery({ queryKey: ["ideas", projectId], queryFn: ({ signal }) => api.ideas(projectId, signal), enabled: validId });

  const allIdeas = ideaQuery.data ?? EMPTY_IDEAS;
  const setStage = (nextStage: IdeaStage | "") => updateLocationParams({ stage: nextStage || null });
  const filteredIdeas = stage ? allIdeas.filter((idea) => idea.stage === stage) : allIdeas;
  const counts = useMemo(() => ({
    Idea: allIdeas.filter((item) => item.stage === "Idea").length,
    InReview: allIdeas.filter((item) => item.stage === "InReview").length,
    Approved: allIdeas.filter((item) => item.stage === "Approved").length,
  }), [allIdeas]);

  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ["ideas", projectId] }),
    client.invalidateQueries({ queryKey: ["project", projectId] }),
    client.invalidateQueries({ queryKey: ["projects"] }),
    client.invalidateQueries({ queryKey: ["summary"] }),
  ]);
  const refreshLists = () => Promise.all([
    client.invalidateQueries({ queryKey: ["projects"] }),
    client.invalidateQueries({ queryKey: ["summary"] }),
  ]);
  const moveIdea = useMutation({
    mutationFn: ({ idea, next }: { idea: Idea; next: IdeaStage }) => api.moveIdea(projectId, idea.id, next),
    onSuccess: async (updated) => {
      client.setQueryData<Idea[]>(["ideas", projectId], (current) => current?.map((idea) => idea.id === updated.id ? updated : idea));
      await Promise.all([client.invalidateQueries({ queryKey: ["project", projectId] }), client.invalidateQueries({ queryKey: ["projects"] }), client.invalidateQueries({ queryKey: ["summary"] })]);
      showToast(`Moved to ${STAGE_LABELS[updated.stage]}`);
    },
    onError: async (error: Error) => { showToast(error.message, "error"); await refresh(); },
  });
  const removeIdea = useMutation({
    mutationFn: (idea: Idea) => api.deleteIdea(projectId, idea.id),
    onSuccess: async () => { await refresh(); showToast("Idea deleted"); setDeletingIdea(null); },
    onError: async (error: Error) => {
      if (error instanceof ApiError && error.status === 404) { await refresh(); setDeletingIdea(null); showToast("This idea was already deleted.", "info"); }
      else setDeleteError(error.message);
    },
  });
  const removeProject = useMutation({
    mutationFn: (project: Project) => api.deleteProject(project.id),
    onSuccess: async () => { await refreshLists(); showToast("Project deleted"); router.push("/"); },
    onError: async (error: Error) => {
      if (error instanceof ApiError && error.status === 404) { await refreshLists(); showToast("This project was already deleted.", "info"); router.push("/"); }
      else setDeleteError(error.message);
    },
  });

  if (!validId) return <NotFoundState message="That project address doesn’t look right." />;
  if (projectQuery.isLoading) return <main className="workspace-shell"><div className="workspace-loading"><span className="large-spinner" /> Loading your project…</div></main>;
  if (projectQuery.isError) {
    if (projectQuery.error instanceof ApiError && projectQuery.error.status === 404) return <NotFoundState message="This project may have been deleted, or the link may be incorrect." />;
    return <main className="workspace-shell"><ErrorState message={projectQuery.error.message} onRetry={() => void projectQuery.refetch()} /></main>;
  }
  const project = projectQuery.data;
  if (!project) return <NotFoundState />;
  const overdue = isOverdue(project.dueDate, project.status);

  return (
    <main className="workspace-shell">
      <header className="topbar workspace-topbar">
        <Link href="/" className="brand"><span className="brand-icon"><Command size={19} strokeWidth={2.6} /></span><span>creative<span>board</span></span></Link>
        <div className="topbar-right"><Link href="/" className="back-dashboard"><ArrowLeft size={15} /> All projects</Link><span className="workspace-pill"><span className="online-dot" /> Personal workspace</span><span className="avatar">N</span></div>
      </header>
      <div className="workspace-main">
        <div className="breadcrumb"><Link href="/">Projects</Link><span>/</span><span>{project.name}</span></div>
        <section className="project-hero">
          <div className="project-hero-image"><SafeImage src={project.coverImageUrl} alt={`${project.name} cover`} placeholderLabel="CreativeBoard" /></div>
          <div className="project-hero-content">
            <span className={`status-badge status-${project.status.toLowerCase()}`}>{statusLabel(project.status)}</span>
            <div className="hero-title-row"><h1>{project.name}</h1>
              <div className="hero-actions">
                <button className="button button-secondary" onClick={() => setEditingProject(true)}><Pencil size={15} /> Edit project</button>
                <div className="hero-menu-wrap">
                  <button className="icon-button" aria-label="More project actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((current) => !current)}><MoreHorizontal size={19} /></button>
                  {menuOpen ? <div className="menu-popover"><button className="menu-danger" onClick={() => { setMenuOpen(false); setDeleteError(""); setDeletingProject(true); }}><Trash2 size={15} /> Delete project</button></div> : null}
                </div>
              </div>
            </div>
            <p className="project-hero-description">{project.description || "A space for your next creative direction."}</p>
            {project.dueDate ? <span className={`hero-due-date ${overdue ? "is-overdue" : ""}`}><CalendarDays size={15} /> {overdue ? "Overdue" : `Due ${formatDate(project.dueDate)}`}</span> : null}
            <div className="workspace-mini-stats"><span><Layers3 size={15} /> {allIdeas.length} ideas</span><span><Check size={15} /> {counts.Approved} approved</span><span><Sparkles size={15} /> {counts.InReview} in review</span></div>
          </div>
        </section>

        <section className="ideas-section">
          <div className="section-heading">
            <div><div className="section-kicker">THE IDEA BOARD</div><h2>Inspiration <span className="project-total">{allIdeas.length}</span></h2></div>
            <button className="button button-primary" onClick={() => setEditingIdea(null)}><CirclePlus size={16} /> Add inspiration</button>
          </div>
          <div className="stage-tabs" role="tablist" aria-label="Filter ideas by stage">
            <button role="tab" aria-selected={!stage} className={!stage ? "active" : ""} onClick={() => setStage("")}>All <span>{allIdeas.length}</span></button>
            {IDEA_STAGES.map((item) => <button role="tab" aria-selected={stage === item} className={stage === item ? "active" : ""} key={item} onClick={() => setStage(item)}>{STAGE_LABELS[item]} <span>{counts[item]}</span></button>)}
          </div>

          {ideaQuery.isLoading ? <div className="idea-grid">{[1, 2, 3].map((item) => <div className="skeleton-card" key={item}><div className="skeleton-cover" /><div className="skeleton-line wide" /></div>)}</div>
            : ideaQuery.isError ? <ErrorState message={ideaQuery.error.message} onRetry={() => void ideaQuery.refetch()} />
              : filteredIdeas.length ? <div className="idea-grid">{filteredIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} onEdit={setEditingIdea} onDelete={(item) => { setDeleteError(""); setDeletingIdea(item); }} moving={moveIdea.isPending && moveIdea.variables?.idea.id === idea.id} onMove={(item, next) => moveIdea.mutate({ idea: item, next })} />)}</div>
                : <div className="empty-state idea-empty"><div className="empty-icon"><ImagePlus size={24} /></div><h2>{stage ? `No ideas in ${STAGE_LABELS[stage]}` : "Your inspiration board is waiting"}</h2><p>{stage ? "Move an idea here when it’s ready for this stage." : "Save the references, visuals, and little sparks that shape this project."}</p>{!stage ? <button className="button button-primary" onClick={() => setEditingIdea(null)}><CirclePlus size={16} /> Add your first idea</button> : null}</div>}
        </section>
        <footer className="dashboard-footer"><span>Keep collecting. The direction will emerge.</span><span>CreativeBoard <span className="footer-dot">✳</span> Your ideas, in motion</span></footer>
      </div>

      {editingIdea !== undefined ? <IdeaFormModal projectId={projectId} idea={editingIdea ?? undefined} onClose={() => setEditingIdea(undefined)} /> : null}
      {editingProject ? <ProjectFormModal project={project} onClose={() => setEditingProject(false)} /> : null}
      {deletingIdea ? <ConfirmDialog title="Remove this idea?" confirmLabel="Delete idea" pending={removeIdea.isPending} onCancel={() => setDeletingIdea(null)} onConfirm={() => removeIdea.mutate(deletingIdea)}><p><strong>{deletingIdea.title}</strong> will be permanently removed from this project.</p>{deleteError ? <p className="form-error">{deleteError}</p> : null}</ConfirmDialog> : null}
      {deletingProject ? <ConfirmDialog title="Delete this project?" confirmLabel="Delete project" pending={removeProject.isPending} onCancel={() => setDeletingProject(false)} onConfirm={() => removeProject.mutate(project)}><p><strong>{project.name}</strong> and its {project.ideaCount} {project.ideaCount === 1 ? "idea" : "ideas"} will be permanently deleted.</p>{deleteError ? <p className="form-error">{deleteError}</p> : null}</ConfirmDialog> : null}
    </main>
  );
}
