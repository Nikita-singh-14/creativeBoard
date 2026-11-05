"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { IDEA_STAGES, LIMITS, STAGE_LABELS } from "@/lib/constants";
import { validHttpUrl } from "@/lib/format";
import type { Idea, IdeaInput, IdeaStage } from "@/types";
import { useToast } from "@/components/ToastProvider";
import { Modal } from "@/components/Modal";
import { SafeImage } from "@/components/SafeImage";

export function IdeaFormModal({ projectId, idea, onClose }: { projectId: number; idea?: Idea; onClose: () => void }) {
  const [values, setValues] = useState<IdeaInput>({
    title: idea?.title ?? "", imageUrl: idea?.imageUrl ?? null, note: idea?.note ?? "", stage: idea?.stage ?? "Idea",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const client = useQueryClient();
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: (input: IdeaInput) => api.saveIdea(projectId, input, idea?.id),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["ideas", projectId] }),
        client.invalidateQueries({ queryKey: ["project", projectId] }),
        client.invalidateQueries({ queryKey: ["projects"] }),
        client.invalidateQueries({ queryKey: ["summary"] }),
      ]);
      showToast(idea ? "Inspiration updated" : "Inspiration added");
      onClose();
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.status === 400) {
        const mapped: Record<string, string> = {};
        Object.entries(error.fieldErrors).forEach(([key, messages]) => { mapped[key.charAt(0).toLowerCase() + key.slice(1)] = messages[0] ?? ""; });
        setErrors(mapped);
        setGeneralError(Object.keys(mapped).length ? "" : error.message);
      } else {
        setGeneralError(error.message);
        if (error instanceof ApiError && error.status === 404) void client.invalidateQueries({ queryKey: ["ideas", projectId] });
      }
    },
  });
  const close = () => { if (!mutation.isPending) onClose(); };
  const update = <K extends keyof IdeaInput>(key: K, value: IdeaInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!values.title.trim()) next.title = "Idea title is required.";
    if (values.title.trim().length > LIMITS.title) next.title = `Title must be ${LIMITS.title} characters or fewer.`;
    if (values.note.length > LIMITS.note) next.note = `Note must be ${LIMITS.note} characters or fewer.`;
    if ((values.imageUrl?.length ?? 0) > LIMITS.url || !validHttpUrl(values.imageUrl ?? "")) next.imageUrl = "Use an absolute http or https image URL.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setGeneralError("");
    mutation.mutate({ ...values, title: values.title.trim(), note: values.note.trim(), imageUrl: values.imageUrl?.trim() || null });
  };

  return (
    <Modal title={idea ? "Edit inspiration" : "Add inspiration"} eyebrow="Collect the good stuff" onClose={close} wide>
      <form className="form-stack" onSubmit={submit} noValidate>
        <label className="field-label">Title <span className="required-mark">*</span>
          <input autoFocus value={values.title} maxLength={LIMITS.title} placeholder="Give this idea a name" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "title-error" : undefined} onChange={(event) => update("title", event.target.value)} />
          {errors.title ? <small id="title-error" className="field-error">{errors.title}</small> : null}
        </label>
        <div className="preview-field">
          <label className="field-label">Image URL <span className="optional-mark">Optional</span>
            <input value={values.imageUrl ?? ""} maxLength={LIMITS.url} placeholder="https://…" aria-invalid={Boolean(errors.imageUrl)} aria-describedby={errors.imageUrl ? "imageUrl-error" : undefined} onChange={(event) => update("imageUrl", event.target.value || null)} />
            {errors.imageUrl ? <small id="imageUrl-error" className="field-error">{errors.imageUrl}</small> : null}
          </label>
          <div className="form-image-preview"><SafeImage src={values.imageUrl} alt="Inspiration preview" placeholderLabel="Preview" /></div>
        </div>
        <label className="field-label">Note <span className="optional-mark">Optional</span>
          <textarea value={values.note} rows={3} maxLength={LIMITS.note} placeholder="A thought, a link, or what caught your eye…" aria-invalid={Boolean(errors.note)} aria-describedby={errors.note ? "note-error" : "note-counter"} onChange={(event) => update("note", event.target.value)} />
          <span className="field-meta">{errors.note ? <small id="note-error" className="field-error">{errors.note}</small> : <small id="note-counter">{values.note.length}/{LIMITS.note}</small>}</span>
        </label>
        <label className="field-label">Stage
          <select value={values.stage} onChange={(event) => update("stage", event.target.value as IdeaStage)}>
            {IDEA_STAGES.map((stage) => <option value={stage} key={stage}>{STAGE_LABELS[stage]}</option>)}
          </select>
        </label>
        {generalError ? <p className="form-error" role="alert">{generalError}</p> : null}
        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={close} disabled={mutation.isPending}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={mutation.isPending}><ImagePlus size={16} /> {mutation.isPending ? "Saving…" : idea ? "Save changes" : "Add inspiration"}</button>
        </div>
      </form>
    </Modal>
  );
}
