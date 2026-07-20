# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Command Runner is a cross-platform desktop app for executing shell commands through a UI. Stack: React + TypeScript frontend wrapped in Electron, backed by an ASP.NET Core (.NET 10) API that does the actual process execution. The Electron app bundles and launches the API automatically; in development they're run as two separate processes.

## Code Style

Don't add comments unless the WHY is genuinely non-obvious (a hidden constraint, a workaround for a specific bug, something that would surprise a reader). Well-named identifiers should speak for themselves — don't add comments that restate what the code already says.

## Common Commands

### Backend (.NET, from repo root)
```bash
dotnet restore
dotnet build --configuration Release --no-restore
dotnet test --configuration Release --no-build --verbosity normal   # all unit tests (NUnit)
dotnet test --filter "FullyQualifiedName~CommandExecutionServiceTests"  # single test class
cd src/CommandRunner.Api && dotnet run    # API only, listens on http://localhost:5081
```
Test project is `test/CommandRunner.UnitTests` (NUnit). It references `CommandRunner.Business` only — tests exercise services directly (e.g. `CommandExecutionService`, `CommandValidationService`), not HTTP endpoints.

### Frontend (from `src/CommandRunner.ReactWebsite/`)
```bash
npm install
npm run dev            # Vite dev server only (localhost:5173)
npm run electron-dev   # Vite + Electron together, with hot reload (requires API running separately)
npm run build           # tsc + vite build
npm run lint            # eslint, max-warnings 0
```

### Full app in development
Preferred: VS Code compound launch config **"Command Runner (Electron + API)"** (`.vscode/launch.json`), which starts the API then Electron. Equivalent manually: run `dotnet run` in `src/CommandRunner.Api` in one terminal, `npm run electron-dev` in `src/CommandRunner.ReactWebsite` in another. The frontend expects the API at `http://localhost:5081` (`VITE_API_BASE_URL` env var overrides this).

### Production builds (Electron, from `src/CommandRunner.ReactWebsite/`)
```bash
npm run build-electron-linux   # also self-contained-publishes the API into dist-electron/api
npm run build-electron-win
npm run build-electron-mac
```
These first build the React app and a self-contained publish of `CommandRunner.Api` (via `publish-api*` scripts) into `dist-electron/api`, then run `electron-builder`. The packaged app starts this bundled API itself — see `electron/main.cjs`.

CI (`.github/workflows/build-and-test.yml` → `reusable-build-and-unit-test.yml`) runs on Ubuntu/Windows/macOS: npm build of the React app, `dotnet build` + `dotnet test` for the whole solution, plus a shell-compatibility smoke check (bash/PowerShell/cmd) reflecting that command execution must work correctly across those three shells.

## Architecture

### Layered .NET solution (`src/`)
```
CommandRunner.Data          # Models (Command, Profile, FavoriteDirectory) + JSON-file repositories
CommandRunner.Business      # Services: validation, execution, iteration, security
CommandRunner.Api           # ASP.NET Core controllers + DTOs, thin mapping layer over Business/Data
CommandRunner.Console       # Separate console entry point
```
Dependency direction is strictly Data → Business → Api. Controllers talk to `IProfileRepository`/`IFavoriteDirectoryRepository` (Data) and the Business services directly — there is no separate service layer inside the API project. DTOs (`Api/DTOs`) are hand-mapped to/from `Data.Models` types in each controller (see `ProfilesController.MapToDto`/`MapFromDto`); there is no AutoMapper.

**Persistence**: `BaseJsonRepository<T>` (`CommandRunner.Data/Repositories`) is a generic in-memory-cache-over-JSON-file store — no database. Data lives in the OS app-data folder (`%APPDATA%/CommandRunner`, `~/.config/CommandRunner`, `~/Library/Application Support/CommandRunner`), one JSON file per entity type (e.g. `profiles.json`). Repository instances are registered `Scoped` in DI but the underlying cache is per-file, reloaded when the file's mtime changes.

**Command execution** (`CommandExecutionService`): wraps `System.Diagnostics.Process`. Two execution modes — buffered (`ExecuteCommandAsync`) and streaming (`ExecuteCommandWithStreamingAsync`, used for SSE endpoints). When `Command.Shell` is set, the executable+arguments are wrapped and re-quoted for that shell (cmd/powershell/bash) rather than run directly — Windows and Unix take different quoting paths in `CreateProcess`. Every execution is preceded by a call into `ICommandValidationService`.

**Validation vs. security are separate services**: `CommandValidationService` checks structural correctness (name/executable present, working directory exists and is writable, executable resolvable via PATH, env var name/value sanity). `SecurityService` is a distinct concern — blocked-command list, dangerous-character/path-traversal checks, and a confirmation-required check (`RequiresConfirmationAsync`) that controllers must honor via `request.UserConfirmed` before executing. Do not merge these two — they're intentionally separate layers with different responsibilities.

**Iteration** (`IterationService`): recursively walks a directory tree (depth-limited, include/exclude glob-ish patterns) and re-runs a command once per matching subdirectory, reusing `ICommandExecutionService` per target. Supports skip-on-error vs. stop-on-first-failure semantics and parallelism limits.

**Streaming endpoints**: `CommandsController` has `execute`/`execute-iterative` (buffered JSON response) and `execute-stream`/`execute-iterative-stream` (Server-Sent Events) variants of the same operations. SSE handlers manually write `event:`/`data:` frames and flush after each line — when touching these, keep both the buffered and streaming versions in sync since they duplicate the command/DTO-building logic.

### Frontend (`src/CommandRunner.ReactWebsite/`)
- Single global state via React Context + `useReducer` in `src/contexts/AppContext.tsx` — no Redux/Zustand. Reducer actions that mutate profiles/directories optimistically update local state *and* fire the corresponding API call inline inside the reducer (not in a separate effect/thunk), rolling back or alerting on failure. Follow this same pattern (optimistic update + fire-and-forget API call inside the action) when adding new state mutations here rather than introducing a different data-fetching approach.
- `src/services/api/` is a thin axios wrapper (`client.ts`) plus per-resource modules (`profiles.ts`, `directories.ts`, `commands.ts`) — this is the only place HTTP calls should be made from.
- Electron main process lives in `electron/main.cjs` (the `.ts`/other `.js` files under `electron/` are not the active entry point — check `package.json`'s `"main"` field before editing). It is responsible for locating and spawning the bundled API executable in packaged builds.
- MUI (`@mui/material`) is the component library; `@dnd-kit/*` provides drag-and-drop reordering for profiles/commands in the settings dialog.

### Example profiles
`examples/profiles/*.json` are sample importable profile files (dotnet-local-dev, javascript-tooling, windows-maintenance), matching the `ProfileDto`/`CommandDto` shape used by `POST /api/profiles/import`. Useful as reference when changing the profile/command schema — keep them valid against whatever shape you change.
