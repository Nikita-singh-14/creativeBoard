import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Providers } from "@/components/Providers";
import { ProjectFormModal } from "@/components/ProjectFormModal";
import { SafeImage } from "@/components/SafeImage";
import DashboardPage from "@/app/page";
import ProjectWorkspace from "@/app/projects/[id]/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useParams: () => ({ id: "42" }) }));

function renderWithProviders(element: React.ReactNode) {
  return render(<Providers>{element}</Providers>);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  window.history.replaceState(null, "", "/");
});

describe("CreativeBoard UI", () => {
  it("shows a placeholder for an empty or failed image", () => {
    const { rerender } = render(<SafeImage src="" alt="Moodboard" placeholderLabel="Preview" />);
    expect(screen.getByRole("img", { name: "Moodboard (image unavailable)" })).toBeInTheDocument();

    rerender(<SafeImage src="https://example.test/mood.jpg" alt="Moodboard" />);
    fireEvent.error(screen.getByRole("img", { name: "Moodboard" }));
    expect(screen.getByRole("img", { name: "Moodboard (image unavailable)" })).toBeInTheDocument();

    rerender(<SafeImage src="https://example.test/another.jpg" alt="Moodboard" />);
    expect(screen.getByRole("img", { name: "Moodboard" })).toBeInTheDocument();
  });

  it("shows required validation before submitting an empty project name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProjectFormModal onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Create project" }));
    expect(await screen.findByText("Project name is required.")).toBeInTheDocument();
  });

  it("maps API validation errors onto the project form", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:5000");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ errors: { Name: ["Name must be unique."] } }),
      { status: 400, headers: { "Content-Type": "application/problem+json" } },
    )));
    const user = userEvent.setup();
    renderWithProviders(<ProjectFormModal onClose={vi.fn()} />);
    await user.type(screen.getAllByRole("textbox")[0], "Spring campaign");
    await user.click(screen.getByRole("button", { name: "Create project" }));
    expect(await screen.findByText("Name must be unique.")).toBeInTheDocument();
  });

  it("loads an empty dashboard from the API", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:5000");
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/summary")) return new Response(JSON.stringify({ totalProjects: 0, totalIdeas: 0, approvedIdeas: 0 }), { status: 200 });
      return new Response("[]", { status: 200 });
    }));
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByText("Your next big idea starts here")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create your first project/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Projects")).toBeInTheDocument());
  });

  it("moves an idea using the API response and shows confirmation", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:5000");
    let stage = "Idea";
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/projects/42")) {
        return new Response(JSON.stringify({
          id: 42, name: "Summer launch", description: "", coverImageUrl: null,
          status: "Active", dueDate: null, createdAt: "2026-01-01T00:00:00Z", ideaCount: 1, approvedCount: 0,
        }), { status: 200 });
      }
      if (url.endsWith("/api/projects/42/ideas/7/stage")) {
        stage = (JSON.parse(String(init?.body)) as { stage: string }).stage;
        return new Response(JSON.stringify({
          id: 7, projectId: 42, title: "Color study", imageUrl: null, note: "", stage,
          createdAt: "2026-01-01T00:00:00Z",
        }), { status: 200 });
      }
      if (url.endsWith("/api/projects/42/ideas")) {
        return new Response(JSON.stringify([{
          id: 7, projectId: 42, title: "Color study", imageUrl: null, note: "", stage,
          createdAt: "2026-01-01T00:00:00Z",
        }]), { status: 200 });
      }
      return new Response("[]", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWithProviders(<ProjectWorkspace />);
    const selector = await screen.findByRole("combobox", { name: "Move Color study to stage" });
    await user.selectOptions(selector, "Approved");
    expect(await screen.findByText("Moved to Approved")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5000/api/projects/42/ideas/7/stage",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
