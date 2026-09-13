<script lang="ts">
  import { router } from './router.svelte';
  import Header from './components/Header.svelte';
  import SidebarRail from './components/SidebarRail.svelte';
  import Footer from './components/Footer.svelte';
  import Home from './tools/Home.svelte';
  import LazyTool from './components/LazyTool.svelte';
  import { TOOL_LOADERS } from './utils/toolLoader';
  import { type ColorScheme, type ThemeMode, getMonacoThemeName } from './types';

  // Initialize theme mode and color scheme from localStorage
  let mode = $state<ThemeMode>(
    (typeof localStorage !== 'undefined' && (localStorage.getItem('devtools_theme') as ThemeMode)) || 'dark'
  );

  let scheme = $state<ColorScheme>(
    (typeof localStorage !== 'undefined' && (localStorage.getItem('devtools_scheme') as ColorScheme)) || 'gruvbox'
  );

  // Sync DOM and persistence
  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('devtools_theme', mode);
      localStorage.setItem('devtools_scheme', scheme);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', scheme);
      document.documentElement.classList.toggle('dark', mode === 'dark');
    }
  });

  const monacoTheme = $derived(getMonacoThemeName(scheme, mode));

  function toggleMode() {
    mode = mode === 'dark' ? 'light' : 'dark';
  }

  function selectScheme(newScheme: ColorScheme) {
    scheme = newScheme;
  }

  // Global keyboard shortcuts (⌘1, ⌘2, ⌘3, ⌘0)
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      if (e.key === '1') {
        e.preventDefault();
        router.navigate('/json');
      } else if (e.key === '2') {
        e.preventDefault();
        router.navigate('/diff');
      } else if (e.key === '3') {
        e.preventDefault();
        router.navigate('/mermaid');
      } else if (e.key === '4') {
        e.preventDefault();
        router.navigate('/plantuml');
      } else if (e.key === '5') {
        e.preventDefault();
        router.navigate('/sqlite');
      } else if (e.key === '0' || e.key.toLowerCase() === 'h') {
        e.preventDefault();
        router.navigate('/');
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="h-screen flex flex-col bg-background text-on-surface antialiased overflow-hidden transition-colors duration-200">
  <!-- Top Navigation Header -->
  <Header
    {scheme}
    theme={mode}
    onSelectScheme={selectScheme}
    onToggleTheme={toggleMode}
    currentRoute={router.currentRoute}
  />

  <!-- App Body: Sidebar Rail + Tool Content -->
  <div class="flex-1 flex min-h-0 overflow-hidden">
    <SidebarRail currentRoute={router.currentRoute} />

    <main class="flex-1 flex flex-col min-w-0 min-h-0 {router.currentRoute === '/' ? 'overflow-y-auto' : 'overflow-hidden'} bg-background">
      {#if router.currentRoute === '/'}
        <Home />
      {:else if router.currentRoute === '/json'}
        <LazyTool
          name="JSON Formatter"
          loader={TOOL_LOADERS['/json']}
          props={{ theme: monacoTheme }}
        />
      {:else if router.currentRoute === '/diff'}
        <LazyTool
          name="Diff Checker"
          loader={TOOL_LOADERS['/diff']}
          props={{ theme: monacoTheme }}
        />
      {:else if router.currentRoute === '/mermaid'}
        <LazyTool
          name="Mermaid Studio"
          loader={TOOL_LOADERS['/mermaid']}
          props={{ scheme, theme: mode, monacoTheme }}
        />
      {:else if router.currentRoute === '/plantuml'}
        <LazyTool
          name="PlantUML Studio"
          loader={TOOL_LOADERS['/plantuml']}
          props={{ scheme, theme: mode, monacoTheme }}
        />
      {:else if router.currentRoute === '/sqlite'}
        <LazyTool
          name="SQLite Studio"
          loader={TOOL_LOADERS['/sqlite']}
          props={{ scheme, theme: mode, monacoTheme }}
        />
      {/if}
    </main>
  </div>

  <!-- Minimalist Footer -->
  <Footer />
</div>
