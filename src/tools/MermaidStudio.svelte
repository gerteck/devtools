<script lang="ts">
  import { useMonacoEditor } from '../actions/useMonacoEditor';
  import { useMermaidRender } from '../actions/useMermaidRender';
  import { usePanZoom, type PanZoomController } from '../actions/usePanZoom';
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
    Sparkles,
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

  // Persistent draft
  const mermaidDraft = createPersistedState('devtools_mermaid_draft', SAMPLES.mermaidFlowchart);
  let mermaidCode = $state(mermaidDraft.value);

  $effect(() => {
    mermaidDraft.value = mermaidCode;
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

  // Preset selector
  const presets = [
    { label: 'Flowchart', code: SAMPLES.mermaidFlowchart },
    { label: 'Sequence Diagram', code: SAMPLES.mermaidSequence },
    { label: 'Architecture & Cloud', code: SAMPLES.mermaidArchitecture },
    { label: 'Entity Relationship (ERD)', code: SAMPLES.mermaidERD },
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

  function handleCopyCode() {
    navigator.clipboard.writeText(mermaidCode);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="flex-1 flex flex-col h-full bg-background overflow-hidden">
  <!-- Top Toolbar -->
  <div class="h-12 border-b border-outline-variant bg-surface px-4 flex items-center justify-between gap-3 shrink-0 font-mono text-xs">
    <!-- Presets Dropdown & Quick Copy -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5 text-on-surface-variant">
        <Sparkles size={13} class="text-primary dark:text-indigo-400" />
        <span class="font-medium">Presets:</span>
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
    </div>

    <!-- Right Controls: Code Copy, SVG/PNG Export -->
    <div class="flex items-center gap-2">
      <button
        onclick={handleCopyCode}
        class="flex items-center gap-1 px-2.5 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title="Copy Mermaid Code"
      >
        {#if copied}
          <Check size={12} class="text-secondary" />
          <span>Copied!</span>
        {:else}
          <Copy size={12} />
          <span>Copy Code</span>
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

  <!-- Main Split Editor & Preview Area -->
  <div class="flex-1 flex flex-col md:flex-row min-h-0 relative overflow-hidden">
    <!-- Left Pane: Monaco Mermaid Editor -->
    <div class="w-full md:w-5/12 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-outline-variant flex flex-col relative bg-surface">
      <div class="h-7 px-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between text-[11px] font-mono text-outline shrink-0">
        <span>MERMAID DSL</span>
        <span>UTF-8</span>
      </div>

      <div
        class="flex-1 w-full h-full"
        use:useMonacoEditor={{
          value: mermaidCode,
          language: 'mermaid',
          theme: monacoTheme,
          onChange: (val) => (mermaidCode = val),
        }}
      ></div>
    </div>

    <!-- Right Pane: Live Diagram Render & Viewport -->
    <div class="w-full md:w-7/12 h-1/2 md:h-full flex flex-col relative bg-background overflow-hidden">
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
        class="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center p-4 select-none"
        use:usePanZoom={{
          onRegister: (ctrl) => (panZoomCtrl = ctrl),
        }}
      >
        <!-- The SVG Canvas target manipulated by panzoom -->
        <div
          class="w-full h-full flex items-center justify-center pointer-events-auto"
          use:useMermaidRender={{
            code: mermaidCode,
            scheme: scheme,
            theme: theme,
            onError: (err) => {
              parseError = err ? err.message : null;
            },
            onSuccess: (node) => {
              svgElement = node;
            },
          }}
        ></div>
      </div>

      <!-- Hint watermark -->
      <div class="absolute bottom-2 right-3 pointer-events-none text-[10px] font-mono text-outline/60">
        Drag to pan • Scroll to zoom
      </div>
    </div>
  </div>
</div>
