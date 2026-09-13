<script lang="ts">
  import { useMonacoEditor } from '../actions/useMonacoEditor';
  import { usePanZoom, type PanZoomController } from '../actions/usePanZoom';
  import SplitPane from '../components/SplitPane.svelte';
  import { SAMPLES } from '../utils/samples';
  import { createPersistedState } from '../utils/storage.svelte';
  import { downloadSvg, downloadPng } from '../utils/export';
  import plantumlEncoder from 'plantuml-encoder';
  import {
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Maximize,
    FileCode,
    Image as ImageIcon,
    Sparkles,
    Copy,
    Check,
    AlertTriangle,
    Loader2,
    Server,
    Undo2,
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

  const DEFAULT_SERVER = 'https://www.plantuml.com/plantuml/svg/';

  // Persistent drafts & settings
  const plantumlDraft = createPersistedState('devtools_plantuml_draft', SAMPLES.plantumlSequence);
  let plantumlCode = $state(plantumlDraft.value);

  const serverSetting = createPersistedState('devtools_plantuml_server', DEFAULT_SERVER);
  let serverUrl = $state(serverSetting.value);
  let showServerModal = $state(false);

  $effect(() => {
    plantumlDraft.value = plantumlCode;
  });

  $effect(() => {
    serverSetting.value = serverUrl;
  });

  // Watch document dark mode
  let isDark = $state(
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true
  );

  if (typeof document !== 'undefined') {
    const observer = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains('dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  // Live rendering state
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);
  let hasSyntaxWarning = $state(false);
  let syntaxWarningDetail = $state<string | null>(null);
  let svgContainerRef: HTMLDivElement | null = null;
  let svgElement = $state<SVGSVGElement | null>(null);
  let panZoomCtrl = $state<PanZoomController | null>(null);
  let copied = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  let activeAbortController: AbortController | null = null;
  let renderRequestSeq = 0;

  // Preset selector
  const presets = [
    { label: 'Sequence', code: SAMPLES.plantumlSequence },
    { label: 'Use Case', code: SAMPLES.plantumlUseCase },
    { label: 'Component', code: SAMPLES.plantumlComponent },
    { label: 'Class', code: SAMPLES.plantumlClass },
  ];

  function setPreset(code: string) {
    plantumlCode = code;
    setTimeout(() => {
      panZoomCtrl?.fitToScreen();
    }, 300);
  }

  async function renderDiagram(code: string) {
    if (!code.trim()) {
      if (svgContainerRef) svgContainerRef.innerHTML = '';
      svgElement = null;
      errorMessage = null;
      hasSyntaxWarning = false;
      syntaxWarningDetail = null;
      return;
    }

    if (activeAbortController) {
      activeAbortController.abort();
    }
    activeAbortController = new AbortController();
    const currentSeq = ++renderRequestSeq;
    const signal = activeAbortController.signal;

    isLoading = true;
    errorMessage = null;

    try {
      let encoded = '';
      try {
        encoded = plantumlEncoder.encode(code);
      } catch (encodeErr) {
        throw new Error('Diagram encoding failed. Check for unsupported characters.');
      }

      const base = serverUrl.trim().endsWith('/') ? serverUrl.trim() : `${serverUrl.trim()}/`;
      const targetUrl = `${base}${encoded}`;

      const response = await fetch(targetUrl, { signal });
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const svgText = await response.text();

      // Discard response if a newer request was dispatched
      if (currentSeq !== renderRequestSeq) return;

      if (!svgText.includes('<svg')) {
        throw new Error('Server returned invalid non-SVG payload.');
      }

      // Check if PlantUML embedded a syntax error in the SVG
      const lower = svgText.toLowerCase();
      const isError = lower.includes('syntax error') || lower.includes('[plantuml-src]');
      hasSyntaxWarning = isError;

      if (isError) {
        const lineMatch = svgText.match(/line\s+(\d+)/i);
        syntaxWarningDetail = lineMatch ? `Error around line ${lineMatch[1]}` : 'Syntax issue detected';
      } else {
        syntaxWarningDetail = null;
      }

      if (svgContainerRef) {
        svgContainerRef.innerHTML = svgText;
        const svg = svgContainerRef.querySelector('svg');
        if (svg) {
          svgElement = svg;
          svg.style.maxWidth = '100%';
          svg.style.height = 'auto';
          svg.style.display = 'block';
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      if (currentSeq !== renderRequestSeq) return;

      console.warn('PlantUML render error:', err);
      errorMessage =
        err instanceof Error ? err.message : 'Failed to connect to PlantUML server.';
    } finally {
      if (currentSeq === renderRequestSeq) {
        isLoading = false;
      }
    }
  }

  // Debounced auto-render on code or server change
  $effect(() => {
    const code = plantumlCode;
    const sUrl = serverUrl;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderDiagram(code);
    }, 450);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  });

  function handleExportSvg() {
    try {
      if (!svgElement || hasSyntaxWarning) return;
      downloadSvg(svgElement, 'plantuml-diagram.svg');
    } catch (err) {
      console.warn('PlantUML export SVG failed:', err);
    }
  }

  function handleExportPng() {
    try {
      if (!svgElement || hasSyntaxWarning) return;
      downloadPng(svgElement, 'plantuml-diagram.png', 2, isDark ? '#121215' : '#ffffff');
    } catch (err) {
      console.warn('PlantUML export PNG failed:', err);
    }
  }

  function handleCopyCode() {
    try {
      navigator.clipboard.writeText(plantumlCode);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      // Fallback
    }
  }

  function resetServer() {
    serverUrl = DEFAULT_SERVER;
  }
</script>

<div class="flex-1 flex flex-col h-full bg-background overflow-hidden">
  <!-- Top Toolbar -->
  <div class="h-12 border-b border-outline-variant bg-surface px-4 flex items-center justify-between gap-3 shrink-0 font-mono text-xs">
    <!-- Left: Presets & Server config -->
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

      <div class="h-4 w-px bg-outline-variant hidden sm:block"></div>

      <!-- Server Settings Trigger -->
      <button
        onclick={() => (showServerModal = !showServerModal)}
        class="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant bg-surface-container hover:bg-surface-container-high text-[11px] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title="Configure PlantUML Server Endpoint"
      >
        <Server size={12} class="text-primary dark:text-indigo-400" />
        <span>Server</span>
      </button>
    </div>

    <!-- Right Controls: Status, Code Copy, SVG/PNG Export -->
    <div class="flex items-center gap-2">
      <!-- In-flight Loading Spinner -->
      {#if isLoading}
        <div class="flex items-center gap-1 px-2 py-0.5 text-on-surface-variant text-[11px]">
          <Loader2 size={12} class="animate-spin text-primary dark:text-indigo-400" />
          <span class="hidden sm:inline">Rendering...</span>
        </div>
      {/if}

      <button
        onclick={handleCopyCode}
        class="flex items-center gap-1 px-2.5 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title="Copy PlantUML DSL Code"
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
        disabled={!svgElement || isLoading || hasSyntaxWarning}
        class="flex items-center gap-1 px-2.5 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <FileCode size={13} />
        <span>SVG</span>
      </button>

      <!-- Export PNG -->
      <button
        onclick={handleExportPng}
        disabled={!svgElement || isLoading || hasSyntaxWarning}
        class="flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-white hover:bg-primary/90 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <ImageIcon size={13} />
        <span>PNG</span>
      </button>
    </div>
  </div>

  <!-- Server Config Popover / Settings Drawer -->
  {#if showServerModal}
    <div class="bg-surface-container-low border-b border-outline-variant px-4 py-2.5 flex items-center justify-between gap-4 font-mono text-xs z-30">
      <div class="flex items-center gap-2 flex-1 max-w-2xl">
        <Server size={14} class="text-primary dark:text-indigo-400 shrink-0" />
        <span class="font-medium shrink-0">Render Server:</span>
        <input
          type="text"
          bind:value={serverUrl}
          placeholder="https://www.plantuml.com/plantuml/svg/"
          class="flex-1 bg-surface border border-outline-variant rounded px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-primary"
        />
        <button
          onclick={resetServer}
          class="flex items-center gap-1 px-2 py-1 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer shrink-0"
          title="Reset to default cloud server"
        >
          <Undo2 size={12} />
          <span>Reset</span>
        </button>
      </div>

      <button
        onclick={() => (showServerModal = false)}
        class="px-2 py-1 rounded bg-surface border border-outline-variant hover:bg-surface-container text-on-surface transition-colors cursor-pointer text-xs"
      >
        Done
      </button>
    </div>
  {/if}

  <!-- Main Split Editor & Preview Area with Draggable Splitter -->
  <SplitPane storageKey="devtools_plantuml_split" defaultSplit={42}>
    {#snippet left()}
      <div class="w-full h-full flex flex-col relative bg-surface overflow-hidden border-b md:border-b-0">
        <div class="h-7 px-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between text-[11px] font-mono text-outline shrink-0">
          <span>PLANTUML DSL (@startuml)</span>
          <span>UTF-8</span>
        </div>

        <div
          class="flex-1 w-full h-full"
          use:useMonacoEditor={{
            value: plantumlCode,
            language: 'plantuml',
            theme: monacoTheme,
            onChange: (val) => (plantumlCode = val),
          }}
        ></div>
      </div>
    {/snippet}

    {#snippet right()}
      <div class="w-full h-full flex flex-col relative bg-background overflow-hidden">
        <!-- Diagram Viewport Header & Zoom Controls -->
        <div class="h-8 px-4 border-b border-outline-variant bg-surface flex items-center justify-between text-[11px] font-mono shrink-0">
          <div class="flex items-center gap-2">
            <span class="text-outline">DIAGRAM PREVIEW</span>
            {#if serverUrl !== DEFAULT_SERVER}
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                Custom Server
              </span>
            {/if}
          </div>

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

        <!-- Live Error / Warning Banners -->
        {#if errorMessage}
          <div class="absolute top-8 inset-x-0 z-30 bg-red-500/10 border-b border-red-500/30 px-4 py-2 text-xs font-mono text-red-600 dark:text-red-400 flex items-center justify-between gap-2 backdrop-blur-xs">
            <div class="flex items-center gap-2 overflow-hidden">
              <AlertTriangle size={15} class="shrink-0" />
              <span class="font-semibold shrink-0">Render Error:</span>
              <span class="truncate">{errorMessage}</span>
            </div>
            <button
              onclick={() => renderDiagram(plantumlCode)}
              class="px-2 py-0.5 rounded border border-red-500/30 hover:bg-red-500/20 text-[11px] font-medium transition-colors shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        {:else if hasSyntaxWarning}
          <div class="absolute top-8 inset-x-0 z-30 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs font-mono text-amber-600 dark:text-amber-400 flex items-start gap-2 backdrop-blur-xs">
            <AlertTriangle size={15} class="shrink-0 mt-0.5" />
            <div class="overflow-hidden">
              <span class="font-semibold mr-1">Syntax Issue:</span>
              <span>{syntaxWarningDetail ? `${syntaxWarningDetail}. Review the red markers in the preview diagram.` : 'PlantUML reported a syntax issue in the diagram. Review the red markers in the preview.'}</span>
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
          <!-- The target manipulated by panzoom -->
          <div class="w-full h-full flex items-center justify-center pointer-events-auto">
            <div
              bind:this={svgContainerRef}
              class="transition-opacity duration-200 flex items-center justify-center rounded-lg p-2 {isDark ? 'bg-zinc-900/50 shadow-inner' : 'bg-white shadow-xs'}"
              class:opacity-50={isLoading}
            ></div>
          </div>
        </div>

        <!-- Hint watermark -->
        <div class="absolute bottom-2 right-3 pointer-events-none text-[10px] font-mono text-outline/60">
          Drag to pan • Scroll to zoom
        </div>
      </div>
    {/snippet}
  </SplitPane>
</div>
