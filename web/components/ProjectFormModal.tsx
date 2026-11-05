"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { LIMITS, PROJECT_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { validHttpUrl } from "@/lib/format";
import type { Project, ProjectInput, ProjectStatus } from "@/types";
import { useToast } from "@/components/ToastProvider";
import { Modal } from "@/components/Modal";
import { SafeImage } from "@/components/SafeImage";

const EMPTY: ProjectInput = { name: "", description: "", coverImageUrl: null, status: "Planning", dueDate: null };

export function ProjectFormModal({ project, onClose }: { project?: Project; onClose: () => void }) {
  const [values, setValues] = useState<ProjectInput>(project ? {
    name: project.name, description: project.description, coverImageUrl: project.coverImageUrl,
    status: project.status, dueDate: project.dueDate?.slice(0, 10) ?? null,
  } : EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: (input: ProjectInput) => api.saveProject(input, project?.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
        project ? queryClient.invalidateQueries({ queryKey: ["project", project.id] }) : Promise.resolve(),
      ]);
      showToast(project ? "Project updated" : "Project created");
      onClose();
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.status === 400) {
        const mapped: Record<string, string> = {};
        Object.entries(error.fieldErrors).forEach(([key, messages]) => { mapped[key.charAt(0).toLowerCase() + key.slice(1)] = messages[0] ?? ""; });
        setFieldErrors(mapped);
        setGeneralError(Object.keys(mapped).length ? "" : error.message);
      } else {
        setGeneralError(error.message);
        if (error instanceof ApiError && error.status === 404) {
          showToast("This project was already removed. Your list has been refreshed.", "info");
          void queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      }
    },
  });

  const close = () => { if (!mutation.isPending) onClose(); };

  const update = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };
  const validate = () => {
    const errors: Record<string, string> = {};
    if (!values.name.trim()) errors.name = "Project name is required.";
    else if (values.name.trim().length > LIMITS.name) errors.name = `Name must be ${LIMITS.name} characters or fewer.`;
    if (values.description.length > LIMITS.description) errors.description = `Description must be ${LIMITS.description} characters or fewer.`;
    if ((values.coverImageUrl?.length ?? 0) > LIMITS.url || !validHttpUrl(values.coverImageUrl ?? "")) errors.coverImageUrl = "Use an absolute http or https image URL.";
    if (values.dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(values.dueDate) || Number(values.dueDate.slice(0, 4)) < 2000 || Number(values.dueDate.slice(0, 4)) > 2100)) errors.dueDate = "Enter a date between 2000 and 2100.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setGeneralError("");
    if (!validate()) return;
    mutation.mutate({ ...values, name: values.name.trim(), description: values.description.trim(), coverImageUrl: values.coverImageUrl?.trim() || null, dueDate: values.dueDate || null });
  };
  const errorProps = (key: string) => ({
    "aria-invalid": Boolean(fieldErrors[key]),
    "aria-describedby": fieldErrors[key] ? `${key}-error` : undefined,
  });

  return (
    <Modal title={project ? "Edit project" : "Create a project"} eyebrow={project ? "Make it yours" : "A new beginning"} onClose={close} wide>
      <form className="form-stack" onSubmit={submit} noValidate>
        <label className="field-label">Project name <span className="required-mark">*</span>
          <input autoFocus value={values.name} maxLength={LIMITS.name} placeholder="e.g. Summer campaign 2025" {...errorProps("name")} onChange={(event) => update("name", event.target.value)} />
          {fieldErrors.name ? <small id="name-error" className="field-error">{fieldErrors.name}</small> : null}
        </label>
        <label className="field-label">Description <span className="optional-mark">Optional</span>
          <textarea value={values.description} rows={3} maxLength={LIMITS.description} placeholder="What are you creating?" {...errorProps("description")} onChange={(event) => update("description", event.target.value)} />
          {fieldErrors.description ? <small id="description-error" className="field-error">{fieldErrors.description}</small> : null}
        </label>
        <div className="preview-field">
          <label className="field-label">Cover image URL <span className="optional-mark">Optional</span>
            <input value={values.coverImageUrl ?? ""} maxLength={LIMITS.url} placeholder="https://…" {...errorProps("coverImageUrl")} onChange={(event) => update("coverImageUrl", event.target.value || null)} />
            {fieldErrors.coverImageUrl ? <small id="coverImageUrl-error" className="field-error">{fieldErrors.coverImageUrl}</small> : null}
          </label>
          <div className="form-image-preview"><SafeImage src={values.coverImageUrl} alt="Project cover preview" placeholderLabel="Preview" /></div>
        </div>
        <div className="field-row">
          <label className="field-label">Status
            <select value={values.status} onChange={(event) => update("status", event.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((status) => <option value={status} key={status}>{STATUS_LABELS[status]}</option>)}
            </select>
          </label>
          <label className="field-label">Due date <span className="optional-mark">Optional</span>
            <input type="date" min="2000-01-01" max="2100-12-31" value={values.dueDate ?? ""} {...errorProps("dueDate")} onChange={(event) => update("dueDate", event.target.value || null)} />
            {fieldErrors.dueDate ? <small id="dueDate-error" className="field-error">{fieldErrors.dueDate}</small> : null}
          </label>
        </div>
        {generalError ? <p className="form-error" role="alert">{generalError}</p> : null}
        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={close} disabled={mutation.isPending}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={mutation.isPending}><ImagePlus size={16} /> {mutation.isPending ? "Saving…" : project ? "Save changes" : "Create project"}</button>
        </div>
      </form>
    </Modal>
  );
}
