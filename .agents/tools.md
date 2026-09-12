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

## 2. JSON Suite (`/#/json` & `/#/diff`)
- **File:** `src/tools/JsonSuite.svelte`
- **Tabs:**
  - `editor`: Monaco code editor with JSON language mode, line numbers, automatic layout.
  - `tree`: Visual collapsible tree view implemented via `src/components/JsonTreeView.svelte`.
  - `diff`: Side-by-side Monaco diff viewer via `src/actions/useMonacoDiffEditor.ts`.
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

## 3. Mermaid Studio (`/#/mermaid`)
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
