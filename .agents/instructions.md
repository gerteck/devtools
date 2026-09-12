# Devtools Agent Instructions & Architectural Guide

This guide establishes the engineering standards, patterns, and conventions for developing utilities in the **devtools** codebase.

---

## 1. Core Principles

- **100% Client-Side Execution:** Never add server-side endpoints, remote proxies, or external API requirements for data processing. All computation (formatting, parsing, diffing, rendering) must happen in the user's browser.
- **Privacy First:** User payloads and drafts must remain local. No telemetry or tracking scripts without explicit consent.
- **Offline & Static Hosting:** Must compile down to static HTML, JS, CSS, and web workers deployable to GitHub Pages or static S3 buckets without URL rewrites.

---

## 2. Framework & Runes Rules (Svelte 5)

1. **Rune File Extensions:**
   - Runes (`$state`, `$derived`, `$effect`, `$props`) can **ONLY** be used in `.svelte` files and `.svelte.ts` (or `.svelte.js`) files.
   - **Never** use runes in `.ts` or `.js` files; the Svelte compiler will ignore them and throw a runtime `ReferenceError: $state is not defined`.
2. **Reactivity Patterns:**
   - Use `$state()` for reactive variables.
   - Use `$derived()` for computed state (never use `$effect` to synchronously mutate state that can be derived).
   - Use `$props()` to declare component inputs.
   - Components are dynamic by default in Svelte 5. Do not use `<svelte:component this={...} />`; directly use `<Component />`.
   - Do not use `<svelte:self />`; import the component directly (`import MyComponent from './MyComponent.svelte'`).

---

## 3. DOM & Imperative Library Integration (Svelte Actions)

Wrap all complex DOM libraries (Monaco, Mermaid, PanZoom, Canvas) into reusable Svelte Actions (`src/actions/`):
- Actions must return `{ update(newParams), destroy() }`.
- Always cleanly dispose listeners, observers (`ResizeObserver`), and instances in `destroy()`.
- Use `automaticLayout: true` and `ResizeObserver` on Monaco editor containers so resizing never causes visual clipping.

---

## 4. Routing & Deployment

- Use hash-based routing (`/#/json`, `/#/diff`, `/#/mermaid`).
- All tools must be registered in `src/router.svelte.ts` within the `TOOLS` array.
- Repository base path in `vite.config.ts`: `base: process.env.NODE_ENV === 'production' ? '/devtools/' : '/'` (configured for GitHub Pages subpath deployment).

---

## 5. Styling & Theme System

- **Dark Mode by Default:** `html.dark` class toggled on `document.documentElement`.
- Use the CSS variable palette in `src/app.css` (`--color-bg`, `--color-surface`, `--color-outline`, etc.) mapped through Tailwind classes.
- Editors and previews must dynamically match the active theme.
- Fonts: `Inter` for UI typography, `JetBrains Mono` for code, editors, badges, and status lines.

---

## 6. Verification Checklist

Before committing any change:
```bash
# 1. Strict TypeScript and Svelte 5 type checks
npm run check

# 2. Production build check
npm run build
```
Ensure 0 errors and 0 warnings.
