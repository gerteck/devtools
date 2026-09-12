<script lang="ts">
  let showShortcutsModal = $state(false);

  const shortcuts = [
    { key: '⌘ / Ctrl + 1', action: 'Open JSON Formatter' },
    { key: '⌘ / Ctrl + 2', action: 'Open Diff Checker' },
    { key: '⌘ / Ctrl + 3', action: 'Open Mermaid Studio' },
    { key: '⌘ / Ctrl + 0', action: 'Return to Home / All Tools' },
    { key: '/', action: 'Focus search bar on Home page' },
  ];
</script>

<footer class="w-full border-t border-outline-variant bg-surface py-4 select-none shrink-0 transition-colors">
  <div class="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant font-mono">
    <div>
      <span>Built for daily use. 100% client-side & open source.</span>
    </div>
    <div class="flex items-center gap-4">
      <button
        onclick={() => (showShortcutsModal = true)}
        class="hover:text-on-surface transition-colors cursor-pointer"
      >
        shortcuts
      </button>
      <span class="text-outline-variant">/</span>
      <a
        href="https://github.com"
        target="_blank"
        rel="noreferrer"
        class="hover:text-on-surface transition-colors"
      >
        github
      </a>
    </div>
  </div>
</footer>

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
