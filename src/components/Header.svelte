<script lang="ts">
  import { router } from '../router.svelte';
  import type { Route, ColorScheme, ThemeMode } from '../types';
  import { Moon, Sun, Terminal, Palette } from '@lucide/svelte';
  import pkg from '../../package.json';

  let {
    scheme = 'default',
    theme = 'dark',
    onSelectScheme,
    onToggleTheme,
  }: {
    scheme: ColorScheme;
    theme: ThemeMode;
    onSelectScheme: (s: ColorScheme) => void;
    onToggleTheme: () => void;
    currentRoute?: Route;
  } = $props();

  const schemes: { id: ColorScheme; label: string }[] = [
    { id: 'default', label: 'Zinc (Default)' },
    { id: 'gruvbox', label: 'Gruvbox' },
    { id: 'catppuccin', label: 'Catppuccin' },
    { id: 'nord', label: 'Nord' },
  ];
</script>

<header class="sticky top-0 z-50 w-full bg-surface/85 backdrop-blur-md border-b border-outline-variant transition-colors duration-200">
  <div class="w-full px-4 sm:px-6 h-14 flex items-center justify-between">
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

    <!-- Right Controls: Scheme Selector & Mode Switcher -->
    <div class="flex items-center gap-2.5 sm:gap-3">
      <!-- Color Scheme Selector -->
      <div class="flex items-center gap-1.5 bg-surface-container border border-outline-variant rounded-lg px-2 py-1">
        <Palette size={13} class="text-on-surface-variant shrink-0" />
        <select
          value={scheme}
          onchange={(e) => onSelectScheme((e.target as HTMLSelectElement).value as ColorScheme)}
          class="bg-transparent text-xs font-mono text-on-surface border-none focus:outline-none focus:ring-0 p-0 pr-4 cursor-pointer"
          title="Choose Color Scheme"
        >
          {#each schemes as s}
            <option value={s.id} class="bg-surface text-on-surface">{s.label}</option>
          {/each}
        </select>
      </div>

      <!-- Theme Mode Switcher -->
      <button
        onclick={onToggleTheme}
        aria-label="Toggle theme mode"
        class="p-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center cursor-pointer"
        title="Toggle Light/Dark Mode"
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
