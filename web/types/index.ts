export type ProjectStatus = "Planning" | "Active" | "OnHold" | "Completed";
export type IdeaStage = "Idea" | "InReview" | "Approved";

export interface Project {
  id: number;
  name: string;
  description: string;
  coverImageUrl: string | null;
  status: ProjectStatus;
  dueDate: string | null;
  createdAt: string;
  ideaCount: number;
  approvedCount: number;
}

export interface Idea {
  id: number;
  projectId: number;
  title: string;
  imageUrl: string | null;
  note: string;
  stage: IdeaStage;
  createdAt: string;
}

export interface Summary {
  totalProjects: number;
  totalIdeas: number;
  approvedIdeas: number;
}

export interface ProjectInput {
  name: string;
  description: string;
  coverImageUrl: string | null;
  status: ProjectStatus;
  dueDate: string | null;
}

export interface IdeaInput {
  title: string;
  imageUrl: string | null;
  note: string;
  stage: IdeaStage;
}

export interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}
