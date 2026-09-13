<script lang="ts">
  import { useMonacoDiffEditor, type MonacoDiffEditorControls, type DiffStats } from '../actions/useMonacoDiffEditor';
  import { SAMPLES } from '../utils/samples';
  import { createPersistedState } from '../utils/storage.svelte';
  import {
    GitCompare,
    ArrowLeftRight,
    Sparkles,
    Trash2,
    Columns2,
    Rows2,
    Copy,
    Check,
    Filter,
    ChevronUp,
    ChevronDown,
    Space,
  } from '@lucide/svelte';

  let {
    theme = 'devtools-dark',
  }: {
    theme?: string;
  } = $props();

  const defaultSideBySide = typeof window !== 'undefined' ? window.innerWidth >= 640 : true;
  const origDraft = createPersistedState('devtools_diff_orig', SAMPLES.diffOriginal);
  const modDraft = createPersistedState('devtools_diff_mod', SAMPLES.diffModified);
  const langDraft = createPersistedState('devtools_diff_lang', 'json');
  const sideBySideDraft = createPersistedState('devtools_diff_side_by_side', defaultSideBySide);
  const onlyDiffsDraft = createPersistedState('devtools_diff_only_diffs', false);
  const contextLinesDraft = createPersistedState('devtools_diff_context_lines', 3);
  const excludeWhitespaceDraft = createPersistedState('devtools_diff_exclude_whitespace', false);

  let original = $state(origDraft.value);
  let modified = $state(modDraft.value);
  let selectedLanguage = $state(langDraft.value);
  let isSideBySide = $state(sideBySideDraft.value);
  let showOnlyDiffs = $state(onlyDiffsDraft.value);
  let contextLines = $state(contextLinesDraft.value);
  let excludeWhitespace = $state(excludeWhitespaceDraft.value);

  let diffControls = $state<MonacoDiffEditorControls | null>(null);
  let diffStats = $state<DiffStats>({ changesCount: 0, additions: 0, deletions: 0 });

  let copiedSide = $state<'orig' | 'mod' | null>(null);

  // Sync to storage
  $effect(() => {
    origDraft.value = original;
  });
  $effect(() => {
    modDraft.value = modified;
  });
  $effect(() => {
    langDraft.value = selectedLanguage;
  });
  $effect(() => {
    sideBySideDraft.value = isSideBySide;
  });
  $effect(() => {
    onlyDiffsDraft.value = showOnlyDiffs;
  });
  $effect(() => {
    contextLinesDraft.value = contextLines;
  });
  $effect(() => {
    excludeWhitespaceDraft.value = excludeWhitespace;
  });

  // Watch document class for dark/light theme
  let currentTheme = $state<'devtools-dark' | 'devtools-light'>(
    document.documentElement.classList.contains('dark') ? 'devtools-dark' : 'devtools-light'
  );

  const observer = new MutationObserver(() => {
    currentTheme = document.documentElement.classList.contains('dark') ? 'devtools-dark' : 'devtools-light';
  });
  if (typeof document !== 'undefined') {
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  const languages = [
    { value: 'plaintext', label: 'Plain Text' },
    { value: 'json', label: 'JSON' },
    { value: 'java', label: 'Java' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'swift', label: 'Swift' },
    { value: 'objective-c', label: 'Objective-C' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'sql', label: 'SQL' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'yaml', label: 'YAML' },
    { value: 'xml', label: 'XML' },
    { value: 'markdown', label: 'Markdown' },
  ];

  function loadSample() {
    original = SAMPLES.diffOriginal;
    modified = SAMPLES.diffModified;
    selectedLanguage = 'json';
  }

  function swapSides() {
    const temp = original;
    original = modified;
    modified = temp;
  }

  function clearAll() {
    original = '';
    modified = '';
  }

  function copyText(side: 'orig' | 'mod') {
    navigator.clipboard.writeText(side === 'orig' ? original : modified);
    copiedSide = side;
    setTimeout(() => (copiedSide = null), 1500);
  }
</script>

<div class="flex-1 flex flex-col h-full bg-background overflow-hidden">
  <!-- Toolbar Header -->
  <div class="h-12 border-b border-outline-variant bg-surface px-2 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 shrink-0 font-mono text-xs overflow-x-auto no-scrollbar">
    <!-- Left: Tool Title & Language Dropdown -->
    <div class="flex items-center gap-2 sm:gap-3 shrink-0">
      <div class="flex items-center gap-1.5 font-semibold text-on-surface">
        <GitCompare size={15} class="text-primary dark:text-indigo-400" />
        <span class="hidden sm:inline">Diff Checker</span>
      </div>

      <div class="h-4 w-px bg-outline-variant hidden sm:block"></div>

      <!-- Language Selector -->
      <div class="flex items-center gap-1">
        <label for="diff-lang" class="text-on-surface-variant text-[11px] hidden sm:inline">Language:</label>
        <select
          id="diff-lang"
          bind:value={selectedLanguage}
          class="bg-surface-container border border-outline-variant text-on-surface rounded px-1.5 sm:px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-primary cursor-pointer max-w-[85px] sm:max-w-none"
        >
          {#each languages as lang}
            <option value={lang.value}>{lang.label}</option>
          {/each}
        </select>
      </div>

      <!-- Layout Toggle: Split vs Unified -->
      <div class="flex items-center bg-surface-container p-0.5 rounded border border-outline-variant">
        <button
          onclick={() => (isSideBySide = true)}
          class="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded transition-all cursor-pointer {isSideBySide
            ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
            : 'text-on-surface-variant hover:text-on-surface'}"
          title="Side by Side (Split View)"
        >
          <Columns2 size={13} />
          <span class="text-[11px] hidden sm:inline">Split</span>
        </button>
        <button
          onclick={() => (isSideBySide = false)}
          class="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded transition-all cursor-pointer {!isSideBySide
            ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
            : 'text-on-surface-variant hover:text-on-surface'}"
          title="Inline (Unified View)"
        >
          <Rows2 size={13} />
          <span class="text-[11px] hidden sm:inline">Unified</span>
        </button>
      </div>

      <div class="h-4 w-px bg-outline-variant"></div>

      <!-- Show Only Diffs Toggle -->
      <button
        onclick={() => (showOnlyDiffs = !showOnlyDiffs)}
        class="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded transition-all cursor-pointer {showOnlyDiffs
          ? 'bg-primary/10 text-primary border border-primary/40 font-semibold shadow-xs'
          : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant'}"
        title="Show only diffs and collapse unchanged code lines"
      >
        <Filter size={12} class={showOnlyDiffs ? 'text-primary' : 'text-on-surface-variant'} />
        <span class="text-[11px] hidden sm:inline">Diffs Only</span>
      </button>

      {#if showOnlyDiffs}
        <div class="flex items-center gap-1 text-[11px] text-on-surface-variant">
          <span class="hidden sm:inline">Context:</span>
          <select
            bind:value={contextLines}
            class="bg-surface-container border border-outline-variant text-on-surface rounded px-1 sm:px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-primary cursor-pointer"
            title="Lines of unchanged context around differences"
          >
            <option value={1}>1L</option>
            <option value={3}>3L</option>
            <option value={5}>5L</option>
            <option value={10}>10L</option>
          </select>
        </div>
      {/if}

      <!-- Exclude Whitespace Toggle -->
      <button
        onclick={() => (excludeWhitespace = !excludeWhitespace)}
        class="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded transition-all cursor-pointer {excludeWhitespace
          ? 'bg-primary/10 text-primary border border-primary/40 font-semibold shadow-xs'
          : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant'}"
        title={excludeWhitespace ? 'Whitespace changes are excluded (click to include)' : 'Exclude leading and trailing whitespace changes from diff'}
      >
        <Space size={13} class={excludeWhitespace ? 'text-primary' : 'text-on-surface-variant'} />
        <span class="text-[11px] hidden sm:inline">Exclude Whitespace</span>
        <span class="text-[11px] sm:hidden">No WS</span>
      </button>

      <!-- Next / Prev Diff Navigation -->
      <div class="flex items-center bg-surface-container p-0.5 rounded border border-outline-variant">
        <button
          onclick={() => diffControls?.goToDiff('previous')}
          disabled={diffStats.changesCount === 0}
          class="p-0.5 px-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          title="Previous difference"
        >
          <ChevronUp size={13} />
        </button>
        <button
          onclick={() => diffControls?.goToDiff('next')}
          disabled={diffStats.changesCount === 0}
          class="p-0.5 px-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          title="Next difference"
        >
          <ChevronDown size={13} />
        </button>
      </div>

      <!-- Diff count badge -->
      {#if diffStats.changesCount === 0}
        <span class="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <Check size={11} />
          <span>Identical</span>
        </span>
      {:else}
        <span class="hidden md:inline-flex items-center gap-1.5 text-[11px] bg-surface-container px-2 py-0.5 rounded border border-outline-variant">
          <span class="font-medium text-on-surface">{diffStats.changesCount} diff{diffStats.changesCount > 1 ? 's' : ''}</span>
          <span class="text-emerald-600 dark:text-emerald-400 font-semibold">+{diffStats.additions}</span>
          <span class="text-rose-600 dark:text-rose-400 font-semibold">-{diffStats.deletions}</span>
        </span>
      {/if}
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <button
        onclick={loadSample}
        class="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title="Load sample JSON comparison"
      >
        <Sparkles size={12} />
        <span class="hidden sm:inline">Sample</span>
      </button>

      <button
        onclick={swapSides}
        class="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title="Swap Original and Modified panes"
      >
        <ArrowLeftRight size={12} />
        <span class="hidden sm:inline">Swap</span>
      </button>

      <div class="h-4 w-px bg-outline-variant"></div>

      <!-- Copy Left / Right -->
      <button
        onclick={() => copyText('orig')}
        class="flex items-center gap-1 px-2 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer text-[11px]"
        title="Copy Original (Left)"
      >
        {#if copiedSide === 'orig'}
          <Check size={12} class="text-secondary" />
          <span class="hidden sm:inline">Copied Left!</span>
          <span class="sm:hidden">✓L</span>
        {:else}
          <Copy size={12} />
          <span class="hidden sm:inline">Copy Left</span>
          <span class="sm:hidden">L</span>
        {/if}
      </button>

      <button
        onclick={() => copyText('mod')}
        class="flex items-center gap-1 px-2 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer text-[11px]"
        title="Copy Modified (Right)"
      >
        {#if copiedSide === 'mod'}
          <Check size={12} class="text-secondary" />
          <span class="hidden sm:inline">Copied Right!</span>
          <span class="sm:hidden">✓R</span>
        {:else}
          <Copy size={12} />
          <span class="hidden sm:inline">Copy Right</span>
          <span class="sm:hidden">R</span>
        {/if}
      </button>

      <button
        onclick={clearAll}
        class="p-1 sm:p-1.5 rounded border border-outline-variant hover:bg-rose-500/10 text-on-surface-variant hover:text-rose-500 transition-colors cursor-pointer"
        title="Clear Both Panes"
      >
        <Trash2 size={13} />
      </button>
    </div>
  </div>

  <!-- Sub-header labels for panes -->
  <div class="h-7 border-b border-outline-variant bg-surface-container-low px-4 flex items-center justify-between text-[11px] font-mono text-outline shrink-0">
    <div class="flex items-center gap-2">
      <span class="font-medium text-on-surface-variant">ORIGINAL</span>
      <span class="text-[10px] px-1.5 py-0.2 rounded bg-surface-container border border-outline-variant text-emerald-600 dark:text-emerald-400">
        Editable
      </span>
    </div>
    {#if isSideBySide}
      <div class="flex items-center gap-2">
        <span class="font-medium text-on-surface-variant">MODIFIED</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded bg-surface-container border border-outline-variant text-emerald-600 dark:text-emerald-400">
          Editable
        </span>
      </div>
    {/if}
  </div>

  <!-- Monaco Diff Editor -->
  <div class="flex-1 min-h-0 relative w-full h-full">
    <div
      class="w-full h-full"
      use:useMonacoDiffEditor={{
        original: original,
        modified: modified,
        language: selectedLanguage,
        theme: theme,
        originalEditable: true,
        renderSideBySide: isSideBySide,
        hideUnchangedRegions: showOnlyDiffs,
        contextLineCount: contextLines,
        ignoreTrimWhitespace: excludeWhitespace,
        onOriginalChange: (val) => (original = val),
        onModifiedChange: (val) => (modified = val),
        onDiffStatsChange: (stats) => (diffStats = stats),
        onInitControls: (ctrls) => (diffControls = ctrls),
      }}
    ></div>
  </div>

  <!-- Bottom Status Bar -->
  <div class="border-t border-outline-variant bg-surface px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-on-surface-variant shrink-0">
    <div class="flex items-center gap-3">
      <span>Mode: <strong class="text-on-surface">{isSideBySide ? 'Side-by-side Split' : 'Unified Inline'}</strong></span>
      <span>•</span>
      <span>View: <strong class="text-on-surface">{showOnlyDiffs ? `Diffs Only (${contextLines} context)` : 'Full Document'}</strong></span>
      <span>•</span>
      <span>Whitespace: <strong class="text-on-surface">{excludeWhitespace ? 'Excluded' : 'Included'}</strong></span>
      <span>•</span>
      <span>Syntax: <strong class="text-on-surface uppercase">{selectedLanguage}</strong></span>
    </div>
    <div class="flex items-center gap-4">
      <span>Left: {original.split('\n').length} lines ({new Blob([original]).size} B)</span>
      <span>Right: {modified.split('\n').length} lines ({new Blob([modified]).size} B)</span>
    </div>
  </div>
</div>
