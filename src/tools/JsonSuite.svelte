<script lang="ts">
  import { useMonacoEditor } from '../actions/useMonacoEditor';
  import JsonTreeView from '../components/JsonTreeView.svelte';
  import { SAMPLES } from '../utils/samples';
  import { createPersistedState } from '../utils/storage.svelte';
  import type { JsonError } from '../types';
  import {
    Copy,
    Check,
    Trash2,
    Sparkles,
    Braces,
    Network,
    AlertCircle,
    CheckCircle2,
  } from '@lucide/svelte';

  let { initialTab = 'editor' }: { initialTab?: 'editor' | 'tree' } = $props();

  let activeTab = $state<'editor' | 'tree'>('editor');
  $effect(() => {
    activeTab = initialTab;
  });
  let indentSpaces = $state<2 | 4>(2);
  let copied = $state(false);

  // Persistent draft
  const jsonDraft = createPersistedState('devtools_json_draft', SAMPLES.json);
  let rawJson = $state(jsonDraft.value);

  // Sync to storage
  $effect(() => {
    jsonDraft.value = rawJson;
  });

  // Watch document class for theme
  let currentTheme = $state<'devtools-dark' | 'devtools-light'>(
    document.documentElement.classList.contains('dark') ? 'devtools-dark' : 'devtools-light'
  );

  const observer = new MutationObserver(() => {
    currentTheme = document.documentElement.classList.contains('dark') ? 'devtools-dark' : 'devtools-light';
  });
  if (typeof document !== 'undefined') {
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  // Parse validation & AST
  let parsedJson = $state<any>(null);
  let jsonError = $state<JsonError | null>(null);

  $effect(() => {
    if (!rawJson.trim()) {
      parsedJson = null;
      jsonError = null;
      return;
    }

    try {
      parsedJson = JSON.parse(rawJson);
      jsonError = null;
    } catch (err: any) {
      parsedJson = null;
      const message = err?.message || 'Invalid JSON syntax';

      let line: number | undefined;
      let column: number | undefined;

      const posMatch = message.match(/position\s+(\d+)/i);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const textUpToPos = rawJson.slice(0, pos);
        const lines = textUpToPos.split('\n');
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }

      const lineColMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        column = parseInt(lineColMatch[2], 10);
      }

      jsonError = { message, line, column };
    }
  });

  function formatJson(spaces: 2 | 4 = indentSpaces) {
    if (!rawJson.trim()) return;
    try {
      const obj = JSON.parse(rawJson);
      rawJson = JSON.stringify(obj, null, spaces);
    } catch {
      // Keep as-is if invalid
    }
  }

  function minifyJson() {
    if (!rawJson.trim()) return;
    try {
      const obj = JSON.parse(rawJson);
      rawJson = JSON.stringify(obj);
    } catch {
      // Keep as-is if invalid
    }
  }

  function copyJson() {
    navigator.clipboard.writeText(rawJson);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  function clearJson() {
    rawJson = '';
  }

  function loadSample() {
    rawJson = SAMPLES.json;
  }
</script>

<div class="flex-1 flex flex-col h-full bg-background overflow-hidden">
  <!-- Toolbar Header -->
  <div class="h-12 border-b border-outline-variant bg-surface px-4 flex items-center justify-between gap-3 shrink-0 font-mono text-xs">
    <!-- Tab Switcher: Editor vs Tree View -->
    <div class="flex items-center gap-1 bg-surface-container p-0.5 rounded-lg border border-outline-variant">
      <button
        onclick={() => (activeTab = 'editor')}
        class="flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer {activeTab === 'editor'
          ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
          : 'text-on-surface-variant hover:text-on-surface'}"
      >
        <Braces size={14} />
        <span>Editor</span>
      </button>

      <button
        onclick={() => (activeTab = 'tree')}
        class="flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer {activeTab === 'tree'
          ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
          : 'text-on-surface-variant hover:text-on-surface'}"
      >
        <Network size={14} />
        <span>Tree View</span>
      </button>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <button
        onclick={loadSample}
        class="flex items-center gap-1 px-2.5 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title="Load sample JSON"
      >
        <Sparkles size={12} />
        <span>Sample</span>
      </button>

      <div class="flex items-center rounded border border-outline-variant bg-surface-container overflow-hidden">
        <button
          onclick={() => { indentSpaces = 2; formatJson(2); }}
          class="px-2 py-1 transition-colors cursor-pointer {indentSpaces === 2 ? 'bg-primary text-white font-semibold' : 'text-on-surface-variant hover:text-on-surface'}"
        >
          2 sp
        </button>
        <div class="w-px h-3.5 bg-outline-variant"></div>
        <button
          onclick={() => { indentSpaces = 4; formatJson(4); }}
          class="px-2 py-1 transition-colors cursor-pointer {indentSpaces === 4 ? 'bg-primary text-white font-semibold' : 'text-on-surface-variant hover:text-on-surface'}"
        >
          4 sp
        </button>
      </div>

      <button
        onclick={minifyJson}
        class="px-2.5 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
      >
        Minify
      </button>

      <button
        onclick={copyJson}
        class="flex items-center gap-1 px-2.5 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
      >
        {#if copied}
          <Check size={12} class="text-secondary" />
          <span>Copied!</span>
        {:else}
          <Copy size={12} />
          <span>Copy</span>
        {/if}
      </button>

      <button
        onclick={clearJson}
        class="p-1 rounded border border-outline-variant hover:bg-rose-500/10 text-on-surface-variant hover:text-rose-500 transition-colors cursor-pointer"
        title="Clear Input"
      >
        <Trash2 size={14} />
      </button>
    </div>
  </div>

  <!-- Content Workspace -->
  <div class="flex-1 min-h-0 relative flex flex-col overflow-hidden">
    {#if activeTab === 'editor'}
      <!-- Monaco Editor View -->
      <div
        class="flex-1 w-full h-full"
        use:useMonacoEditor={{
          value: rawJson,
          language: 'json',
          theme: currentTheme,
          onChange: (val) => (rawJson = val),
        }}
      ></div>

    {:else if activeTab === 'tree'}
      <!-- Interactive Tree View -->
      <div class="flex-1 overflow-auto p-6 bg-surface">
        {#if jsonError}
          <div class="max-w-xl mx-auto p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-start gap-3 font-mono text-xs">
            <AlertCircle size={16} class="shrink-0 mt-0.5" />
            <div>
              <p class="font-semibold mb-1">Cannot render Tree View: Invalid JSON</p>
              <p class="text-rose-400">{jsonError.message}</p>
            </div>
          </div>
        {:else if parsedJson !== null}
          <div class="max-w-4xl mx-auto bg-surface-container-low border border-outline-variant rounded-xl p-5 shadow-xs">
            <JsonTreeView data={parsedJson} />
          </div>
        {:else}
          <div class="text-center py-20 text-on-surface-variant font-mono text-xs">
            Enter or paste JSON in the Editor tab to visualize tree structure.
          </div>
        {/if}
      </div>
    {/if}

    <!-- Parsing Error Status Bar -->
    {#if jsonError}
      <div class="border-t border-rose-500/30 bg-rose-500/10 px-4 py-2 flex items-center justify-between text-xs font-mono text-rose-600 dark:text-rose-400 shrink-0">
        <div class="flex items-center gap-2">
          <AlertCircle size={14} class="shrink-0" />
          <span class="font-semibold">JSON Syntax Error:</span>
          <span>{jsonError.message}</span>
        </div>
        {#if jsonError.line !== undefined}
          <span class="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-[11px] font-bold">
            Line {jsonError.line}, Col {jsonError.column}
          </span>
        {/if}
      </div>
    {:else if rawJson.trim()}
      <div class="border-t border-outline-variant bg-surface px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-on-surface-variant shrink-0">
        <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={13} />
          <span>Valid JSON</span>
        </div>
        <div class="flex items-center gap-4">
          <span>{new Blob([rawJson]).size} bytes</span>
          <span>{rawJson.split('\n').length} lines</span>
        </div>
      </div>
    {/if}
  </div>
</div>
