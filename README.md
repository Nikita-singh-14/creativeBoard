# CreativeBoard

CreativeBoard is a local-first visual project and inspiration manager for designers and marketing teams. Create a project, save inspiration cards, move ideas through a simple review flow, and find your work again after refreshing or restarting either app.

> Screenshot: capture the dashboard and project workspace here for a submission/demo.

## Features

- Responsive dashboard with persisted project and idea totals, URL-synced search, and status filters.
- Project create, edit, and delete with field validation and cascade removal of associated ideas.
- Project workspace with image-safe inspiration cards, idea CRUD, stage filters, and API-backed stage changes.
- ASP.NET Core API with DTOs, RFC 7807 errors, Swagger, CORS, and SQLite persistence through EF Core migrations.
- No sign-in, cloud services, seed data, or browser storage. The API/database is the only source of truth.

## Prerequisites

- .NET SDK 8.0 or later
- Node.js 20.9 or later (Node 22 LTS recommended) and npm
- Git
- No database installation is needed; SQLite is included with the API package.

## Run locally

Use two terminals from the repository root.

If PowerShell reports that `dotnet` is not recognized, add the standard .NET install folder to the current terminal's `PATH`, then retry:

```powershell
$env:PATH = "$env:ProgramFiles\dotnet;$env:PATH"
```

### 1. Start the API

```sh
cd api
dotnet restore
dotnet run
```

The API listens on `http://localhost:5000`; Swagger is at `http://localhost:5000/swagger`, and health is at `http://localhost:5000/health`. On Development startup EF Core applies the included migrations automatically and creates `api/creativeboard.db` if it is missing. To reset local data, stop the API and delete that file. If you have the EF tool installed, `dotnet ef database update` can also apply migrations explicitly.

### 2. Start the web app

```sh
cd web
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. On Windows Command Prompt, use `copy .env.example .env.local`; in PowerShell, use `Copy-Item .env.example .env.local`.

The web app reads `NEXT_PUBLIC_API_URL` at startup. If you edit `.env.local`, restart `npm run dev`. The default is `http://localhost:5000`.

## Configuration

| App | Name | Purpose | Default |
|---|---|---|---|
| Web | `NEXT_PUBLIC_API_URL` | Base URL used by the typed API client | `http://localhost:5000` |
| API | `ConnectionStrings:Default` | SQLite connection string | `Data Source=creativeboard.db` |
| API | `Cors:AllowedOrigins` | Browser origins allowed to call the API | `http://localhost:3000`, `http://127.0.0.1:3000` |
| API | `Seed:Enabled` | Optional development seed-data switch (currently off; clean DB by default) | `false` |

ASP.NET settings can be overridden with standard environment variables, for example `ConnectionStrings__Default="Data Source=C:\data\creativeboard.db"` and `Cors__AllowedOrigins__0=http://localhost:3000`.

## API reference

All JSON uses camelCase. Enums are strings. Validation failures use `application/problem+json` with an `errors` object keyed by field; unexpected failures return a generic ProblemDetails message and trace ID. OpenAPI includes endpoint responses at `/swagger`.

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/summary` | Persisted project, idea, and approved idea counts |
| GET | `/api/projects?search=&status=` | Newest-first project list; literal case-insensitive search and optional status |
| POST | `/api/projects` | Create project; returns `201` and `Location` |
| GET | `/api/projects/{id}` | Project and idea counts |
| PUT | `/api/projects/{id}` | Update editable project fields |
| DELETE | `/api/projects/{id}` | Delete project and cascade-delete ideas (`204`) |
| GET | `/api/projects/{projectId}/ideas?stage=` | List a project's ideas |
| POST | `/api/projects/{projectId}/ideas` | Create idea |
| PUT | `/api/projects/{projectId}/ideas/{ideaId}` | Update an idea |
| PATCH | `/api/projects/{projectId}/ideas/{ideaId}/stage` | Change stage, e.g. `{"stage":"Approved"}` |
| DELETE | `/api/projects/{projectId}/ideas/{ideaId}` | Delete idea (`204`) |

Example create request:

```json
{
  "name": "Spring campaign",
  "description": "A fresh visual direction",
  "coverImageUrl": "https://images.example.test/campaign.jpg",
  "status": "Planning",
  "dueDate": "2027-03-15"
}
```

## Tests and checks

```sh
cd api
dotnet test ../api.Tests/CreativeBoard.Api.Tests.csproj
dotnet build
```

```sh
cd web
npm test
npm run lint
npm run build
```

## Architecture and decisions

- `api/Models` contains EF entities; `api/Dtos` defines request and response boundaries so persistence entities are never serialized directly. Controllers own HTTP behavior; EF Core handles persistence and aggregate counts.
- SQLite is configured in `api/Data/AppDbContext.cs`. Project-to-idea cascade delete keeps the relationship consistent in one database operation.
- The frontend uses Next.js App Router, strict TypeScript, TanStack Query for cache/invalidation, and a small shared component set. Search keys are part of query identity and fetches receive AbortSignals, so stale results cannot replace newer results.
- Every mutation invalidates related project, idea, and summary queries. The browser does not persist application records.
- `SafeImage` uses a plain `<img>` because users may enter arbitrary remote image hosts; it validates the scheme and shows a placeholder on invalid URLs or load errors.
- Forms provide immediate validation, then map server ProblemDetails field errors to the matching control. Errors preserve form input.

## Troubleshooting

- **CORS error:** verify the API is running and `Cors:AllowedOrigins` includes the web origin exactly, including protocol and port.
- **Can't reach server:** start the API first and check `http://localhost:5000/health`. Verify `web/.env.local` has the API base URL.
- **Changed API URL:** restart `npm run dev`; `NEXT_PUBLIC_` values are read when Next starts.
- **Port in use:** close the process listening on 3000/5000 or update the launch profile and web configuration consistently.
- **SQLite file locked:** stop other API instances using the same database, then restart.
- **Images not loading:** remote hosts may deny hotlinking or the URL may be invalid; the placeholder is expected and does not affect the rest of the board.

## Known limitations and next improvements

- Image files are referenced by URL; there is no upload or thumbnail pipeline.
- Lists are currently unpaginated and there is no authentication or multi-user collaboration.
- Follow-up work could add Playwright end-to-end coverage, image upload, pagination, drag-and-drop ordering, and CI.


