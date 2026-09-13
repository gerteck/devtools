<script lang="ts">
  import { router, TOOLS } from '../router.svelte';
  import type { Route } from '../types';
  import { Braces, GitCompare, Workflow, LayoutGrid, Network, Database } from '@lucide/svelte';

  let { currentRoute }: { currentRoute: Route } = $props();

  const navItems = [
    { route: '/' as Route, label: 'All Tools', icon: LayoutGrid, shortcut: '⌘0' },
    { route: '/json' as Route, label: 'JSON Formatter', icon: Braces, shortcut: '⌘1' },
    { route: '/diff' as Route, label: 'Diff Checker', icon: GitCompare, shortcut: '⌘2' },
    { route: '/mermaid' as Route, label: 'Mermaid Studio', icon: Workflow, shortcut: '⌘3' },
    { route: '/plantuml' as Route, label: 'PlantUML Studio', icon: Network, shortcut: '⌘4' },
    { route: '/sqlite' as Route, label: 'SQLite Viewer', icon: Database, shortcut: '⌘5' },
  ];
</script>

<aside class="hidden md:flex w-14 shrink-0 bg-surface border-r border-outline-variant flex-col items-center py-3 gap-2 z-20 select-none">
  {#each navItems as item}
    {@const isActive = currentRoute === item.route}
    <button
      onclick={() => router.navigate(item.route)}
      class="group relative w-10 h-10 rounded-lg flex items-center justify-center transition-all {isActive
        ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
      title="{item.label} ({item.shortcut})"
    >
      <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />

      <!-- Hover Tooltip -->
      <div class="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md flex items-center gap-2">
        <span>{item.label}</span>
        <span class="text-[10px] opacity-75 font-sans border border-current/20 px-1 py-0.2 rounded">
          {item.shortcut}
        </span>
      </div>
    </button>
  {/each}
</aside>
