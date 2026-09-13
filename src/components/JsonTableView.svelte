<script lang="ts">
  import {
    generateChrisNielsenHtml,
    generateStandaloneHtmlDocument,
  } from '../utils/jsonHtmlVisualizer';
  import {
    Copy,
    Check,
    Download,
    Minimize2,
    Maximize2,
    Code,
    Eye,
    Palette,
  } from '@lucide/svelte';

  let {
    data,
    initialTheme = 'classic',
  }: {
    data: any;
    initialTheme?: 'classic' | 'modern';
  } = $props();

  let visualTheme = $state<'classic' | 'modern'>('classic');
  $effect(() => {
    visualTheme = initialTheme;
  });

  let truncate = $state<boolean>(false);
  let detectDates = $state<boolean>(true);
  let viewSource = $state<boolean>(false);
  let copied = $state<boolean>(false);

  let containerEl: HTMLElement | null = $state(null);

  // Derived HTML markup
  const htmlOutput = $derived(
    data !== null && data !== undefined
      ? generateChrisNielsenHtml(data, { truncate, detectDates })
      : ''
  );

  // Standalone HTML for export
  const standaloneHtml = $derived(
    generateStandaloneHtmlDocument(htmlOutput, visualTheme)
  );

  // Handle caption clicking for toggle
  function handleContainerClick(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const caption = target.closest('caption');
    if (!caption || !containerEl?.contains(caption)) return;

    const table = caption.parentElement as HTMLTableElement | null;
    if (!table) return;

    const isExpanded = caption.textContent?.includes('[-]');

    if (table.tHead) {
      table.tHead.style.display = isExpanded ? 'none' : '';
    }

    for (let i = 0; i < table.tBodies.length; i++) {
      table.tBodies[i].style.display = isExpanded ? 'none' : '';
    }

    const currentText = caption.textContent || '';
    if (isExpanded) {
      caption.textContent = currentText.replace('[-]', '[+]');
    } else {
      caption.textContent = currentText.replace('[+]', '[-]');
    }
  }

  $effect(() => {
    if (!containerEl) return;
    const el = containerEl;
    const onClick = (e: MouseEvent) => handleContainerClick(e);
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('click', onClick);
    };
  });

  export function collapseAll() {
    if (!containerEl) return;
    const captions = containerEl.querySelectorAll('caption');
    captions.forEach((caption) => {
      const table = caption.parentElement as HTMLTableElement | null;
      if (!table) return;

      if (table.tHead) table.tHead.style.display = 'none';
      for (let i = 0; i < table.tBodies.length; i++) {
        table.tBodies[i].style.display = 'none';
      }

      if (caption.textContent?.includes('[-]')) {
        caption.textContent = caption.textContent.replace('[-]', '[+]');
      }
    });
  }

  export function expandAll() {
    if (!containerEl) return;
    const captions = containerEl.querySelectorAll('caption');
    captions.forEach((caption) => {
      const table = caption.parentElement as HTMLTableElement | null;
      if (!table) return;

      if (table.tHead) table.tHead.style.display = '';
      for (let i = 0; i < table.tBodies.length; i++) {
        table.tBodies[i].style.display = '';
      }

      if (caption.textContent?.includes('[+]')) {
        caption.textContent = caption.textContent.replace('[+]', '[-]');
      }
    });
  }

  function copyHtml() {
    navigator.clipboard.writeText(htmlOutput);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  function downloadHtml() {
    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'json-visualization.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden select-text">
  <!-- Sub-toolbar controls for Table Visualizer -->
  <div class="h-10 px-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between gap-2 shrink-0 font-mono text-xs overflow-x-auto no-scrollbar">
    <div class="flex items-center gap-1.5 shrink-0">
      <!-- Theme Switcher -->
      <div class="flex items-center rounded border border-outline-variant bg-surface p-0.5 shadow-2xs">
        <button
          onclick={() => (visualTheme = 'classic')}
          class="px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer {visualTheme === 'classic'
            ? 'bg-primary text-white shadow-2xs'
            : 'text-on-surface-variant hover:text-on-surface'}"
          title="Classic 2008 Chris Nielsen retro teal palette (#193441)"
        >
          Classic Retro
        </button>
        <button
          onclick={() => (visualTheme = 'modern')}
          class="px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer {visualTheme === 'modern'
            ? 'bg-primary text-white shadow-2xs'
            : 'text-on-surface-variant hover:text-on-surface'}"
          title="Modern UI theme matching devtools scheme"
        >
          App Theme
        </button>
      </div>

      <div class="w-px h-4 bg-outline-variant mx-1"></div>

      <!-- Expand / Collapse All -->
      <button
        onclick={expandAll}
        class="flex items-center gap-1 px-2 py-1 rounded border border-outline-variant bg-surface hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer text-[11px]"
        title="Expand all tables and nested objects"
      >
        <Maximize2 size={11} />
        <span class="hidden sm:inline">Expand All</span>
      </button>

      <button
        onclick={collapseAll}
        class="flex items-center gap-1 px-2 py-1 rounded border border-outline-variant bg-surface hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer text-[11px]"
        title="Collapse all tables"
      >
        <Minimize2 size={11} />
        <span class="hidden sm:inline">Collapse All</span>
      </button>

      <!-- Options toggles -->
      <label class="flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-on-surface-variant select-none cursor-pointer hover:text-on-surface">
        <input
          type="checkbox"
          bind:checked={truncate}
          class="rounded border-outline-variant text-primary focus:ring-0 cursor-pointer"
        />
        <span>Truncate</span>
      </label>

      <label class="flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-on-surface-variant select-none cursor-pointer hover:text-on-surface">
        <input
          type="checkbox"
          bind:checked={detectDates}
          class="rounded border-outline-variant text-primary focus:ring-0 cursor-pointer"
        />
        <span>Detect Dates</span>
      </label>
    </div>

    <!-- Right Side Actions: View Source, Copy, Download -->
    <div class="flex items-center gap-1.5 shrink-0">
      <button
        onclick={() => (viewSource = !viewSource)}
        class="flex items-center gap-1 px-2 py-1 rounded border border-outline-variant bg-surface hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer text-[11px]"
        title={viewSource ? 'Switch to Interactive Table' : 'View HTML source code'}
      >
        {#if viewSource}
          <Eye size={12} />
          <span>Visual</span>
        {:else}
          <Code size={12} />
          <span>Source</span>
        {/if}
      </button>

      <button
        onclick={copyHtml}
        class="flex items-center gap-1 px-2.5 py-1 rounded border border-outline-variant bg-surface hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer text-[11px]"
        title="Copy raw HTML markup"
      >
        {#if copied}
          <Check size={12} class="text-secondary" />
          <span>Copied!</span>
        {:else}
          <Copy size={12} />
          <span>Copy HTML</span>
        {/if}
      </button>

      <button
        onclick={downloadHtml}
        class="flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-white hover:bg-primary/90 font-medium transition-colors cursor-pointer text-[11px]"
        title="Download standalone HTML file with embedded styling"
      >
        <Download size={12} />
        <span class="hidden sm:inline">Download .html</span>
        <span class="sm:hidden">.html</span>
      </button>
    </div>
  </div>

  <!-- Content Canvas -->
  <div class="flex-1 overflow-auto p-4 md:p-6 {visualTheme === 'classic' ? 'bg-[#193441]' : 'bg-surface'} transition-colors">
    {#if !htmlOutput}
      <div class="text-center py-20 font-mono text-xs text-on-surface-variant">
        No valid JSON data available to visualize.
      </div>
    {:else if viewSource}
      <div class="max-w-5xl mx-auto">
        <div class="mb-2 text-xs font-mono text-on-surface-variant flex items-center justify-between">
          <span>HTML Source Output:</span>
          <span>{new Blob([htmlOutput]).size} bytes</span>
        </div>
        <pre class="p-4 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface font-mono text-xs overflow-x-auto whitespace-pre-wrap select-all leading-relaxed">{htmlOutput}</pre>
      </div>
    {:else}
      <!-- Rendered HTML Table -->
      <div
        bind:this={containerEl}
        class="max-w-6xl mx-auto overflow-x-auto pb-8 {visualTheme === 'classic' ? 'classic-view' : 'modern-view'}"
      >
        {@html htmlOutput}
      </div>
    {/if}
  </div>
</div>

<style>
  /* ==========================================================================
     Classic Retro Theme (faithful 2008 Chris Nielsen styling)
     ========================================================================== */
  :global(.classic-view) {
    color: #FCFFF5;
    font-family: Consolas, "Courier New", monospace;
    font-size: 13px;
  }

  :global(.classic-view output.HTML) {
    display: block;
  }

  :global(.classic-view caption) {
    text-align: left;
    font-family: small-caption, Consolas, sans-serif;
    font-size: 11px;
    margin-bottom: 2px;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    color: #B0C4DE;
    padding-top: 2px;
  }

  :global(.classic-view caption:hover) {
    color: #FFFFFF;
    text-decoration: underline;
  }

  :global(.classic-view table) {
    margin-bottom: 0;
    border-collapse: collapse;
    font-family: inherit;
  }

  :global(.classic-view th),
  :global(.classic-view td) {
    border: 1px solid #4a6d7c;
    vertical-align: top;
    padding: 2px 7px;
    line-height: 1.4;
  }

  :global(.classic-view th) {
    text-align: left;
    font-weight: normal;
    color: #B0C4DE;
    background-color: rgba(0, 0, 0, 0.2);
    user-select: text;
  }

  :global(.classic-view table.OBJ) {
    background-color: #22353C;
  }

  :global(.classic-view table.ARRAY) {
    background-color: #252C47;
  }

  :global(.classic-view tr:hover) {
    background-color: #7B243E !important;
    cursor: pointer;
  }

  :global(.classic-view .STRING) {
    color: #D8FFB0;
  }

  :global(.classic-view .NUMBER) {
    color: #7FFF00;
  }

  :global(.classic-view .BOOL) {
    color: #00FFFF;
  }

  :global(.classic-view .NULL),
  :global(.classic-view .UNDEF),
  :global(.classic-view .EMPTY) {
    color: #91AA9D;
    font-style: italic;
  }

  :global(.classic-view .DATE) {
    color: #6495ED;
  }

  :global(.classic-view span.ARRAY),
  :global(.classic-view span.OBJ) {
    color: #91AA9D;
    font-style: italic;
  }

  /* ==========================================================================
     Modern Theme (harmonious with DevTools / Gruvbox / Tailwind theme)
     ========================================================================== */
  :global(.modern-view) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
  }

  :global(.modern-view output.HTML) {
    display: block;
  }

  :global(.modern-view caption) {
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 3px;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    color: var(--color-on-surface-variant, #9ca3af);
    transition: color 0.15s ease;
  }

  :global(.modern-view caption:hover) {
    color: var(--color-primary, #6366f1);
  }

  :global(.modern-view table) {
    margin-bottom: 0;
    border-collapse: separate;
    border-spacing: 0;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  :global(.modern-view th),
  :global(.modern-view td) {
    border: 1px solid var(--color-outline-variant, rgba(120, 120, 120, 0.2));
    vertical-align: top;
    padding: 3px 8px;
    line-height: 1.5;
  }

  :global(.modern-view th) {
    text-align: left;
    font-weight: 500;
    color: var(--color-primary, #93c5fd);
    background-color: var(--color-surface-container, rgba(255, 255, 255, 0.03));
  }

  :global(.modern-view table.OBJ) {
    background-color: var(--color-surface-container-lowest, #1e1e20);
  }

  :global(.modern-view table.ARRAY) {
    background-color: var(--color-surface-container-low, #242427);
  }

  :global(.modern-view tr:hover) {
    background-color: var(--color-surface-container-high, rgba(99, 102, 241, 0.12)) !important;
  }

  :global(.modern-view .STRING) {
    color: #4ade80; /* emerald-400 */
  }

  :global(.modern-view .NUMBER) {
    color: #fbbf24; /* amber-400 */
  }

  :global(.modern-view .BOOL) {
    color: #c084fc; /* purple-400 */
    font-weight: 600;
  }

  :global(.modern-view .NULL),
  :global(.modern-view .UNDEF),
  :global(.modern-view .EMPTY) {
    color: #9ca3af;
    font-style: italic;
  }

  :global(.modern-view .DATE) {
    color: #38bdf8; /* sky-400 */
  }

  :global(.modern-view span.ARRAY),
  :global(.modern-view span.OBJ) {
    color: #9ca3af;
    font-style: italic;
  }
</style>
