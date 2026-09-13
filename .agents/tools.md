# Devtools Utility Suite Specifications

Overview of implemented developer utilities, their route contracts, and component hierarchy.

---

## 1. Home Dashboard (`/` or `/#/`)
- **File:** `src/tools/Home.svelte`
- **Features:**
  - Hero with quick search filter input.
  - Shortcut `/` focuses the search input.
  - Interactive tool cards with tags, descriptions, version badges, and `⌘1`, `⌘2`, `⌘3` shortcuts.
  - Clean minimalist layout matching developer aesthetic.

---

## 2. JSON Formatter & Tree (`/#/json`)
- **File:** `src/tools/JsonSuite.svelte`
- **Tabs:**
  - `editor`: Monaco code editor with JSON language mode, line numbers, automatic layout.
  - `tree`: Visual collapsible tree view implemented via `src/components/JsonTreeView.svelte`.
- **Actions:**
  - Indent toggle (2 spaces vs 4 spaces).
  - Minify JSON.
  - Clipboard copy with checkmark animation.
  - Load sample data.
  - Clear editor.
- **Diagnostics:**
  - Bottom status bar shows byte size and line count for valid JSON.
  - Real-time syntax error banner with line and column indicators for invalid JSON.

---

## 3. Diff Checker (`/#/diff`)
- **File:** `src/tools/DiffChecker.svelte`
- **Editor:**
  - Monaco Diff Editor via `src/actions/useMonacoDiffEditor.ts`.
  - **Both sides fully editable** (`originalEditable: true`).
  - Layout toggle: Side-by-side Split View vs Unified Inline View.
  - Language selector (JSON, Plain Text, TypeScript, JavaScript, HTML, CSS, YAML, Markdown, XML).
- **Actions:**
  - Swap sides (Original <-> Modified).
  - Copy Left / Copy Right.
  - Load Sample comparison.
  - Clear both panes.

---

## 4. Mermaid Studio (`/#/mermaid`)
- **File:** `src/tools/MermaidStudio.svelte`
- **Editor:**
  - Left split pane with Monaco editor.
  - Custom Monaco Monarch tokenizer registered for Mermaid DSL (`src/utils/monaco.ts`).
  - Presets: Flowchart, Sequence Diagram, Architecture/Cloud Diagram, Entity Relationship Diagram (ERD).
- **Preview & Viewport:**
  - Live SVG preview rendered asynchronously via `src/actions/useMermaidRender.ts`.
  - Pan and Zoom viewport action `src/actions/usePanZoom.ts`:
    - Drag to pan.
    - Mouse wheel zooms towards cursor position.
    - Toolbar buttons: Zoom In, Zoom Out, Fit to Screen, Reset.
- **Exporting:**
  - One-click vector **SVG** download via XML serialization.
  - One-click 2x high-resolution **PNG** rasterization via HTML5 Canvas.
- **Error Handling:**
  - Non-blocking syntax error warning banner displaying the parser message without breaking the UI.
