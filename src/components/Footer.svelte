<script lang="ts">
  import { createPersistedState } from '../utils/storage.svelte';
  import { EyeOff, ChevronUp } from '@lucide/svelte';

  const footerHidden = createPersistedState('devtools_footer_hidden', false);
  let isHidden = $state(footerHidden.value);

  $effect(() => {
    footerHidden.value = isHidden;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('resize'));
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  });

  let showShortcutsModal = $state(false);

  const shortcuts = [
    { key: '⌘ / Ctrl + 0', action: 'Return to Home / All Tools' },
    { key: '⌘ / Ctrl + 1', action: 'Open Developer Notepad' },
    { key: '⌘ / Ctrl + 2', action: 'Open JSON Formatter' },
    { key: '⌘ / Ctrl + 3', action: 'Open Diff Checker' },
    { key: '⌘ / Ctrl + 4', action: 'Open Mermaid Studio' },
    { key: '⌘ / Ctrl + 5', action: 'Open PlantUML Studio' },
    { key: '⌘ / Ctrl + 6', action: 'Open SQLite Viewer' },
    { key: '/', action: 'Focus search bar on Home page' },
  ];
</script>

{#if !isHidden}
  <footer class="w-full border-t border-outline-variant bg-surface py-2.5 select-none shrink-0 transition-colors">
    <div class="w-full px-4 sm:px-6 flex items-center justify-between gap-4 text-xs font-mono text-on-surface-variant">
      <!-- Left: Hide footer button -->
      <button
        onclick={() => (isHidden = true)}
        class="inline-flex items-center gap-1.5 hover:text-on-surface text-on-surface-variant transition-colors cursor-pointer group"
        title="Hide footer to maximize screen space"
      >
        <EyeOff size={12} class="opacity-70 group-hover:opacity-100 transition-opacity" />
        <span>hide footer</span>
      </button>

      <!-- Right: Shortcuts & GitHub -->
      <div class="flex items-center gap-3 sm:gap-4">
        <button
          onclick={() => (showShortcutsModal = true)}
          class="hover:text-on-surface transition-colors cursor-pointer"
        >
          shortcuts
        </button>
        <span class="text-outline-variant">/</span>
        <a
          href="https://github.com/gerteck/devtools/"
          target="_blank"
          rel="noreferrer"
          class="inline-flex items-center gap-1 hover:text-on-surface transition-colors group"
          title="Star devtools on GitHub"
        >
          <span>view on github</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-on-surface-variant group-hover:text-on-surface transition-colors"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </a>
      </div>
    </div>
  </footer>
{:else}
  <!-- Floating Show Footer FAB on the Toolbar Side -->
  <div class="fixed bottom-2 left-2 z-30 select-none">
    <button
      onclick={() => (isHidden = false)}
      class="group relative w-10 h-10 rounded-lg flex items-center justify-center bg-surface hover:bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface shadow-sm transition-all cursor-pointer"
      title="Show footer"
    >
      <ChevronUp size={18} strokeWidth={2} class="group-hover:-translate-y-0.5 transition-transform" />

      <!-- Hover Tooltip -->
      <div class="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md flex items-center gap-1.5">
        <span>Show footer</span>
      </div>
    </button>
  </div>
{/if}

<!-- Keyboard Shortcuts Modal -->
{#if showShortcutsModal}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
  >
    <!-- Backdrop button -->
    <button
      type="button"
      aria-label="Close modal backdrop"
      class="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-default w-full h-full border-none"
      onclick={() => (showShortcutsModal = false)}
    ></button>

    <!-- Dialog Box -->
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
      class="relative z-10 bg-surface border border-outline-variant rounded-xl p-6 max-w-sm w-full shadow-2xl font-mono"
    >
      <div class="flex items-center justify-between mb-4 border-b border-outline-variant pb-3">
        <h3 class="text-sm font-semibold text-on-surface">Keyboard Shortcuts</h3>
        <button
          onclick={() => (showShortcutsModal = false)}
          class="text-xs text-on-surface-variant hover:text-on-surface px-1.5 py-0.5 rounded border border-outline-variant cursor-pointer"
        >
          ESC
        </button>
      </div>

      <div class="space-y-2.5">
        {#each shortcuts as sc}
          <div class="flex items-center justify-between text-xs">
            <span class="text-on-surface-variant">{sc.action}</span>
            <kbd class="px-2 py-0.5 rounded bg-surface-container border border-outline-variant text-[11px] text-on-surface font-mono">
              {sc.key}
            </kbd>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}
