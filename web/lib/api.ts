import type { Idea, IdeaInput, ProblemDetails, Project, ProjectInput, Summary } from "@/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    const message = "NEXT_PUBLIC_API_URL is missing. Set it in web/.env.local and restart the web app.";
    console.error(message);
    throw new ApiError(message, 0);
  }

  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Can't reach the server. Is the API running?", 0);
  }

  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = body && typeof body === "object" ? (body as ProblemDetails) : {};
    throw new ApiError(
      problem.detail ?? problem.title ?? "The request could not be completed.",
      response.status,
      problem.errors ?? {},
    );
  }
  return body as T;
}

export const api = {
  summary: (signal?: AbortSignal) => request<Summary>("/api/summary", { signal }),
  projects: (search = "", status = "", signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    return request<Project[]>(`/api/projects${params.size ? `?${params}` : ""}`, { signal });
  },
  project: (id: number, signal?: AbortSignal) => request<Project>(`/api/projects/${id}`, { signal }),
  saveProject: (input: ProjectInput, id?: number) =>
    request<Project>(id ? `/api/projects/${id}` : "/api/projects", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(input),
    }),
  deleteProject: (id: number) => request<void>(`/api/projects/${id}`, { method: "DELETE" }),
  ideas: (projectId: number, signal?: AbortSignal) => request<Idea[]>(`/api/projects/${projectId}/ideas`, { signal }),
  saveIdea: (projectId: number, input: IdeaInput, ideaId?: number) =>
    request<Idea>(ideaId ? `/api/projects/${projectId}/ideas/${ideaId}` : `/api/projects/${projectId}/ideas`, {
      method: ideaId ? "PUT" : "POST",
      body: JSON.stringify(input),
    }),
  moveIdea: (projectId: number, ideaId: number, stage: IdeaInput["stage"]) =>
    request<Idea>(`/api/projects/${projectId}/ideas/${ideaId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    }),
  deleteIdea: (projectId: number, ideaId: number) =>
    request<void>(`/api/projects/${projectId}/ideas/${ideaId}`, { method: "DELETE" }),
};
