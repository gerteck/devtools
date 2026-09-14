<script lang="ts">
  import { useMonacoEditor } from '../actions/useMonacoEditor';
  import { createPersistedState } from '../utils/storage.svelte';
  import {
    getTextStats,
    toUpperCase,
    toLowerCase,
    toTitleCase,
    toCamelCase,
    toSnakeCase,
    toKebabCase,
    sortLinesAsc,
    sortLinesDesc,
    removeDuplicateLines,
    stripEmptyLines,
    trimWhitespace,
    reverseLines,
    base64Encode,
    base64Decode,
    urlEncode,
    urlDecode,
  } from '../utils/textTransforms';
  import { renderMarkdown } from '../utils/markdown';
  import {
    Plus,
    X,
    Copy,
    Check,
    Download,
    Trash2,
    Eye,
    Edit3,
    WrapText,
    Wand2,
    ChevronDown,
    FileText,
    CheckCircle2,
    AlertCircle,
  } from '@lucide/svelte';

  let {
    theme = 'devtools-dark',
  }: {
    theme?: string;
  } = $props();

  interface NoteTab {
    id: string;
    title: string;
    content: string;
    language: string;
    createdAt: number;
  }

  const DEFAULT_NOTE: NoteTab = {
    id: 'note-1',
    title: 'Scratchpad',
    content: `# Welcome to Notepad

A fast, lightweight developer scratchpad with multi-tab support and handy utilities.

### Features
- **Auto-saved**: Everything you type is stored locally in your browser.
- **Multi-tab**: Organize notes, query drafts, or payload scraps.
- **Transformations**: Convert case, sort lines, base64/URL encode.
- **Languages**: Syntax highlighting for JSON, SQL, TypeScript, Markdown, Python, and more.

\`\`\`typescript
interface Developer {
  lovesCleanTools: boolean;
  needsNoLogin: true;
}
\`\`\`
`,
    language: 'markdown',
    createdAt: Date.now(),
  };

  const tabsState = createPersistedState<NoteTab[]>('devtools_notepad_tabs', [DEFAULT_NOTE]);
  const activeTabIdState = createPersistedState<string>('devtools_notepad_active_tab', DEFAULT_NOTE.id);
  const wordWrapState = createPersistedState<'on' | 'off'>('devtools_notepad_wordwrap', 'on');

  let tabs = $derived(tabsState.value);
  let activeTabId = $derived(activeTabIdState.value);
  let wordWrap = $derived(wordWrapState.value);

  // Active Tab resolution
  const currentTab = $derived.by(() => {
    const found = tabs.find((t) => t.id === activeTabId);
    return found || tabs[0] || DEFAULT_NOTE;
  });

  // UI States
  let viewMode = $state<'edit' | 'preview'>('edit');
  let copied = $state(false);
  let transformMenuOpen = $state(false);
  let statusMessage = $state<{ text: string; type: 'success' | 'error' } | null>(null);
  let editingTabId = $state<string | null>(null);
  let editingTitle = $state('');

  const stats = $derived(getTextStats(currentTab.content));
  const renderedHtml = $derived(
    currentTab.language === 'markdown' ? renderMarkdown(currentTab.content) : ''
  );

  const LANGUAGES = [
    { id: 'markdown', label: 'Markdown (.md)' },
    { id: 'plaintext', label: 'Plain Text (.txt)' },
    { id: 'json', label: 'JSON (.json)' },
    { id: 'typescript', label: 'TypeScript (.ts)' },
    { id: 'javascript', label: 'JavaScript (.js)' },
    { id: 'swift', label: 'Swift (.swift)' },
    { id: 'objective-c', label: 'Objective-C (.m)' },
    { id: 'sql', label: 'SQL (.sql)' },
    { id: 'html', label: 'HTML (.html)' },
    { id: 'css', label: 'CSS (.css)' },
    { id: 'yaml', label: 'YAML (.yaml)' },
    { id: 'python', label: 'Python (.py)' },
    { id: 'shell', label: 'Shell (.sh)' },
  ];

  const EXTENSION_MAP: Record<string, string> = {
    markdown: 'md',
    plaintext: 'txt',
    json: 'json',
    typescript: 'ts',
    javascript: 'js',
    swift: 'swift',
    'objective-c': 'm',
    sql: 'sql',
    html: 'html',
    css: 'css',
    yaml: 'yaml',
    python: 'py',
    shell: 'sh',
  };

  function showStatus(text: string, type: 'success' | 'error' = 'success') {
    statusMessage = { text, type };
    setTimeout(() => {
      if (statusMessage?.text === text) {
        statusMessage = null;
      }
    }, 2800);
  }

  function handleContentChange(newVal: string) {
    const updated = tabs.map((t) => {
      if (t.id === currentTab.id) {
        return { ...t, content: newVal };
      }
      return t;
    });
    tabsState.value = updated;
  }

  function handleLanguageChange(newLang: string) {
    const updated = tabs.map((t) => {
      if (t.id === currentTab.id) {
        return { ...t, language: newLang };
      }
      return t;
    });
    tabsState.value = updated;
    if (newLang !== 'markdown' && viewMode === 'preview') {
      viewMode = 'edit';
    }
  }

  function createTab() {
    const newId = 'note-' + Date.now();
    const count = tabs.length + 1;
    const newTab: NoteTab = {
      id: newId,
      title: `Note ${count}`,
      content: '',
      language: 'markdown',
      createdAt: Date.now(),
    };
    tabsState.value = [...tabs, newTab];
    activeTabIdState.value = newId;
    viewMode = 'edit';
  }

  function closeTab(tabId: string, event: MouseEvent) {
    event.stopPropagation();
    if (tabs.length <= 1) {
      // Don't remove last tab, reset it
      tabsState.value = [
        {
          id: 'note-' + Date.now(),
          title: 'Scratchpad',
          content: '',
          language: 'markdown',
          createdAt: Date.now(),
        },
      ];
      activeTabIdState.value = tabsState.value[0].id;
      return;
    }

    const index = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);
    tabsState.value = newTabs;

    if (activeTabId === tabId) {
      const nextIndex = Math.max(0, index - 1);
      activeTabIdState.value = newTabs[nextIndex].id;
    }
  }

  function startRenaming(tab: NoteTab, event: MouseEvent) {
    event.stopPropagation();
    editingTabId = tab.id;
    editingTitle = tab.title;
  }

  function focusOnMount(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  function commitRename() {
    if (!editingTabId) return;
    const title = editingTitle.trim() || 'Untitled Note';
    tabsState.value = tabs.map((t) => (t.id === editingTabId ? { ...t, title } : t));
    editingTabId = null;
  }

  function applyTransform(fn: (text: string) => string, actionName: string) {
    try {
      const transformed = fn(currentTab.content);
      handleContentChange(transformed);
      showStatus(`Applied: ${actionName}`, 'success');
    } catch (err: any) {
      showStatus(err.message || `Failed to apply ${actionName}`, 'error');
    }
    transformMenuOpen = false;
  }

  function toggleWordWrap() {
    wordWrapState.value = wordWrap === 'on' ? 'off' : 'on';
  }

  function copyContent() {
    if (!currentTab.content) return;
    navigator.clipboard.writeText(currentTab.content);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  function downloadContent() {
    if (!currentTab.content) return;
    const ext = EXTENSION_MAP[currentTab.language] || 'txt';
    const cleanTitle = currentTab.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filename = `${cleanTitle || 'note'}.${ext}`;

    const blob = new Blob([currentTab.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function clearContent() {
    if (!currentTab.content) return;
    handleContentChange('');
    showStatus('Note cleared', 'success');
  }
</script>

<svelte:window onclick={() => (transformMenuOpen = false)} />

<div class="flex-1 flex flex-col h-full bg-background overflow-hidden select-text">
  <!-- Top Subtoolbar -->
  <div class="h-12 border-b border-outline-variant bg-surface flex items-center justify-between px-3 gap-2 shrink-0 select-none">
    <!-- Left: Tabs Row with Scroll -->
    <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 flex-1 min-w-0 pr-2">
      {#each tabs as tab (tab.id)}
        {@const isActive = tab.id === currentTab.id}
        <div
          class="group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all border shrink-0 {isActive
            ? 'bg-surface-container-high border-primary/40 text-primary font-semibold shadow-2xs'
            : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
        >
          {#if editingTabId === tab.id}
            <FileText size={13} class="text-primary shrink-0" />
            <input
              type="text"
              bind:value={editingTitle}
              onblur={commitRename}
              onkeydown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') editingTabId = null;
              }}
              class="w-24 px-1 py-0.5 text-xs bg-surface border border-primary rounded text-on-surface focus:outline-none"
              use:focusOnMount
            />
          {:else}
            <button
              onclick={() => (activeTabIdState.value = tab.id)}
              ondblclick={(e) => startRenaming(tab, e)}
              class="flex items-center gap-1.5 cursor-pointer max-w-[150px] text-left focus:outline-none"
              title="Click to select, double-click to rename"
            >
              <FileText size={13} class={isActive ? 'text-primary' : 'text-on-surface-variant/70'} />
              <span class="truncate">{tab.title}</span>
            </button>
          {/if}

          <!-- Close Tab Button -->
          <button
            onclick={(e) => closeTab(tab.id, e)}
            class="p-0.5 rounded-sm hover:bg-outline-variant/30 text-on-surface-variant/60 hover:text-on-surface transition-colors cursor-pointer opacity-0 group-hover:opacity-100 {isActive
              ? 'opacity-80'
              : ''}"
            title="Close note"
          >
            <X size={12} />
          </button>
        </div>
      {/each}

      <!-- New Tab Button -->
      <button
        onclick={createTab}
        class="h-7 flex items-center gap-1 px-2 rounded-md text-xs font-mono border border-dashed border-outline-variant hover:border-primary/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
        title="Create new note"
      >
        <Plus size={13} />
        <span class="hidden sm:inline">New</span>
      </button>
    </div>

    <!-- Right Controls: Language Selector, Edit/Preview, Transforms, Wrap, Copy, Download -->
    <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">
      <!-- Language Selector -->
      <select
        value={currentTab.language}
        onchange={(e) => handleLanguageChange((e.target as HTMLSelectElement).value)}
        class="h-7 bg-surface-container border border-outline-variant hover:border-outline text-on-surface rounded-md px-2 text-xs font-mono focus:outline-none focus:border-primary cursor-pointer leading-none"
        title="Select syntax language"
      >
        {#each LANGUAGES as lang}
          <option value={lang.id} class="bg-surface text-on-surface">
            {lang.label}
          </option>
        {/each}
      </select>

      <!-- Markdown Preview Toggle (Only shown for markdown mode) -->
      {#if currentTab.language === 'markdown'}
        <div class="h-7 flex items-center bg-surface-container border border-outline-variant rounded-md p-0.5">
          <button
            onclick={() => (viewMode = 'edit')}
            class="h-full flex items-center gap-1 px-2 rounded text-xs font-mono transition-all cursor-pointer {viewMode === 'edit'
              ? 'bg-surface text-primary font-semibold shadow-2xs'
              : 'text-on-surface-variant hover:text-on-surface'}"
            title="Edit markdown"
          >
            <Edit3 size={12} />
            <span class="hidden md:inline">Edit</span>
          </button>
          <button
            onclick={() => (viewMode = 'preview')}
            class="h-full flex items-center gap-1 px-2 rounded text-xs font-mono transition-all cursor-pointer {viewMode === 'preview'
              ? 'bg-surface text-primary font-semibold shadow-2xs'
              : 'text-on-surface-variant hover:text-on-surface'}"
            title="Preview formatted markdown"
          >
            <Eye size={12} />
            <span class="hidden md:inline">Preview</span>
          </button>
        </div>
      {/if}

      <!-- Transform Tools Dropdown -->
      <div class="relative">
        <button
          onclick={(e) => {
            e.stopPropagation();
            transformMenuOpen = !transformMenuOpen;
          }}
          class="h-7 flex items-center gap-1 px-2 sm:px-2.5 rounded-md border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface text-xs font-mono transition-colors cursor-pointer"
          title="Developer text transformations"
        >
          <Wand2 size={13} />
          <span class="hidden lg:inline">Transform</span>
          <ChevronDown size={12} />
        </button>

        {#if transformMenuOpen}
          <div
            role="menu"
            tabindex="-1"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
            class="absolute right-0 mt-1.5 w-56 rounded-lg bg-surface border border-outline-variant shadow-xl py-1.5 z-50 text-xs font-mono max-h-96 overflow-y-auto"
          >
            <!-- Case section -->
            <div class="px-3 py-1 text-[10px] uppercase font-bold text-outline tracking-wider">
              Change Case
            </div>
            <button
              onclick={() => applyTransform(toUpperCase, 'UPPERCASE')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer flex items-center justify-between"
            >
              <span>UPPERCASE</span>
              <span class="text-[10px] text-outline">HELLO WORLD</span>
            </button>
            <button
              onclick={() => applyTransform(toLowerCase, 'lowercase')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer flex items-center justify-between"
            >
              <span>lowercase</span>
              <span class="text-[10px] text-outline">hello world</span>
            </button>
            <button
              onclick={() => applyTransform(toTitleCase, 'Title Case')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer flex items-center justify-between"
            >
              <span>Title Case</span>
              <span class="text-[10px] text-outline">Hello World</span>
            </button>
            <button
              onclick={() => applyTransform(toCamelCase, 'camelCase')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer flex items-center justify-between"
            >
              <span>camelCase</span>
              <span class="text-[10px] text-outline">helloWorld</span>
            </button>
            <button
              onclick={() => applyTransform(toSnakeCase, 'snake_case')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer flex items-center justify-between"
            >
              <span>snake_case</span>
              <span class="text-[10px] text-outline">hello_world</span>
            </button>
            <button
              onclick={() => applyTransform(toKebabCase, 'kebab-case')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer flex items-center justify-between"
            >
              <span>kebab-case</span>
              <span class="text-[10px] text-outline">hello-world</span>
            </button>

            <!-- Line tools section -->
            <div class="border-t border-outline-variant/60 my-1 pt-1 px-3 py-1 text-[10px] uppercase font-bold text-outline tracking-wider">
              Line Utilities
            </div>
            <button
              onclick={() => applyTransform(sortLinesAsc, 'Sort Lines (A-Z)')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer"
            >
              Sort Lines (A → Z)
            </button>
            <button
              onclick={() => applyTransform(sortLinesDesc, 'Sort Lines (Z-A)')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer"
            >
              Sort Lines (Z → A)
            </button>
            <button
              onclick={() => applyTransform(removeDuplicateLines, 'Deduplicate Lines')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer"
            >
              Remove Duplicate Lines
            </button>
            <button
              onclick={() => applyTransform(stripEmptyLines, 'Strip Empty Lines')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer"
            >
              Strip Empty Lines
            </button>
            <button
              onclick={() => applyTransform(trimWhitespace, 'Trim Lines')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer"
            >
              Trim Leading/Trailing Space
            </button>
            <button
              onclick={() => applyTransform(reverseLines, 'Reverse Lines')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer"
            >
              Reverse Line Order
            </button>

            <!-- Encoding section -->
            <div class="border-t border-outline-variant/60 my-1 pt-1 px-3 py-1 text-[10px] uppercase font-bold text-outline tracking-wider">
              Encoding & Decoding
            </div>
            <button
              onclick={() => applyTransform(base64Encode, 'Base64 Encode')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer"
            >
              Base64 Encode
            </button>
            <button
              onclick={() => applyTransform(base64Decode, 'Base64 Decode')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer"
            >
              Base64 Decode
            </button>
            <button
              onclick={() => applyTransform(urlEncode, 'URL Encode')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer"
            >
              URL Encode
            </button>
            <button
              onclick={() => applyTransform(urlDecode, 'URL Decode')}
              class="w-full text-left px-3 py-1.5 hover:bg-surface-container text-on-surface cursor-pointer"
            >
              URL Decode
            </button>
          </div>
        {/if}
      </div>

      <!-- Word Wrap Toggle -->
      <button
        onclick={toggleWordWrap}
        class="h-7 flex items-center gap-1 px-2 sm:px-2.5 rounded-md border border-outline-variant hover:bg-surface-container text-xs font-mono transition-colors cursor-pointer {wordWrap === 'on'
          ? 'text-primary border-primary/30 bg-primary/5'
          : 'text-on-surface-variant'}"
        title="Toggle word wrap ({wordWrap})"
      >
        <WrapText size={13} />
        <span class="hidden xl:inline">Wrap</span>
      </button>

      <!-- Copy Button -->
      <button
        onclick={copyContent}
        class="h-7 flex items-center gap-1 px-2 sm:px-2.5 rounded-md border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface text-xs font-mono transition-colors cursor-pointer"
        title="Copy note content"
      >
        {#if copied}
          <Check size={13} class="text-emerald-500" />
          <span class="hidden sm:inline text-emerald-500">Copied</span>
        {:else}
          <Copy size={13} />
          <span class="hidden sm:inline">Copy</span>
        {/if}
      </button>

      <!-- Download Button -->
      <button
        onclick={downloadContent}
        class="h-7 flex items-center gap-1 px-2 sm:px-2.5 rounded-md border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface text-xs font-mono transition-colors cursor-pointer"
        title="Download note file"
      >
        <Download size={13} />
        <span class="hidden sm:inline">Export</span>
      </button>

      <!-- Clear Button -->
      <button
        onclick={clearContent}
        class="h-7 w-7 flex items-center justify-center rounded-md border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-rose-500 transition-colors cursor-pointer"
        title="Clear note content"
      >
        <Trash2 size={13} />
      </button>
    </div>
  </div>

  <!-- Status Notification Banner (Optional feedback) -->
  {#if statusMessage}
    <div
      class="px-4 py-1.5 text-xs font-mono flex items-center justify-between border-b {statusMessage.type === 'error'
        ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'}"
    >
      <div class="flex items-center gap-2">
        {#if statusMessage.type === 'error'}
          <AlertCircle size={13} />
        {:else}
          <CheckCircle2 size={13} />
        {/if}
        <span>{statusMessage.text}</span>
      </div>
      <button onclick={() => (statusMessage = null)} class="p-0.5 hover:opacity-70 cursor-pointer">
        <X size={12} />
      </button>
    </div>
  {/if}

  <!-- Main View Area: Monaco Editor or Markdown Preview -->
  <div class="flex-1 min-h-0 relative overflow-hidden bg-background">
    {#if viewMode === 'preview' && currentTab.language === 'markdown'}
      <div class="w-full h-full overflow-y-auto px-6 py-8 max-w-4xl mx-auto font-sans leading-relaxed selection:bg-primary/20">
        {@html renderedHtml}
      </div>
    {:else}
      {#key currentTab.id}
        <div
          class="w-full h-full"
          use:useMonacoEditor={{
            value: currentTab.content,
            language: currentTab.language,
            theme: theme,
            wordWrap: wordWrap,
            onChange: handleContentChange,
          }}
        ></div>
      {/key}
    {/if}
  </div>

  <!-- Bottom Status Bar -->
  <div class="border-t border-outline-variant bg-surface px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-on-surface-variant shrink-0 select-none">
    <!-- Left: Auto-save status -->
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
      <span class="text-on-surface-variant font-medium">Saved</span>
      <span class="text-outline">/</span>
      <span class="text-on-surface-variant uppercase">{currentTab.language}</span>
    </div>

    <!-- Right: Metrics -->
    <div class="flex items-center gap-3 sm:gap-5 text-on-surface-variant">
      <span>{stats.lines} {stats.lines === 1 ? 'line' : 'lines'}</span>
      <span>{stats.words} {stats.words === 1 ? 'word' : 'words'}</span>
      <span>{stats.chars} chars</span>
      <span class="hidden sm:inline">{stats.bytes} bytes</span>
      <span class="hidden md:inline">{stats.readingTime}</span>
    </div>
  </div>
</div>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
