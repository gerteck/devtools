<script lang="ts">
  import { router } from './router.svelte';
  import Header from './components/Header.svelte';
  import SidebarRail from './components/SidebarRail.svelte';
  import Footer from './components/Footer.svelte';
  import Home from './tools/Home.svelte';
  import JsonSuite from './tools/JsonSuite.svelte';
  import DiffChecker from './tools/DiffChecker.svelte';
  import MermaidStudio from './tools/MermaidStudio.svelte';

  // Initialize theme from localStorage or default to dark
  let theme = $state<'dark' | 'light'>(
    (typeof localStorage !== 'undefined' && (localStorage.getItem('devtools_theme') as 'dark' | 'light')) || 'dark'
  );

  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('devtools_theme', theme);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  });

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
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
      } else if (e.key === '0' || e.key.toLowerCase() === 'h') {
        e.preventDefault();
        router.navigate('/');
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="h-screen flex flex-col bg-background text-on-surface antialiased overflow-hidden select-none">
  <!-- Top Navigation Header -->
  <Header {theme} onToggleTheme={toggleTheme} currentRoute={router.currentRoute} />

  <!-- App Body: Sidebar Rail + Tool Content -->
  <div class="flex-1 flex min-h-0 overflow-hidden">
    <SidebarRail currentRoute={router.currentRoute} />

    <main class="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto bg-background">
      {#if router.currentRoute === '/'}
        <Home />
      {:else if router.currentRoute === '/json'}
        <JsonSuite />
      {:else if router.currentRoute === '/diff'}
        <DiffChecker />
      {:else if router.currentRoute === '/mermaid'}
        <MermaidStudio />
      {/if}
    </main>
  </div>

  <!-- Minimalist Footer -->
  <Footer />
</div>
