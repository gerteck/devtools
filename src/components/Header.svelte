<script lang="ts">
  import { router } from '../router.svelte';
  import type { Route, ColorScheme, ThemeMode } from '../types';
  import {
    Moon,
    Sun,
    Terminal,
    Palette,
    Menu,
    X,
    LayoutGrid,
    Braces,
    GitCompare,
    Workflow,
    Network,
    Database,
  } from '@lucide/svelte';
  import pkg from '../../package.json';

  let {
    scheme = 'default',
    theme = 'dark',
    onSelectScheme,
    onToggleTheme,
    currentRoute = '/',
  }: {
    scheme: ColorScheme;
    theme: ThemeMode;
    onSelectScheme: (s: ColorScheme) => void;
    onToggleTheme: () => void;
    currentRoute?: Route;
  } = $props();

  let mobileMenuOpen = $state(false);

  const schemes: { id: ColorScheme; label: string; short: string }[] = [
    { id: 'default', label: 'Zinc (Default)', short: 'Zinc' },
    { id: 'gruvbox', label: 'Gruvbox', short: 'Gruvbox' },
    { id: 'catppuccin', label: 'Catppuccin', short: 'Catppuccin' },
    { id: 'nord', label: 'Nord', short: 'Nord' },
  ];

  const navItems = [
    { route: '/' as Route, label: 'All Tools', icon: LayoutGrid },
    { route: '/json' as Route, label: 'JSON Formatter', icon: Braces },
    { route: '/diff' as Route, label: 'Diff Checker', icon: GitCompare },
    { route: '/mermaid' as Route, label: 'Mermaid Studio', icon: Workflow },
    { route: '/plantuml' as Route, label: 'PlantUML Studio', icon: Network },
    { route: '/sqlite' as Route, label: 'SQLite Viewer', icon: Database },
  ];
</script>

<header class="sticky top-0 z-50 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant transition-colors duration-200">
  <div class="w-full px-3 sm:px-6 h-14 flex items-center justify-between">
    <!-- Left: Brand Logo & Mobile Menu Toggle -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Mobile Hamburger Button -->
      <button
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        class="md:hidden p-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        aria-label="Toggle mobile menu"
        title="Tools menu"
      >
        {#if mobileMenuOpen}
          <X size={17} />
        {:else}
          <Menu size={17} />
        {/if}
      </button>

      <button
        onclick={() => {
          router.navigate('/');
          mobileMenuOpen = false;
        }}
        class="flex items-center gap-2 text-left group transition-opacity hover:opacity-80 cursor-pointer"
      >
        <div class="w-6 h-6 rounded bg-primary text-white flex items-center justify-center shadow-sm">
          <Terminal size={14} strokeWidth={2.5} />
        </div>
        <span class="font-semibold tracking-tight text-sm sm:text-base text-on-surface">devtools</span>
      </button>

      <span class="text-outline-variant font-light hidden sm:inline">/</span>
      <span class="text-[11px] sm:text-xs font-mono font-medium text-on-surface-variant px-1.5 sm:px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant hidden sm:inline-block">
        v{pkg.version}
      </span>
    </div>

    <!-- Right Controls: Scheme Selector & Mode Switcher -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Color Scheme Selector -->
      <div class="flex items-center gap-1 bg-surface-container border border-outline-variant rounded-lg px-2 py-1">
        <Palette size={13} class="text-on-surface-variant shrink-0" />
        <select
          value={scheme}
          onchange={(e) => onSelectScheme((e.target as HTMLSelectElement).value as ColorScheme)}
          class="bg-transparent text-[11px] sm:text-xs font-mono text-on-surface border-none focus:outline-none focus:ring-0 p-0 pr-2 sm:pr-4 max-w-[85px] sm:max-w-none cursor-pointer"
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

  <!-- Mobile Drawer Menu -->
  {#if mobileMenuOpen}
    <div class="md:hidden border-t border-outline-variant bg-surface/95 backdrop-blur-md px-3 py-2 space-y-1 shadow-xl">
      {#each navItems as item}
        {@const isActive = currentRoute === item.route}
        <button
          onclick={() => {
            router.navigate(item.route);
            mobileMenuOpen = false;
          }}
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-colors text-left cursor-pointer {isActive
            ? 'bg-primary-container text-on-primary-container font-semibold'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
        >
          <item.icon size={16} class={isActive ? 'text-primary' : 'text-on-surface-variant'} />
          <span class="flex-1">{item.label}</span>
          {#if isActive}
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-primary text-white font-sans">Active</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</header>
