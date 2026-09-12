<script lang="ts">
  import { router } from '../router.svelte';
  import type { Route } from '../types';
  import { Moon, Sun, Terminal } from '@lucide/svelte';
  import pkg from '../../package.json';

  let {
    theme = 'dark',
    onToggleTheme,
    currentRoute = '/'
  }: {
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
    currentRoute: Route;
  } = $props();
</script>

<header class="sticky top-0 z-50 w-full bg-surface/85 backdrop-blur-md border-b border-outline-variant transition-colors duration-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
    <!-- Brand Logo & Badge -->
    <div class="flex items-center gap-3">
      <button
        onclick={() => router.navigate('/')}
        class="flex items-center gap-2.5 text-left group transition-opacity hover:opacity-80 cursor-pointer"
      >
        <div class="w-6 h-6 rounded bg-primary text-white flex items-center justify-center shadow-sm">
          <Terminal size={15} strokeWidth={2.5} />
        </div>
        <span class="font-semibold tracking-tight text-base text-on-surface">devtools</span>
      </button>

      <span class="text-outline-variant font-light">/</span>
      <span class="text-xs font-mono font-medium text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant">
        v{pkg.version}
      </span>
    </div>

    <!-- Right Controls: Theme Switcher -->
    <div class="flex items-center gap-3">
      <button
        onclick={onToggleTheme}
        aria-label="Toggle theme"
        class="p-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center cursor-pointer"
        title="Toggle Theme"
      >
        {#if theme === 'dark'}
          <Sun size={15} />
        {:else}
          <Moon size={15} />
        {/if}
      </button>
    </div>
  </div>
</header>
