<script lang="ts">
  import { useMonacoEditor } from '../actions/useMonacoEditor';
  import { useMermaidRender } from '../actions/useMermaidRender';
  import { usePanZoom, type PanZoomController } from '../actions/usePanZoom';
  import SplitPane from '../components/SplitPane.svelte';
  import { SAMPLES } from '../utils/samples';
  import { createPersistedState } from '../utils/storage.svelte';
  import { downloadSvg, downloadPng } from '../utils/export';
  import {
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Maximize,
    Download,
    AlertTriangle,
    Image as ImageIcon,
    FileCode,
    SlidersHorizontal,
    Sparkles,
    Palette,
    Copy,
    Check,
  } from '@lucide/svelte';
  import type { ColorScheme, ThemeMode } from '../types';

  let {
    theme = 'dark',
    scheme = 'default',
    monacoTheme = 'devtools-dark',
  }: {
    theme?: ThemeMode;
    scheme?: ColorScheme;
    monacoTheme?: string;
  } = $props();

  let activeTab = $state<'code' | 'config'>('code');

  // Persistent code draft
  const mermaidDraft = createPersistedState('devtools_mermaid_draft', SAMPLES.mermaidFlowchart);
  let mermaidCode = $state(mermaidDraft.value);

  $effect(() => {
    mermaidDraft.value = mermaidCode;
  });

  // Persistent config draft
  const DEFAULT_CONFIG = JSON.stringify(
    {
      theme: 'auto',
    },
    null,
    2
  );

  const mermaidConfigDraft = createPersistedState('devtools_mermaid_config', DEFAULT_CONFIG);
  let mermaidConfig = $state(mermaidConfigDraft.value);

  $effect(() => {
    mermaidConfigDraft.value = mermaidConfig;
  });

  // Validate JSON config
  let isConfigValid = $state(true);
  $effect(() => {
    if (!mermaidConfig.trim()) {
      isConfigValid = true;
      return;
    }
    try {
      JSON.parse(mermaidConfig);
      isConfigValid = true;
    } catch {
      isConfigValid = false;
    }
  });

  // Detect whether custom theme is light (so dark mode displays a clear contrast card)
  const isLightThemeConfig = $derived.by(() => {
    try {
      if (!mermaidConfig.trim()) return false;
      const parsed = JSON.parse(mermaidConfig);
      const t = parsed?.theme;
      return t === 'default' || t === 'forest' || t === 'neutral';
    } catch {
      return false;
    }
  });

  // Watch document class for dark/light theme
  let isDark = $state(document.documentElement.classList.contains('dark'));
  let currentTheme = $derived(isDark ? 'devtools-dark' : 'devtools-light');

  const observer = new MutationObserver(() => {
    isDark = document.documentElement.classList.contains('dark');
  });
  if (typeof document !== 'undefined') {
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  // Live render state & errors
  let parseError = $state<string | null>(null);
  let svgElement = $state<SVGSVGElement | null>(null);
  let panZoomCtrl = $state<PanZoomController | null>(null);
  let copied = $state(false);
  let hasAutoFit = false;

  // Diagram presets
  const presets = [
    { label: 'Flowchart', code: SAMPLES.mermaidFlowchart },
    { label: 'Sequence Diagram', code: SAMPLES.mermaidSequence },
    { label: 'Architecture & Cloud', code: SAMPLES.mermaidArchitecture },
    { label: 'Entity Relationship (ERD)', code: SAMPLES.mermaidERD },
  ];

  // Theme & Config presets (popular themes from mermaid.live)
  const themePresets = [
    { label: 'Sync App', config: JSON.stringify({ theme: 'auto' }, null, 2) },
    { label: 'Dark', config: JSON.stringify({ theme: 'dark' }, null, 2) },
    { label: 'Default', config: JSON.stringify({ theme: 'default' }, null, 2) },
    { label: 'Neutral', config: JSON.stringify({ theme: 'neutral' }, null, 2) },
    { label: 'Forest', config: JSON.stringify({ theme: 'forest' }, null, 2) },
    {
      label: 'Base (Custom)',
      config: JSON.stringify(
        {
          theme: 'base',
          themeVariables: {
            primaryColor: '#6366f1',
            primaryTextColor: '#ffffff',
            lineColor: '#818cf8',
          },
        },
        null,
        2
      ),
    },
    { label: 'Hand-Drawn', config: JSON.stringify({ theme: 'default', look: 'handDrawn' }, null, 2) },
  ];

  function setPreset(code: string) {
    mermaidCode = code;
    setTimeout(() => {
      panZoomCtrl?.fitToScreen();
    }, 150);
  }

  function handleExportSvg() {
    try {
      if (!svgElement || parseError) return;
      downloadSvg(svgElement, 'diagram.svg');
    } catch (err) {
      console.warn('Export SVG failed:', err);
    }
  }

  function handleExportPng() {
    try {
      if (!svgElement || parseError) return;
      downloadPng(svgElement, 'diagram.png', 2, isDark ? '#121215' : '#ffffff');
    } catch (err) {
      console.warn('Export PNG failed:', err);
    }
  }

  function handleCopy() {
    const textToCopy = activeTab === 'code' ? mermaidCode : mermaidConfig;
    navigator.clipboard.writeText(textToCopy);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="flex-1 flex flex-col h-full bg-background overflow-hidden">
  <!-- Top Toolbar -->
  <div class="h-12 border-b border-outline-variant bg-surface px-4 flex items-center justify-between gap-3 shrink-0 font-mono text-xs">
    <!-- Presets bar: switches based on active tab -->
    <div class="flex items-center gap-3">
      {#if activeTab === 'code'}
        <div class="flex items-center gap-1.5 text-on-surface-variant">
          <Sparkles size={13} class="text-primary dark:text-indigo-400" />
          <span class="font-medium">Diagrams:</span>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          {#each presets as preset}
            <button
              onclick={() => setPreset(preset.code)}
              class="px-2 py-0.5 rounded border border-outline-variant bg-surface-container hover:bg-surface-container-high text-[11px] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          {/each}
        </div>
      {:else}
        <div class="flex items-center gap-1.5 text-on-surface-variant">
          <Palette size={13} class="text-primary dark:text-indigo-400" />
          <span class="font-medium">Theme Presets:</span>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          {#each themePresets as preset}
            <button
              onclick={() => (mermaidConfig = preset.config)}
              class="px-2 py-0.5 rounded border border-outline-variant bg-surface-container hover:bg-surface-container-high text-[11px] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Right Controls: Copy, SVG/PNG Export -->
    <div class="flex items-center gap-2">
      <button
        onclick={handleCopy}
        class="flex items-center gap-1 px-2.5 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title={activeTab === 'code' ? 'Copy Mermaid Code' : 'Copy Config JSON'}
      >
        {#if copied}
          <Check size={12} class="text-secondary" />
          <span>Copied!</span>
        {:else}
          <Copy size={12} />
          <span>{activeTab === 'code' ? 'Copy Code' : 'Copy Config'}</span>
        {/if}
      </button>

      <div class="h-4 w-px bg-outline-variant"></div>

      <!-- Export SVG -->
      <button
        onclick={handleExportSvg}
        disabled={!svgElement || !!parseError}
        class="flex items-center gap-1 px-2.5 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <FileCode size={13} />
        <span>SVG</span>
      </button>

      <!-- Export PNG -->
      <button
        onclick={handleExportPng}
        disabled={!svgElement || !!parseError}
        class="flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-white hover:bg-primary/90 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <ImageIcon size={13} />
        <span>PNG</span>
      </button>
    </div>
  </div>

  <!-- Main Split Editor & Preview Area with Draggable Splitter -->
  <SplitPane storageKey="devtools_mermaid_split" defaultSplit={42}>
    {#snippet left()}
      <div class="w-full h-full flex flex-col relative bg-surface overflow-hidden border-b md:border-b-0">
        <!-- Tab Header -->
        <div class="h-8 px-2 border-b border-outline-variant bg-surface-container-low flex items-center justify-between text-[11px] font-mono shrink-0">
          <!-- Segmented Tab Toggle: Code | Config -->
          <div class="flex items-center gap-1 bg-surface-container/60 p-0.5 rounded-md border border-outline-variant/60">
            <button
              onclick={() => (activeTab = 'code')}
              class="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] transition-all cursor-pointer {activeTab === 'code'
                ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'}"
            >
              <FileCode size={12} />
              <span>Code</span>
            </button>

            <button
              onclick={() => (activeTab = 'config')}
              class="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] transition-all cursor-pointer relative {activeTab === 'config'
                ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'}"
            >
              <SlidersHorizontal size={12} />
              <span>Config</span>
              {#if !isConfigValid}
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5"></span>
              {/if}
            </button>
          </div>

          <span class="text-outline text-[10px] pr-2">
            {activeTab === 'code' ? 'MERMAID DSL' : isConfigValid ? 'JSON CONFIG (VALID)' : 'JSON CONFIG (SYNTAX WARNING)'}
          </span>
        </div>

        <!-- Editor Content Area -->
        <div class="flex-1 w-full h-full relative overflow-hidden">
          <!-- Code Tab Monaco Editor -->
          <div class="w-full h-full {activeTab === 'code' ? 'block' : 'hidden'}">
            <div
              class="w-full h-full"
              use:useMonacoEditor={{
                value: mermaidCode,
                language: 'mermaid',
                theme: monacoTheme,
                onChange: (val) => (mermaidCode = val),
              }}
            ></div>
          </div>

          <!-- Config Tab Monaco Editor -->
          <div class="w-full h-full {activeTab === 'config' ? 'flex flex-col' : 'hidden'}">
            {#if !isConfigValid}
              <div class="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-mono flex items-center gap-1.5 shrink-0">
                <AlertTriangle size={12} class="shrink-0" />
                <span>Invalid JSON syntax. Last valid configuration remains active.</span>
              </div>
            {/if}
            <div
              class="flex-1 w-full h-full"
              use:useMonacoEditor={{
                value: mermaidConfig,
                language: 'json',
                theme: monacoTheme,
                onChange: (val) => (mermaidConfig = val),
              }}
            ></div>
          </div>
        </div>
      </div>
    {/snippet}

    {#snippet right()}
      <div class="w-full h-full flex flex-col relative bg-background overflow-hidden">
        <!-- Diagram Viewport Header & Zoom Controls -->
        <div class="h-8 px-4 border-b border-outline-variant bg-surface flex items-center justify-between text-[11px] font-mono shrink-0">
          <span class="text-outline">DIAGRAM PREVIEW</span>

          <!-- Pan / Zoom Controls -->
          <div class="flex items-center gap-1 text-on-surface-variant">
            <button
              onclick={() => panZoomCtrl?.zoomIn()}
              class="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onclick={() => panZoomCtrl?.zoomOut()}
              class="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onclick={() => panZoomCtrl?.fitToScreen()}
              class="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Fit to Screen"
            >
              <Maximize size={14} />
            </button>
            <button
              onclick={() => panZoomCtrl?.reset()}
              class="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Reset View"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        <!-- Live Syntax Error Banner -->
        {#if parseError}
          <div class="absolute top-8 inset-x-0 z-30 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs font-mono text-amber-600 dark:text-amber-400 flex items-start gap-2 backdrop-blur-xs">
            <AlertTriangle size={15} class="shrink-0 mt-0.5" />
            <div class="overflow-hidden">
              <span class="font-semibold mr-1">Mermaid Syntax Warning:</span>
              <span class="truncate block">{parseError}</span>
            </div>
          </div>
        {/if}

        <!-- SVG Container with Pan & Zoom -->
        <div
          class="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center select-none"
          use:usePanZoom={{
            onRegister: (ctrl) => (panZoomCtrl = ctrl),
          }}
        >
          <!-- The SVG Canvas target manipulated by panzoom -->
          <div
            class="transition-opacity duration-200 flex items-center justify-center rounded-lg p-3 pointer-events-auto {isDark && isLightThemeConfig
              ? 'bg-white text-zinc-900 shadow-md'
              : isDark
                ? 'bg-zinc-900/60 shadow-inner'
                : 'bg-white shadow-xs'}"
            use:useMermaidRender={{
              code: mermaidCode,
              config: mermaidConfig,
              scheme: scheme,
              theme: theme,
              onError: (err) => {
                parseError = err ? err.message : null;
              },
              onSuccess: (node) => {
                svgElement = node;
                if (!hasAutoFit) {
                  hasAutoFit = true;
                  setTimeout(() => panZoomCtrl?.fitToScreen(), 60);
                }
              },
            }}
          ></div>
        </div>

        <!-- Hint watermark -->
        <div class="absolute bottom-2 right-3 pointer-events-none text-[10px] font-mono text-outline/60">
          Drag to pan • Scroll to zoom
        </div>
      </div>
    {/snippet}
  </SplitPane>
</div>
