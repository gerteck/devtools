<script lang="ts">
  import { useMonacoDiffEditor } from '../actions/useMonacoDiffEditor';
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
  } from '@lucide/svelte';

  const origDraft = createPersistedState('devtools_diff_orig', SAMPLES.diffOriginal);
  const modDraft = createPersistedState('devtools_diff_mod', SAMPLES.diffModified);
  const langDraft = createPersistedState('devtools_diff_lang', 'json');
  const sideBySideDraft = createPersistedState('devtools_diff_side_by_side', true);

  let original = $state(origDraft.value);
  let modified = $state(modDraft.value);
  let selectedLanguage = $state(langDraft.value);
  let isSideBySide = $state(sideBySideDraft.value);

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
    { value: 'json', label: 'JSON' },
    { value: 'plaintext', label: 'Plain Text' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'yaml', label: 'YAML' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'xml', label: 'XML' },
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
  <div class="h-12 border-b border-outline-variant bg-surface px-4 flex items-center justify-between gap-3 shrink-0 font-mono text-xs">
    <!-- Left: Tool Title & Language Dropdown -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5 font-semibold text-on-surface">
        <GitCompare size={15} class="text-primary dark:text-indigo-400" />
        <span>Diff Checker</span>
      </div>

      <div class="h-4 w-px bg-outline-variant"></div>

      <!-- Language Selector -->
      <div class="flex items-center gap-1.5">
        <label for="diff-lang" class="text-on-surface-variant text-[11px]">Language:</label>
        <select
          id="diff-lang"
          bind:value={selectedLanguage}
          class="bg-surface-container border border-outline-variant text-on-surface rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:border-primary cursor-pointer"
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
          class="flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer {isSideBySide
            ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
            : 'text-on-surface-variant hover:text-on-surface'}"
          title="Side by Side (Split View)"
        >
          <Columns2 size={13} />
          <span class="text-[11px]">Split</span>
        </button>
        <button
          onclick={() => (isSideBySide = false)}
          class="flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer {!isSideBySide
            ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
            : 'text-on-surface-variant hover:text-on-surface'}"
          title="Inline (Unified View)"
        >
          <Rows2 size={13} />
          <span class="text-[11px]">Unified</span>
        </button>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-2">
      <button
        onclick={loadSample}
        class="flex items-center gap-1 px-2.5 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title="Load sample JSON comparison"
      >
        <Sparkles size={12} />
        <span>Sample</span>
      </button>

      <button
        onclick={swapSides}
        class="flex items-center gap-1 px-2.5 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title="Swap Original and Modified panes"
      >
        <ArrowLeftRight size={12} />
        <span>Swap</span>
      </button>

      <div class="h-4 w-px bg-outline-variant"></div>

      <!-- Copy Left / Right -->
      <button
        onclick={() => copyText('orig')}
        class="flex items-center gap-1 px-2 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title="Copy Original (Left)"
      >
        {#if copiedSide === 'orig'}
          <Check size={12} class="text-secondary" />
          <span>Copied Left!</span>
        {:else}
          <Copy size={12} />
          <span>Copy Left</span>
        {/if}
      </button>

      <button
        onclick={() => copyText('mod')}
        class="flex items-center gap-1 px-2 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title="Copy Modified (Right)"
      >
        {#if copiedSide === 'mod'}
          <Check size={12} class="text-secondary" />
          <span>Copied Right!</span>
        {:else}
          <Copy size={12} />
          <span>Copy Right</span>
        {/if}
      </button>

      <button
        onclick={clearAll}
        class="p-1 rounded border border-outline-variant hover:bg-rose-500/10 text-on-surface-variant hover:text-rose-500 transition-colors cursor-pointer"
        title="Clear Both Panes"
      >
        <Trash2 size={14} />
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
        theme: currentTheme,
        originalEditable: true,
        renderSideBySide: isSideBySide,
        onOriginalChange: (val) => (original = val),
        onModifiedChange: (val) => (modified = val),
      }}
    ></div>
  </div>

  <!-- Bottom Status Bar -->
  <div class="border-t border-outline-variant bg-surface px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-on-surface-variant shrink-0">
    <div class="flex items-center gap-3">
      <span>Mode: <strong class="text-on-surface">{isSideBySide ? 'Side-by-side Split' : 'Unified Inline'}</strong></span>
      <span>•</span>
      <span>Syntax: <strong class="text-on-surface uppercase">{selectedLanguage}</strong></span>
    </div>
    <div class="flex items-center gap-4">
      <span>Left: {original.split('\n').length} lines ({new Blob([original]).size} B)</span>
      <span>Right: {modified.split('\n').length} lines ({new Blob([modified]).size} B)</span>
    </div>
  </div>
</div>
