# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sophosia is a desktop research paper/reference management app built with **Tauri + Vue 3 + Quasar + TypeScript**. It features PDF reading with annotations, markdown note-taking, Excalidraw canvas, citation management, and a plugin system.

## Commands

```bash
yarn                    # Install dependencies (use yarn, not npm)
yarn tauri dev          # Run dev server with Tauri
yarn tauri build        # Production build
yarn tauri build --debug # Debug build
yarn lint               # ESLint check
yarn format             # Prettier formatting
yarn test:unit          # Vitest in watch mode
yarn test:unit:ci       # Vitest single run
yarn test:component     # Cypress component tests (interactive)
yarn test:e2e           # Cypress E2E tests (interactive)
```

## Architecture

### Dual-layer structure
- **`src/backend/`** — TypeScript business logic (runs in Tauri webview, not a server)
- **`src/components/`** — Vue 3 components organized by feature
- **`src-tauri/`** — Rust backend for Tauri (window management, filesystem, SQLite plugin)

### Data flow pattern
Components → Pinia stores → `src/backend/` functions → File I/O (JSON/SQLite via Tauri APIs)

### Key stores (`src/stores/`)
- **projectStore** — Projects, notes, categories CRUD
- **layoutStore** — UI layout, tabs, window management
- **settingStore** — User preferences (theme, font, citation rules)
- **stateStore** — Orchestrates loading/saving all store state to disk

### Persistence model
- **JSON files** in user's storage folder = source of truth
- **SQLite** (via `tauri-plugin-sql`) = indexed copy for fast search
- **AppState** saved/loaded through `src/backend/appState/` using debounced writes

### Backend modules (`src/backend/`)
- `project/` — fileOps (filesystem) + sqliteOps (SQLite) + high-level API
- `database/` — models.ts (all TypeScript interfaces), jsondb, sqlite wrappers
- `meta/` — Citation metadata extraction, cite key generation
- `pdfannotation/` — PDF highlight/annotation logic
- `plugin/` — Plugin system (loads from GitHub releases)

### Routing
Hash-based routing via Quasar. Two routes: `/` (MainWindow with welcome) and `/layout` (LayoutContainer with page system). Deep links via `sophosia://` protocol.

### Plugin system
Community plugins loaded from `https://github.com/sophosia/sophosia-releases`. Plugins register buttons/views on components (Ribbon, LeftMenu, PDFMenu, PluginPage).

## Code Conventions

- Vue 3 Composition API with `<script setup lang="ts">`
- Quasar UI components (q-btn, q-dialog, q-list, etc.)
- Dialog controllers in `src/components/dialogs/dialogController.ts` (reactive composables)
- i18n with `vue-i18n` — translations in `src/i18n/` (en_US, fr_CA, zh_CN)
- ESLint: double quotes, relaxed TypeScript rules (allows `any`, non-null assertions)
- Prettier: 2-space indent, semicolons, double quotes

