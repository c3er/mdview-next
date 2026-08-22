# AGENTS.md

## Mission

This repository is the refactored successor to the legacy Markdown Viewer. It is not a greenfield app and not a blank-slate rewrite. The goal is feature parity with the older application while improving the architecture and testability.

The guiding principle is: keep the old app as the behavioral reference, but implement it in smaller, testable modules and more explicit boundaries.

The legacy behavioral oracle is expected at `../mdview`, relative to this repository. Verify that this path exists and is a Git repository at the beginning of every session in which legacy behavior may be relevant. If it is not available there, ask the user for the path to the legacy project before relying on it.

## Working style for this repo

- Prefer small, incremental steps over broad rewrite passes.
- Treat the legacy app as the behavioral oracle.
- Add or update tests for behavior before or alongside the change.
- Keep module boundaries explicit: main-process concerns stay in `app/lib/*Main.js`, renderer concerns stay in `*Renderer.js`.
- Avoid cross-cutting global state unless it is truly required.
- Do not “improve” a feature just because it looks cleaner; preserve existing behavior first.
- When the requirements or next steps are unclear, ask the user for clarification before making a consequential choice.
- When multiple approaches are plausible and none is clearly best according to the existing behavior, architecture, or history, ask the user to choose between them.

## AI operating rules

This project is meant to be maintained by agents that think in terms of deliberate improvement, not the cheapest possible patch.

The governing rule is:

- behavior comes first
- testability and clarity are the second-order goals
- refactoring is allowed when it reduces risk, improves ownership boundaries, or makes a bug fix trustworthy

Use this as the expected workflow:

1. Verify the behavior against the legacy app and the current tests.
2. Keep the change as small as possible while preserving the intended UX.
3. If a refactor is needed to make the fix safe, isolate it and keep it behavior-preserving.
4. Prefer explicit modules and contracts over hidden magic.
5. If a feature area is historically fragile (navigation, path handling, encoding, rendering, settings), give it extra review before broad simplification.

This repo should not be treated as a place where agents are rewarded for “just making it pass.” It is a long-lived replacement project, and deliberate refactoring is part of the job when it genuinely improves maintainability.

## Documentation maintenance

Documentation is part of the implementation and must always describe the current state. Keep `README.md`, `CONTRIBUTING.md`, everything under `doc/`, `AGENTS.md`, and any skills or other AI guidance up to date. Any code change that makes a documented statement inaccurate must update that documentation in the same change. AI guidance is especially important: do not leave obsolete instructions, architecture descriptions, workflows, or feature claims behind.

## Testing and validation

Agents should not assume that automated tests cover all meaningful behavior. This project includes user-facing behavior that often needs a quick manual smoke check, especially around:

- opening files and recent-file history
- relative links, images, and local media
- search, TOC, and navigation
- settings persistence and application startup theme
- reload behavior after file changes
- content blocking and external resource handling

The expected workflow is:

1. Run the smallest relevant automated test or suite first.
2. If the change affects user-visible behavior, propose a short manual validation plan with concrete steps.
3. When a manual check is needed, spell out the exact action sequence the human reviewer should perform.
4. Do not treat “tests passed” as proof that the UX is acceptable if the feature is visually or behaviorally manual in nature.

This is especially important for UI and rendering changes. The agent should explicitly state what to test, not silently assume that a green automated run is enough.

## Version control

This project uses Git. Use read-only Git operations freely whenever the current code, its motivation, or the history of a decision is unclear. In particular, use commands such as `git log`, `git show`, `git blame`, and diffs to understand behavior, ownership, and the reason for existing code.

Git write operations require explicit user approval before they are performed. This includes `git commit`, `git merge`, `git rebase`, and comparable history- or worktree-changing operations. Before asking for approval, explain what will be changed and why; include the exact proposed commit message when a commit is involved. After approval, use the agreed commit message verbatim. If the user proposes a commit-message change, verify the intended wording and resolve any discrepancy before writing it.

Commit messages must provide enough context, together with their diffs, to understand the motivation for the change. Use a concise header line, normally no longer than 52 characters, followed by a blank line and an explanation. Body lines should normally not exceed 72 characters. Unbreakable strings such as URLs are exceptions; put each such long string on its own line, not necessarily in its own paragraph. The header does not need a `feat:`, `fix:`, or similar prefix. The explanation should focus on the motivation and, where it is not obvious, the relevant technical or architectural background; it should not merely repeat the diff. Keep the message as short as is sensible: a small change may need only a short title, while a more involved change needs an informative explanation.

Never run `git push`. Tell the user to perform pushes themselves.

## What this repo is trying to replace

The legacy repo is still the source of truth for what users expect:

- opening Markdown files from the filesystem and via drag & drop
- rendering Markdown content with local relative links, images, audio, video
- reload on file change
- file history and open dialogs
- TOC, search, settings, theme selection
- document-specific and application-wide settings
- content blocking for remote resources
- compatibility with direct file path handling and OS behavior

This repo’s job is to deliver those behaviors with a cleaner architecture and more maintainable module boundaries.

## Architecture overview

### 1. Main process and startup

Keep the main process as lean as possible. Put necessary complexity into renderer modules when it belongs to document or UI behavior. The main process should generally do only what cannot or should not be done by a renderer: boot the application, manage browser windows, set up IPC, and synchronize state between windows when necessary.

- `app/main.js`: process bootstrap, CLI handling, app startup, IPC setup, logging, file-watcher wiring, menu initialization, and window management.
- `app/lib/cliMain.js`: command-line parsing and startup mode selection.
- `app/lib/windowManagementMain.js`: BrowserWindow creation, focus, closure, and menu updates.
- `app/lib/themeMain.js`: theme setup.
- `app/lib/menuMain.js`: menu structure and enable/disable behavior.
- `app/lib/logMain.js` and `app/lib/logShared.js`: logging setup and shared conventions.

The key design goal is: the main process owns application bootstrapping, browser-window lifecycle, IPC, and necessary cross-window coordination; the renderer process owns the DOM, document reads, and rendering of the current Markdown file. Do not move renderer-owned document work into the main process merely because the main process can access the filesystem.

This is an important boundary: file watchers run in the main process to detect changes, but the actual read and re-render of the changed document happens in the renderer that owns that window.

The file watcher is an intentional exception to the usual lean-main-process rule. Each browser window could poll for changes independently, but the main process polls once per second and notifies all affected renderer processes. This avoids duplicate polling work and is gentler on the operating system while keeping document reads and rendering in the owning renderer.

### 2. IPC boundary

Communication is intentionally explicit and typed by message names:

- `app/lib/ipcMessages.js`: central message registry.
- `app/lib/ipcMain.js`: main-process entry point.
- `app/lib/ipcMainIntern.js`: internal app messaging.
- `app/lib/ipcMainExtern.js`: external IPC / cross-process coordination.
- `app/lib/ipcRenderer.js`: renderer-side accessors.

When adding feature state, update the message contract before wiring logic. Do not scatter raw event strings across the codebase.

### 3. File watching and reload cycle

A document lives in a window, but the application also cares about changes on disk:

- `app/lib/fileWatcherMain.js`: polls watched file paths and notifies windows when a file changed.
- `app/lib/fileWatcherRenderer.js`: receives `filesChanged`, decides which update behavior to apply, and calls one or more of:
  - `settings.apply()`
  - `menu.update()`
  - `documentRendering.render()`

The `UpdateBehavior` pattern is important: a file change can trigger multiple behaviors for the same file in a structured, serializable way instead of ad hoc conditionals.

### 4. Rendering and document behavior

The renderer is responsible for turning Markdown into a DOM:

- `app/lib/documentRenderingRenderer.js`: main Markdown rendering pipeline, including:
  - markdown-it configuration
  - syntax highlighting for code blocks
  - Mermaid handling
  - relative path rewriting for local images and links
  - search highlighting / result jumping
  - local resource URL conversion relative to the current document

This module is the practical center of the app. If a feature touches Markdown parsing, relative links, rendering, or document-local assets, this is the first place to inspect.

### 5. Settings and persistence

Persistence is intentionally structured around a few JSON-backed data stores. The design is layered and supports both application-wide and document-specific state:

- `app/lib/storageConstants.js`: defines the storage filenames and names of logical data stores.
- `app/lib/storageRenderer.js`: high-level access to application settings, document settings, file history, and content-blocking state.
- `app/lib/settingsRenderer.js`: applies settings to the current UI/rendering state.

Important pattern:

- persisted settings live in explicit storage objects
- UI state is updated separately
- the renderer decides whether to refresh rendering or menu state after a settings change

### 6. Navigation, search, TOC, status

Additional document interaction modules:

- `app/lib/navigationRenderer.js`: link and internal navigation handling.
- `app/lib/searchRenderer.js`: search input and result highlighting.
- `app/lib/tocRenderer.js`: table of contents rendering and interactions.
- `app/lib/statusBarRenderer.js`: mouseover/link status text.

These modules should stay renderer-local. They are UI/document behavior, not underlying storage or OS features.

### 7. Content blocking and safety

- `app/lib/contentBlockingMain.js` / `contentBlockingRenderer.js`
- `app/lib/contentBlockingConstants.js`

The app is not a browser; it must block or allow external content deliberately. This boundary is important: behavior around remote content is separate from Markdown rendering itself.

## Implementation philosophy visible in the Git history

The repository history shows an intentional pattern:

- small refactors and simplifications
- removal of unnecessary indirection
- test additions before or alongside major changes
- predictable lifecycle cleanup
- improved path handling and settings correctness
- tighter, less magical behavior around rendering and persistence

Examples from recent history:

- “Add tests for storage module”
- “Add tests for the main part of the file watcher module”
- “Remove superfluous async/await indirections”
- “Simplify document file path handling in settings module”
- “Fix path assignment in document settings”
- “Improve error handling inside the renderer process”
- “Apply theme at opening a window”

This tells us the design direction clearly: the codebase is meant to be explicit, small, test-driven, and boring in the best sense. It should converge on stable behavior, not clever architecture.

## How to add features without drifting from the original app

Work in this order:

1. Confirm the legacy behavior in the old repo.
2. Find the corresponding module in this repo.
3. Add or update tests for the expected behavior.
4. Implement the smallest change in the correct layer.
5. Verify the feature with the narrowest relevant test or scenario.
6. Only then consider refactoring the shape of the code.

### Typical feature path

For a new or restored feature, the usual flow is:

- data or file-path definitions in storage constants
- settings or UI behavior in the appropriate `*Renderer.js` module
- cross-process notifications via `ipcMessages.js`
- main-process or window logic if OS-level integration is needed
- document rendering updates if it changes Markdown behavior
- tests covering the exact bug/feature

## Feature parity checklist

Use this checklist while restoring old behavior:

- file open / open dialog / drag & drop
- document reload on file change
- local resource resolution for images and links
- search and result navigation
- TOC and section navigation
- recent file history
- theme switching and application startup theme
- document settings and app settings
- content blocking policies
- menu state updates and per-window behavior
- robust path handling on macOS/Linux/Windows
- error reporting without crashing the application

## Avoid

- large “improvements” that change behavior without matching old behavior first
- hiding cross-process logic in renderer-only code
- global mutation of state without a clear owner
- broad refactors of the entire project when a single module is the real issue
- adding features that are not anchored in the legacy app’s expected UX

## Summary

The older repo is the feature reference. This repo is the structured, more maintainable reimplementation of that behavior. The safest path is to restore parity in small slices, keep the module boundaries visible, and favor tests and explicit IPC contracts over architectural drama.
