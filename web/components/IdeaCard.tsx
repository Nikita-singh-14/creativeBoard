"use client";

import { ArrowRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { IDEA_STAGES, STAGE_LABELS } from "@/lib/constants";
import { stageLabel } from "@/lib/format";
import type { Idea, IdeaStage } from "@/types";
import { SafeImage } from "@/components/SafeImage";

export function IdeaCard({ idea, onEdit, onDelete, onMove, moving }: {
  idea: Idea; onEdit: (idea: Idea) => void; onDelete: (idea: Idea) => void;
  onMove: (idea: Idea, stage: IdeaStage) => void; moving: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <article className="idea-card">
      <div className="idea-image"><SafeImage src={idea.imageUrl} alt={idea.title} placeholderLabel="Inspiration" />
        <span className={`stage-badge stage-${idea.stage.toLowerCase()}`}>{stageLabel(idea.stage)}</span>
        <div className="idea-menu">
          <button className="icon-button card-menu-trigger" aria-label={`Actions for ${idea.title}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((current) => !current)}><MoreHorizontal size={18} /></button>
          {menuOpen ? <div className="menu-popover">
            <button onClick={() => { setMenuOpen(false); onEdit(idea); }}><Pencil size={15} /> Edit idea</button>
            <button className="menu-danger" onClick={() => { setMenuOpen(false); onDelete(idea); }}><Trash2 size={15} /> Delete idea</button>
          </div> : null}
        </div>
      </div>
      <div className="idea-content">
        <h3>{idea.title}</h3>
        {idea.note ? <p>{idea.note}</p> : <p className="idea-note-muted">No note added</p>}
        <div className="idea-card-bottom">
          <label className="stage-move-label" htmlFor={`stage-${idea.id}`}>Move to</label>
          <select id={`stage-${idea.id}`} value={idea.stage} disabled={moving} onChange={(event) => onMove(idea, event.target.value as IdeaStage)} aria-label={`Move ${idea.title} to stage`}>
            {IDEA_STAGES.map((stage) => <option value={stage} key={stage}>{STAGE_LABELS[stage]}</option>)}
          </select>
          <span className="move-next-hint" aria-hidden="true"><ArrowRight size={14} /></span>
        </div>
      </div>
    </article>
  );
}
