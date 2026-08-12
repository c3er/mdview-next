# AGENTS.md

## Mission

This repository is the refactored successor to the legacy Markdown Viewer. It is not a greenfield app and not a blank-slate rewrite. The goal is feature parity with the older application while improving the architecture and testability.

The guiding principle is: keep the old app as the behavioral reference, but implement it in smaller, testable modules and more explicit boundaries.

## Working style for this repo

- Prefer small, incremental steps over broad rewrite passes.
- Treat the legacy app as the behavioral oracle.
- Add or update tests for behavior before or alongside the change.
- Keep module boundaries explicit: main-process concerns stay in `app/lib/*Main.js`, renderer concerns stay in `*Renderer.js`.
- Avoid cross-cutting global state unless it is truly required.
- Do not “improve” a feature just because it looks cleaner; preserve existing behavior first.

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

The main process owns OS-level concerns and lifecycle:

- `app/main.js`: process bootstrap, CLI handling, app startup, IPC setup, logging, file-watcher wiring, menu initialization, and window management.
- `app/lib/cliMain.js`: command-line parsing and startup mode selection.
- `app/lib/windowManagementMain.js`: BrowserWindow creation, focus, closure, and menu updates.
- `app/lib/themeMain.js`: theme setup.
- `app/lib/menuMain.js`: menu structure and enable/disable behavior.
- `app/lib/logMain.js` and `app/lib/logShared.js`: logging setup and shared conventions.

The key design goal is: the main process owns app lifecycle, browser windows, OS integration, and stateful coordination; the renderer process owns the DOM, document reads, and rendering of the current Markdown file.

This is an important boundary: file watchers run in the main process to detect changes, but the actual read and re-render of the changed document happens in the renderer that owns that window.

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
