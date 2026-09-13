/**
 * Centralized dynamic loaders and prefetching for heavy devtools modules.
 * This guarantees that Monaco, Mermaid, SQLite WASM, and diagram parsers
 * are strictly code-split and only loaded on demand.
 */

export const TOOL_LOADERS = {
  '/json': () => import('../tools/JsonSuite.svelte'),
  '/diff': () => import('../tools/DiffChecker.svelte'),
  '/mermaid': () => import('../tools/MermaidStudio.svelte'),
  '/plantuml': () => import('../tools/PlantUMLStudio.svelte'),
  '/sqlite': () => import('../tools/SqliteViewer.svelte'),
};

const prefetched = new Set<string>();

/**
 * Prefetches the code-split bundle for a tool in the background
 * (e.g. on mouse hover over navigation buttons or tool cards).
 */
export function prefetchTool(route: string) {
  if (prefetched.has(route)) return;
  const loader = TOOL_LOADERS[route as keyof typeof TOOL_LOADERS];
  if (loader) {
    prefetched.add(route);
    loader().catch(() => {
      prefetched.delete(route);
    });
  }
}
