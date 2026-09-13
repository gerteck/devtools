<script lang="ts">
  import { router, TOOLS } from '../router.svelte';
  import { Search, ArrowRight, Braces, GitCompare, Workflow, Network } from '@lucide/svelte';

  let searchQuery = $state('');
  let searchInputRef: HTMLInputElement | null = null;

  const filteredTools = $derived(
    TOOLS.filter((tool) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.tag.toLowerCase().includes(q)
      );
    })
  );

  function handleSlashKey(e: KeyboardEvent) {
    if (e.key === '/' && document.activeElement !== searchInputRef) {
      e.preventDefault();
      searchInputRef?.focus();
    }
  }

  function getToolIcon(id: string) {
    if (id === 'json') return Braces;
    if (id === 'diff') return GitCompare;
    if (id === 'mermaid') return Workflow;
    if (id === 'plantuml') return Network;
    return Workflow;
  }
</script>

<svelte:window onkeydown={handleSlashKey} />

<div class="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-6 py-10 md:py-14 flex-1 flex flex-col justify-center">
  <!-- Hero Section -->
  <div class="text-left max-w-2xl mb-8 w-full">
    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-on-surface mb-2 font-mono">devtools</h1>
    <p class="text-sm text-on-surface-variant font-normal leading-relaxed">
      A small collection of lightweight everyday tools for web development.
    </p>

    <!-- Search Input -->
    <div class="mt-6 relative max-w-lg">
      <div class="relative flex items-center bg-surface border border-outline-variant rounded-lg hover:border-outline focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
        <span class="text-outline ml-3 pointer-events-none flex items-center">
          <Search size={16} />
        </span>
        <input
          bind:this={searchInputRef}
          bind:value={searchQuery}
          type="text"
          placeholder="Filter tools..."
          spellcheck="false"
          autocomplete="off"
          class="w-full bg-transparent py-2 pl-2.5 pr-14 text-xs font-mono text-on-surface placeholder:text-outline focus:outline-none border-none ring-0 focus:ring-0"
        />
        <div class="absolute right-2.5 flex items-center pointer-events-none">
          <kbd class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant text-on-surface-variant">
            /
          </kbd>
        </div>
      </div>
    </div>
  </div>

  <!-- Tools Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {#each filteredTools as tool}
      {@const IconComponent = getToolIcon(tool.id)}
      <div
        class="tool-card group bg-surface border border-outline-variant hover:border-outline rounded-lg p-5 transition-colors flex flex-col justify-between"
      >
        <div>
          <div class="flex items-start justify-between gap-4 mb-4">
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded bg-surface-container border border-outline-variant flex items-center justify-center text-primary dark:text-indigo-400">
                <IconComponent size={16} strokeWidth={2} />
              </span>
              <div>
                <h2 class="text-sm font-semibold text-on-surface group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors">
                  {tool.name}
                </h2>
                {#if tool.version}
                  <span class="text-[11px] font-mono text-outline">{tool.version}</span>
                {/if}
              </div>
            </div>
            <kbd class="text-[10px] font-mono text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded border border-outline-variant">
              {tool.shortcutLabel}
            </kbd>
          </div>
          <p class="text-xs leading-relaxed text-on-surface-variant mb-6">
            {tool.description}
          </p>
        </div>

        <div class="pt-3 border-t border-outline-variant flex items-center justify-between">
          <span class="text-[11px] font-mono text-outline">{tool.tag}</span>
          <button
            onclick={() => router.navigate(tool.route)}
            class="inline-flex items-center gap-1 text-xs font-mono font-medium text-primary dark:text-indigo-400 hover:text-on-primary-container transition-colors cursor-pointer"
          >
            <span>Open</span>
            <ArrowRight size={13} class="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    {/each}

    {#if filteredTools.length === 0}
      <div class="col-span-full text-center py-12 text-on-surface-variant text-xs font-mono border border-dashed border-outline-variant rounded-lg">
        No tools found matching "{searchQuery}"
      </div>
    {/if}
  </div>
</div>
