# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Command Runner is a cross-platform desktop app for executing shell commands through a UI, backed by an ASP.NET Core (.NET 10) API that does the actual process execution. The frontend/packaging track is **Vue + Photino** (`CommandRunner.Website.VueJs` + `CommandRunner.Desktop`) — a single process hosts both the API and the built Vue static files on one dynamically-assigned port (nothing to guess or collide with). See the Architecture section below for details.

## Code Style

Don't add comments unless the WHY is genuinely non-obvious (a hidden constraint, a workaround for a specific bug, something that would surprise a reader). Well-named identifiers should speak for themselves — don't add comments that restate what the code already says.

## Common Commands

### Backend (.NET, from repo root)
```bash
dotnet restore
dotnet build --configuration Release --no-restore
dotnet test --configuration Release --no-build --verbosity normal   # all unit tests (NUnit)
dotnet test --filter "FullyQualifiedName~CommandExecutionServiceTests"  # single test class
cd src/CommandRunner.Api && dotnet run    # API only, listens on http://localhost:5085 (see launchSettings.json)
```
Test project is `test/CommandRunner.UnitTests` (NUnit). It references `CommandRunner.Api` — tests exercise services directly (e.g. `CommandExecutionService`, `CommandValidationService` from `CommandRunner.Api.Features.Commands`), not HTTP endpoints.

### Full app in development
Preferred: VS Code launch config **"Command Runner Desktop (Photino)"** (`.vscode/launch.json`), which runs the `command-runner:vue-dev` task (Vite dev server) then launches `CommandRunner.Desktop`, which loads that dev server in `DEBUG` builds — see the Photino desktop host section below. Equivalent manually: `npm run dev` in `src/CommandRunner.Website.VueJs` in one terminal, `dotnet run --project src/CommandRunner.Desktop` in another.

CI (`.github/workflows/build-and-test.yml` → `reusable-build-and-unit-test.yml`) runs on Ubuntu/Windows/macOS: `dotnet build` + `dotnet test` for the whole solution, plus a shell-compatibility smoke check (bash/PowerShell/cmd) reflecting that command execution must work correctly across those three shells.

### Vue frontend (from `src/CommandRunner.Website.VueJs/`)
```bash
npm install
npm run dev     # Vite dev server (localhost:5174), talks to a separately-run CommandRunner.Api
npm run build   # vue-tsc + vite build -> dist/
npm run lint    # eslint, max-warnings 0
```
No `VITE_API_BASE_URL` needed when served by `CommandRunner.Desktop` (same-origin, see below) — only set it when running the Vite dev server against a separately-running API.

### Photino desktop host (from repo root)
```bash
cd src/CommandRunner.Website.VueJs && npm run build   # must run first -- populates CommandRunner.Desktop's wwwroot
dotnet run --project src/CommandRunner.Desktop
```
`CommandRunner.Desktop` is a thin `Microsoft.NET.Sdk.Web` project that hosts the real `CommandRunner.Api` controllers (via a `ProjectReference` + `AddApplicationPart`, not duplicated code) and serves the Vue build's static files from the same Kestrel instance, then opens a native OS webview window (via Photino.NET) pointed at it. In `DEBUG` builds it loads `http://localhost:5174` (the Vite dev server) instead, for hot reload. CI: `.github/workflows/photino-build.yml`, self-contained `dotnet publish` per OS (`win-x64`/`linux-x64`/`osx-x64`), zipped rather than built into a full installer (no WiX/NSIS/`.app` bundling yet). Linux/macOS targets need `libwebkit2gtk` installed (system dependency, not bundled); Windows needs the WebView2 Runtime (preinstalled on Windows 11 / delivered via Windows Update on Windows 10 — deliberately not bundling a Fixed-Version runtime).

**Kestrel binds to a fixed port (`http://127.0.0.1:5081`) in `DEBUG`, an OS-assigned one (`http://127.0.0.1:0`) in `Release`** — this asymmetry is deliberate, not an oversight. In `DEBUG` the webview loads the Vite dev server, not this Kestrel instance, so the Vue app's `window.location.origin` is `localhost:5174` — API calls need somewhere fixed to be proxied to, which is what `vite.config.ts`'s `server.proxy['/api'] → http://127.0.0.1:5081` targets. An OS-assigned port here would be unreachable from the dev server (nothing to point the proxy at). In `Release`, Desktop serves the built Vue bundle itself, so it's same-origin and the OS-assigned port works fine (nothing to guess or collide with in packaged builds). If you ever see profiles fail to load / the app stuck on "Running..." when running the Photino dev flow, check this port pairing first — it's exactly what breaks if either side drifts from the other.

**Linux: blank white window under virtualized/software-rendered GPUs (e.g. VirtualBox VMs).** WebKitGTK's DMA-BUF renderer silently fails to composite anything in that environment — no error, just a permanently white webview, even though Kestrel is serving everything correctly (confirm with `curl` against the printed `Command Runner API listening on ...` URL if this comes up again). The fix is `WEBKIT_DISABLE_DMABUF_RENDERER=1`, but WebKitGTK reads it from the process's environment at exec() time — setting it in-process via `Environment.SetEnvironmentVariable()` inside `Main()` is provably too late (confirmed empirically: the window stays blank). `Program.cs` instead re-execs itself as a child process with the variable set from the outset (`OperatingSystem.IsLinux()` guard, skipped if already set, handles both the self-contained apphost and `dotnet run`/framework-dependent launch). If this class of bug resurfaces, `xwd`/`_NET_WM_PID` (or any X11 screenshot tool) plus reading `/proc/<pid>/environ` — noting the latter only reflects the environment at the process's *original* exec(), not later in-process `setenv()` calls — is how it was diagnosed; don't trust an in-process env var fix without actually screenshotting the rendered window.

## Architecture

### .NET solution (`src/`)
```
CommandRunner.Api           # ASP.NET Core, organized as vertical feature slices — owns models, repositories, services, controllers, and DTOs
CommandRunner.Desktop       # Photino host: hosts Api's controllers + Vue's static build in one process
CommandRunner.Console       # Separate console entry point
```
There is no separate Data or Business project — that layered split was replaced with a single `CommandRunner.Api` project organized as vertical feature slices, so a feature's persistence model, repository, business services, controller, and DTOs all live together instead of being spread across technical-layer projects.

**`CommandRunner.Api` has no top-level `Models`/`Repositories`/`Services`/`Controllers`/`DTOs` folders.** Each feature is a `Features/<FeatureName>/` folder, namespaced `CommandRunner.Api.Features.<FeatureName>`, holding everything that feature needs end to end:
```
Features/Profiles/     # Profile, Command (the entity nested inside a profile), IProfileRepository, ProfileRepository,
                        # ProfileDto, CommandDto, ProfilesController
Features/Commands/      # ICommandExecutionService/CommandExecutionService, ICommandValidationService/CommandValidationService,
                        # IIterationService/IterationService (+ IterationOptions), ISecurityService/SecurityService (+ SecuritySettings),
                        # CommandExecutionResult, IterationProgress (+ IterationItemResult), ValidationResult,
                        # CommandExecutionRequest, CommandExecutionResponse, IterationExecutionResponse, IterationItemResultDto,
                        # CommandsController (execute/execute-stream/execute-iterative/execute-iterative-stream/validate)
Features/Directories/   # FavoriteDirectory, IFavoriteDirectoryRepository, FavoriteDirectoryRepository,
                        # FavoriteDirectoryDto, DirectoriesController
Shared/                 # BaseJsonRepository<T> — genuinely cross-feature (both ProfileRepository and FavoriteDirectoryRepository derive from it)
ServiceCollectionExtensions.cs  # stays at the project root — a composition root that touches every feature, not itself a feature
```
Profiles and Directories are pure data-plus-DTO features with no business-service layer at all — `ProfilesController`/`DirectoriesController` only depend on their own feature's repository. `CommandsController` is the one controller with real business logic, and it also depends on `CommandRunner.Api.Features.Profiles` (for `IProfileRepository` and the nested `Command` type it looks up and executes) — a feature slice reaching into another feature slice is normal here; it's the same dependency a profile's commands always had, just expressed as a same-project cross-namespace reference instead of a cross-project one.

DTOs are hand-mapped to/from each feature's own model types inside its controller (see `ProfilesController.MapToDto`/`MapFromDto`); there is no AutoMapper. When adding a new feature, create a `Features/<Name>/` folder with everything it needs (skip the services entirely if it has no business logic, the way Profiles/Directories do) rather than reintroducing shared `Models`/`Repositories`/`Services`/`Controllers`/`DTOs` folders. Only add to `Shared/` when something is genuinely used by more than one feature — don't default new code there. `[Route("api/[controller]")]` derives the route from the controller class name regardless of namespace/folder, so routes are unaffected by this structure.

`AddCommandRunnerServices()` (`CommandRunner.Api/ServiceCollectionExtensions.cs`) is the single place that registers the repositories/services into DI. Both `CommandRunner.Api/Program.cs` and `CommandRunner.Desktop/Program.cs` call it — add new services there, not inline in either `Program.cs`, so the two hosts can't drift out of sync. `CommandRunner.Desktop` references `CommandRunner.Api.csproj` only (for its controllers, static-file hosting, and `AddCommandRunnerServices()`) — there's nothing else left to reference now that Data/Business are gone. `test/CommandRunner.UnitTests` references `CommandRunner.Api.csproj` directly and tests feature services in isolation (constructing `CommandExecutionService`, `CommandValidationService`, etc. and calling them directly) rather than through HTTP.

**Persistence**: `BaseJsonRepository<T>` (`CommandRunner.Api/Shared/BaseJsonRepository.cs`) is a generic in-memory-cache-over-JSON-file store — no database. Data lives in the OS app-data folder (`%APPDATA%/CommandRunner`, `~/.config/CommandRunner`, `~/Library/Application Support/CommandRunner`), one JSON file per entity type (e.g. `profiles.json`). Repository instances are registered `Scoped` in DI but the underlying cache is per-file, reloaded when the file's mtime changes.

**Command execution** (`CommandExecutionService`, in `Features/Commands/`): wraps `System.Diagnostics.Process`. Two execution modes — buffered (`ExecuteCommandAsync`) and streaming (`ExecuteCommandWithStreamingAsync`, used for SSE endpoints). When `Command.Shell` is set, the executable+arguments are wrapped and re-quoted for that shell (cmd/powershell/bash) rather than run directly — Windows and Unix take different quoting paths in `CreateProcess`. Every execution is preceded by a call into `ICommandValidationService`.

**Validation vs. security are separate services**, both in `Features/Commands/`: `CommandValidationService` checks structural correctness (name/executable present, working directory exists and is writable, executable resolvable via PATH, env var name/value sanity). `SecurityService` is a distinct concern — blocked-command list, dangerous-character/path-traversal checks, and a confirmation-required check (`RequiresConfirmationAsync`) that `CommandsController` must honor via `request.UserConfirmed` before executing. Do not merge these two — they're intentionally separate services with different responsibilities, even though they now sit in the same feature folder.

**Iteration** (`IterationService`, in `Features/Commands/`): recursively walks a directory tree (depth-limited, include/exclude glob-ish patterns) and re-runs a command once per matching subdirectory, reusing `ICommandExecutionService` per target. Supports skip-on-error vs. stop-on-first-failure semantics and parallelism limits.

**Streaming endpoints**: `CommandsController` has `execute`/`execute-iterative` (buffered JSON response) and `execute-stream`/`execute-iterative-stream` (Server-Sent Events) variants of the same operations. SSE handlers manually write `event:`/`data:` frames and flush after each line — when touching these, keep both the buffered and streaming versions in sync since they duplicate the command/DTO-building logic.

### Vue frontend (`src/CommandRunner.Website.VueJs/`)
- Pinia store (`src/stores/app.ts`) is the single global state store. Actions that mutate profiles/directories optimistically update local state *and* fire the corresponding API call inline inside the action (not in a separate effect/thunk), rolling back or alerting on failure. Follow this same pattern when adding new state mutations here rather than introducing a different data-fetching approach.
- `src/services/api/client.ts`'s `API_BASE_URL` defaults to `window.location.origin`, **not** a hardcoded port. This matters: `CommandRunner.Desktop` serves the API and this frontend from the same origin on an OS-assigned dynamic port, so a hardcoded fallback (e.g. `http://localhost:5081`) silently breaks the desktop app once built — it did during development of this feature. Only set `VITE_API_BASE_URL` when running the Vite dev server against a separately-hosted API.
- No component library — hand-rolled components with BEM class names, native `<select>`/`<dialog>` elements, and CSS custom properties (`src/styles/tokens.css`) driving light/dark theming. Profile/command reordering uses accessible move-up/move-down buttons rather than a drag-and-drop library.

### Example profiles
`examples/profiles/*.json` are sample importable profile files (dotnet-local-dev, javascript-tooling, windows-maintenance), matching the `ProfileDto`/`CommandDto` shape used by `POST /api/profiles/import`. Useful as reference when changing the profile/command schema — keep them valid against whatever shape you change.
