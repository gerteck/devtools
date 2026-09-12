# devtools

> A fast, modern, and lightweight client-side developer utility suite built with **Svelte 5**, **TypeScript**, **Tailwind CSS**, **Monaco Editor**, and **Mermaid.js**. Designed for 100% offline and static hosting on **GitHub Pages**.

---

## ✨ Features

- **⚡️ 100% Client-Side Execution:** Zero backend requirement. All formatting, diffing, rendering, and parsing runs locally in your browser.
- **🎨 Dark & Light Mode:** High-contrast dark mode enabled by default with seamless instant toggle.
- **💾 Automatic Persistence:** Drafts and editor configurations are preserved in `localStorage`.
- **⌨️ Keyboard Shortcuts:** Fast switching via `⌘1` (JSON), `⌘2` (Diff), `⌘3` (Mermaid), `⌘0` (Home), and `/` (search filter).
- **🚀 Hash-Based Routing:** Hash routing (`/#/json`, `/#/diff`, `/#/mermaid`) ensures zero 404 errors on direct reloads on static hosts like GitHub Pages.

---

## 🛠️ Included Utilities

### 1. JSON Formatter & Suite (`/#/json`)
- **Monaco Code Editor:** Syntax highlighting, line numbers, and inline diagnostic markers.
- **Formatting Options:** 2-space and 4-space indentation or compact minification.
- **Interactive Tree Viewer:** Expandable and collapsible hierarchical node tree with type badges and quick copy.
- **Diff Checker:** Side-by-side Monaco diff viewer comparing original vs modified JSON.
- **Real-Time Validation:** Error status bar with line and column pointers on invalid JSON.

### 2. Mermaid Studio (`/#/mermaid`)
- **Live Diagram Preview:** Client-side rendering powered by `mermaid.js`.
- **Interactive Viewport:** Smooth drag-to-pan, wheel zoom, zoom in/out, reset, and fit-to-screen.
- **Preset Library:** Instant templates for Flowcharts, Sequence Diagrams, Cloud/Architecture, and Entity Relationship Diagrams (ERD).
- **Export Capabilities:** One-click download as vector **SVG** or 2x high-resolution **PNG**.
- **Live Syntax Linting:** Non-blocking error banner highlighting syntax issues.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v20/v24)
- npm 9+

### Development
```bash
# Clone the repository
git clone https://github.com/your-username/devtools.git
cd devtools

# Install dependencies
npm install

# Start development server
npm run dev
```

### Type Checking & Build
```bash
# Type check Svelte 5 and TypeScript
npm run check

# Create production build for GitHub Pages
npm run build

# Preview production build locally
npm run preview
```

---

## 🚢 Deployment to GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

1. Push your repository to GitHub.
2. In your GitHub repository settings, navigate to **Settings** > **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. The workflow will automatically build and deploy the app on every push to the `main` branch.

---

## 📄 License

MIT License. Free and open source.
