<script lang="ts">
  import { onMount } from 'svelte';
  import { router } from '../router.svelte';
  import { useMonacoEditor } from '../actions/useMonacoEditor';
  import { useMermaidRender } from '../actions/useMermaidRender';
  import { usePanZoom, type PanZoomController } from '../actions/usePanZoom';
  import SplitPane from '../components/SplitPane.svelte';
  import {
    getSqliteModule,
    SqliteEngine,
    type TableItem,
    type DbMetadata,
  } from '../utils/sqliteEngine';
  import {
    generateMermaidERD,
    generateDBML,
    getErdStats,
  } from '../utils/erdGenerator';
  import { downloadSvg, downloadPng } from '../utils/export';
  import type { ColorScheme, ThemeMode } from '../types';
  import {
    Database,
    Upload,
    Sparkles,
    Play,
    Table,
    Terminal,
    Code2,
    Activity,
    Search,
    Download,
    FileText,
    FileCode,
    Check,
    Copy,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Layers,
    Key,
    AlertCircle,
    X,
    FileSpreadsheet,
    HelpCircle,
    Workflow,
    ZoomIn,
    ZoomOut,
    Maximize,
    RotateCcw,
    ExternalLink,
    AlertTriangle,
  } from '@lucide/svelte';

  let {
    theme = 'dark',
    scheme = 'gruvbox',
    monacoTheme = 'theme-gruvbox-dark',
  }: {
    theme?: ThemeMode;
    scheme?: ColorScheme;
    monacoTheme?: string;
  } = $props();

  // Engine state
  let engine = $state<SqliteEngine | null>(null);
  let isLoading = $state(true);
  let loadingMsg = $state('Initializing SQLite WASM engine...');
  let metadata = $state<DbMetadata | null>(null);
  let tables = $state<TableItem[]>([]);

  // Navigation & selection
  let selectedTableName = $state<string>('');
  let activeTab = $state<'data' | 'query' | 'schema' | 'erd' | 'health'>('data');
  let tableSearchQuery = $state('');

  // ER Diagram & DBML visualizer state
  let erdViewMode = $state<'visual' | 'dbml' | 'mermaid'>('visual');
  let erdMermaidCode = $derived(generateMermaidERD(tables));
  let erdDbmlCode = $derived(generateDBML(tables));
  let erdStats = $derived(getErdStats(tables));
  let panZoomCtrl = $state<PanZoomController | null>(null);
  let svgElement = $state<SVGSVGElement | null>(null);
  let erdParseError = $state<string | null>(null);
  let dbmlCopied = $state(false);
  let mermaidCopied = $state(false);
  let erdAutoFitted = $state(false);

  function copyDbml() {
    navigator.clipboard.writeText(erdDbmlCode);
    dbmlCopied = true;
    setTimeout(() => (dbmlCopied = false), 1500);
  }

  function downloadDbml() {
    const filename = `${metadata?.filename.replace(/\.[^/.]+$/, '') || 'database'}_schema.dbml`;
    const blob = new Blob([erdDbmlCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyMermaid() {
    navigator.clipboard.writeText(erdMermaidCode);
    mermaidCopied = true;
    setTimeout(() => (mermaidCopied = false), 1500);
  }

  function handleExportErdSvg() {
    if (!svgElement || erdParseError) return;
    const base = metadata?.filename.replace(/\.[^/.]+$/, '') || 'database';
    downloadSvg(svgElement, `${base}_erd.svg`);
  }

  function handleExportErdPng() {
    if (!svgElement || erdParseError) return;
    const base = metadata?.filename.replace(/\.[^/.]+$/, '') || 'database';
    const bg = theme === 'dark' ? '#1d2021' : '#ffffff';
    downloadPng(svgElement, `${base}_erd.png`, 2, bg);
  }

  function openInMermaidStudio() {
    try {
      localStorage.setItem('devtools_mermaid_draft', erdMermaidCode);
    } catch {
      // Ignore
    }
    router.navigate('/mermaid');
  }

  // Data grid state
  let gridColumns = $state<string[]>([]);
  let gridRows = $state<any[][]>([]);
  let gridTotalRows = $state(0);
  let gridPage = $state(0);
  let gridPageSize = $state(50);
  let gridSortCol = $state<string | undefined>(undefined);
  let gridSortOrder = $state<'ASC' | 'DESC'>('ASC');
  let gridSearchQuery = $state('');
  let gridDurationMs = $state(0);

  // Query console state
  let sqlQuery = $state('SELECT * FROM products LIMIT 50;');
  let queryColumns = $state<string[]>([]);
  let queryRows = $state<any[][]>([]);
  let queryDurationMs = $state(0);
  let queryError = $state<string | null>(null);
  let queryExecuted = $state(false);

  // Cell viewer modal state
  let cellModalContent = $state<{ col: string; val: any } | null>(null);
  let copied = $state(false);

  // Drag-and-drop highlight
  let isDraggingOver = $state(false);
  let fileInputRef = $state<HTMLInputElement | null>(null);
  let showUploadGuide = $state(false);

  // Initialize SQLite WASM on mount
  onMount(async () => {
    try {
      loadingMsg = 'Compiling SQLite WebAssembly runtime...';
      const sqlite3 = await getSqliteModule();
      engine = new SqliteEngine(sqlite3);
      // Auto-load sample database on first visit for zero-friction exploration
      loadingMsg = 'Loading sample e-commerce database...';
      await engine.loadSampleDatabase();
      syncEngineState();
    } catch (err: any) {
      console.error('Failed to initialize SQLite WASM:', err);
      loadingMsg = `Initialization failed: ${err.message || String(err)}`;
    } finally {
      isLoading = false;
    }
  });

  function syncEngineState() {
    if (!engine) return;
    metadata = engine.metadata;
    tables = engine.tables;

    const firstTable = tables.find((t) => t.type === 'table') || tables[0];
    if (firstTable) {
      selectedTableName = firstTable.name;
      loadTableData(firstTable.name);
      sqlQuery = `SELECT * FROM "${firstTable.name}" LIMIT 50;`;
    }
  }

  function loadTableData(tableName: string, resetPage = true) {
    if (!engine) return;
    if (resetPage) gridPage = 0;

    const res = engine.fetchTableData(
      tableName,
      gridPage,
      gridPageSize,
      gridSortCol,
      gridSortOrder,
      gridSearchQuery
    );

    gridColumns = res.columns;
    gridRows = res.rows;
    gridTotalRows = res.totalRows;
    gridDurationMs = res.durationMs;
  }

  function selectTable(name: string) {
    selectedTableName = name;
    gridSortCol = undefined;
    gridSortOrder = 'ASC';
    gridSearchQuery = '';
    loadTableData(name, true);
    sqlQuery = `SELECT * FROM "${name}" LIMIT 50;`;
  }

  function handleSort(col: string) {
    if (gridSortCol === col) {
      gridSortOrder = gridSortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      gridSortCol = col;
      gridSortOrder = 'ASC';
    }
    loadTableData(selectedTableName, false);
  }

  function handlePageChange(newPage: number) {
    gridPage = newPage;
    loadTableData(selectedTableName, false);
  }

  function handlePageSizeChange(newSize: number) {
    gridPageSize = newSize;
    gridPage = 0;
    loadTableData(selectedTableName, true);
  }

  function handleGridSearch() {
    gridPage = 0;
    loadTableData(selectedTableName, true);
  }

  function runCustomQuery() {
    if (!engine || !sqlQuery.trim()) return;
    queryExecuted = true;
    const res = engine.executeQuery(sqlQuery);
    queryColumns = res.columns;
    queryRows = res.rows;
    queryDurationMs = res.durationMs;
    queryError = res.error;
  }

  async function handleLoadSample() {
    if (!engine) return;
    isLoading = true;
    loadingMsg = 'Loading sample e-commerce database...';
    try {
      await engine.loadSampleDatabase();
      syncEngineState();
    } catch (err: any) {
      alert(`Failed to load sample database: ${err.message}`);
    } finally {
      isLoading = false;
    }
  }

  async function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    await processUploadedFiles(Array.from(input.files));
    input.value = '';
  }

  async function processUploadedFiles(fileList: File[]) {
    if (!engine) return;
    isLoading = true;
    loadingMsg = 'Reading database & mounting WAL files...';

    try {
      const readPromises = fileList.map(async (file) => {
        const buffer = await file.arrayBuffer();
        return {
          name: file.name,
          data: new Uint8Array(buffer),
        };
      });

      const loadedFiles = await Promise.all(readPromises);
      await engine.loadDatabaseFiles(loadedFiles);
      syncEngineState();
    } catch (err: any) {
      alert(`Failed to load database: ${err.message}`);
    } finally {
      isLoading = false;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDraggingOver = false;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(Array.from(e.dataTransfer.files));
    }
  }

  // Export handlers
  function downloadFile(content: string | Uint8Array, filename: string, mimeType: string) {
    const blob = new Blob([content as any], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportTableCsv() {
    if (!gridColumns.length || !gridRows.length) return;
    const csv = SqliteEngine.toCsv(gridColumns, gridRows);
    downloadFile(csv, `${selectedTableName}_page_${gridPage + 1}.csv`, 'text/csv');
  }

  function exportTableJson() {
    if (!gridColumns.length || !gridRows.length) return;
    const json = SqliteEngine.toJson(gridColumns, gridRows);
    downloadFile(json, `${selectedTableName}_page_${gridPage + 1}.json`, 'application/json');
  }

  function exportTableSql() {
    if (!gridColumns.length || !gridRows.length) return;
    const sql = SqliteEngine.toSqlInserts(selectedTableName, gridColumns, gridRows);
    downloadFile(sql, `${selectedTableName}_inserts.sql`, 'text/plain');
  }

  function exportFullDatabase() {
    if (!engine) return;
    const bytes = engine.exportBinaryDatabase();
    const filename = metadata?.filename
      ? metadata.filename.replace(/\.(sqlite|sqlite3|db)$/i, '') + '_dump.sqlite'
      : 'database.sqlite';
    downloadFile(bytes, filename, 'application/x-sqlite3');
  }

  function exportQueryCsv() {
    if (!queryColumns.length || !queryRows.length) return;
    const csv = SqliteEngine.toCsv(queryColumns, queryRows);
    downloadFile(csv, 'query_results.csv', 'text/csv');
  }

  function exportQueryJson() {
    if (!queryColumns.length || !queryRows.length) return;
    const json = SqliteEngine.toJson(queryColumns, queryRows);
    downloadFile(json, 'query_results.json', 'application/json');
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const selectedTable = $derived(tables.find((t) => t.name === selectedTableName));
  const filteredTables = $derived(
    tables.filter((t) =>
      t.name.toLowerCase().includes(tableSearchQuery.toLowerCase().trim())
    )
  );
  const totalPages = $derived(Math.ceil(gridTotalRows / gridPageSize) || 1);
</script>

<!-- Keyboard shortcut to run query (⌘Enter) & dismiss popovers -->
<svelte:window
  onkeydown={(e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && activeTab === 'query') {
      e.preventDefault();
      runCustomQuery();
    }
  }}
  onclick={(e) => {
    if (showUploadGuide && !(e.target as HTMLElement)?.closest('.upload-guide-container')) {
      showUploadGuide = false;
    }
  }}
/>

<div
  class="flex-1 flex flex-col h-full bg-background overflow-hidden relative"
  ondragover={(e) => {
    e.preventDefault();
    isDraggingOver = true;
  }}
  ondragleave={() => (isDraggingOver = false)}
  ondrop={handleDrop}
  role="region"
  aria-label="SQLite Viewer"
>
  <!-- Hidden File Input -->
  <input
    bind:this={fileInputRef}
    type="file"
    accept=".db,.sqlite,.sqlite3,.wal,.shm,*/*"
    multiple
    onchange={handleFileInput}
    class="hidden"
  />

  <!-- Top Toolbar -->
  <div class="h-12 border-b border-outline-variant bg-surface px-4 flex items-center justify-between gap-3 shrink-0 font-mono text-xs">
    <!-- Left: DB Title, File Size & WAL Status -->
    <div class="flex items-center gap-3 overflow-hidden">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold">
          <Database size={14} />
        </span>
        <span class="font-semibold text-on-surface truncate max-w-[180px] sm:max-w-[260px]">
          {metadata ? metadata.filename : 'No Database Loaded'}
        </span>
      </div>

      {#if metadata}
        <div class="hidden sm:flex items-center gap-1.5 text-[11px] text-outline">
          <span>•</span>
          <span>{formatBytes(metadata.fileSizeBytes)}</span>
          {#if metadata.hasWal}
            <span class="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
              WAL Active
            </span>
          {/if}
          <span>•</span>
          <span class="text-on-surface-variant font-medium">{tables.length} tables</span>
        </div>
      {/if}
    </div>

    <!-- Right Controls: Open DB, Sample DB, Export -->
    <div class="flex items-center gap-2">
      <!-- Open Files with Hover & Click Guide Trigger -->
      <div class="relative group upload-guide-container">
        <div class="flex items-center rounded border border-outline-variant bg-surface-container hover:bg-surface-container-high transition-colors overflow-hidden">
          <button
            onclick={() => fileInputRef?.click()}
            class="flex items-center gap-1.5 px-2.5 py-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer text-xs"
            title="Open .db, .sqlite, .wal files"
          >
            <Upload size={13} />
            <span>Open Files</span>
          </button>

          <div class="w-px h-3.5 bg-outline-variant"></div>

          <button
            onclick={() => (showUploadGuide = !showUploadGuide)}
            class="px-1.5 py-1 text-outline hover:text-primary transition-colors cursor-pointer"
            title="What files can I upload? (Click for guide)"
            aria-label="Upload file types info"
          >
            <HelpCircle size={12} />
          </button>
        </div>

        <!-- Floating Hover / Click Guide Popover -->
        <div
          class="absolute right-0 top-full mt-2 w-80 sm:w-96 p-4 rounded-xl bg-surface border border-outline-variant shadow-2xl z-50 font-mono text-xs text-on-surface transition-all duration-200 {showUploadGuide
            ? 'opacity-100 pointer-events-auto scale-100'
            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto scale-98 group-hover:scale-100'}"
        >
          <div class="flex items-center justify-between border-b border-outline-variant pb-2 mb-2.5">
            <span class="font-bold flex items-center gap-1.5 text-on-surface">
              <Database size={13} class="text-primary dark:text-indigo-400" />
              Supported Files & Formats
            </span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary dark:text-indigo-400 font-sans font-medium">
              100% Client-Side
            </span>
          </div>

          <!-- File format badges and descriptions -->
          <div class="space-y-2 text-[11px]">
            <div class="flex items-start gap-2">
              <span class="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant font-bold text-on-surface text-[10px] shrink-0">
                .db / .sqlite
              </span>
              <p class="text-on-surface-variant leading-tight">
                Standard SQLite database files (also accepts <code>.sqlite3</code>).
              </p>
            </div>

            <div class="flex items-start gap-2">
              <span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px] shrink-0">
                .wal / -wal
              </span>
              <p class="text-on-surface-variant leading-tight">
                <strong>Write-Ahead Log:</strong> Contains uncommitted transactions and recent write pages.
              </p>
            </div>

            <div class="flex items-start gap-2">
              <span class="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold text-[10px] shrink-0">
                .shm / -shm
              </span>
              <p class="text-on-surface-variant leading-tight">
                <strong>Shared Memory:</strong> Companion index for WAL mode (optional).
              </p>
            </div>
          </div>

          <!-- Pro Tip Box -->
          <div class="mt-3 p-2.5 rounded-lg bg-surface-container border border-outline-variant/60 flex items-start gap-2 text-[10.5px] leading-relaxed text-on-surface-variant">
            <span class="text-amber-500 text-xs mt-0.5 shrink-0">💡</span>
            <div>
              <strong class="text-on-surface">Pro-Tip for WAL Databases:</strong>
              <div class="mt-0.5">
                Select or drop your <code>.db</code> and companion <code>.wal</code> files <strong>together in a single batch</strong>. They will automatically be replayed into memory to display the latest uncommitted rows!
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load Sample DB -->
      <button
        onclick={handleLoadSample}
        class="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title="Load built-in E-Commerce demo database"
      >
        <Sparkles size={13} class="text-primary dark:text-indigo-400" />
        <span>Sample DB</span>
      </button>

      <div class="h-4 w-px bg-outline-variant"></div>

      <!-- Export Database -->
      <button
        onclick={exportFullDatabase}
        disabled={!metadata}
        class="flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-white hover:bg-primary/90 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        title="Download SQLite Database File (.sqlite)"
      >
        <Download size={13} />
        <span>Export DB</span>
      </button>
    </div>
  </div>

  <!-- Loading Overlay -->
  {#if isLoading}
    <div class="absolute inset-0 z-50 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
      <div class="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="font-mono text-xs text-on-surface-variant">{loadingMsg}</p>
    </div>
  {/if}

  <!-- Main Workspace: Split Pane (Left Schema Sidebar | Right Content Tabs) -->
  <div class="flex-1 min-h-0 relative overflow-hidden">
    <SplitPane storageKey="devtools_sqlite_split" defaultSplit={25} minThreshold={10} maxThreshold={85}>
      <!-- Left Sidebar: Tables and Views Explorer -->
      {#snippet left()}
        <div class="w-full h-full flex flex-col bg-surface border-r border-outline-variant overflow-hidden font-mono text-xs">
          <!-- Sidebar Header & Search -->
          <div class="p-2.5 border-b border-outline-variant bg-surface-container-low flex flex-col gap-2 shrink-0">
            <div class="flex items-center justify-between text-[11px] text-outline font-semibold">
              <span>TABLES & VIEWS</span>
              <span>{filteredTables.length}</span>
            </div>
            <div class="relative flex items-center">
              <Search size={12} class="absolute left-2 text-outline pointer-events-none" />
              <input
                bind:value={tableSearchQuery}
                type="text"
                placeholder="Filter tables..."
                class="w-full bg-surface-container border border-outline-variant rounded pl-6 pr-2 py-1 text-[11px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <!-- Tables List -->
          <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {#each filteredTables as table}
              {@const isSelected = selectedTableName === table.name}
              <button
                onclick={() => selectTable(table.name)}
                class="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer {isSelected
                  ? 'bg-primary/10 text-primary dark:text-indigo-400 font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}"
              >
                <div class="flex items-center gap-2 truncate">
                  {#if table.type === 'view'}
                    <Layers size={13} class="shrink-0 text-amber-500" />
                  {:else}
                    <Table size={13} class="shrink-0 opacity-70" />
                  {/if}
                  <span class="truncate">{table.name}</span>
                </div>
                {#if table.type === 'table'}
                  <span class="text-[10px] text-outline font-normal shrink-0 ml-1">
                    {table.rowCount}
                  </span>
                {:else}
                  <span class="text-[9px] px-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                    view
                  </span>
                {/if}
              </button>
            {/each}

            {#if filteredTables.length === 0}
              <div class="p-4 text-center text-outline text-[11px]">
                No matching tables found.
              </div>
            {/if}
          </div>

          <!-- Bottom Summary -->
          <div class="p-2 border-t border-outline-variant bg-surface-container-low text-[10px] text-outline flex items-center justify-between shrink-0">
            <span>SQLite {metadata?.sqliteVersion || '3.x'}</span>
            <span>{metadata?.encoding || 'UTF-8'}</span>
          </div>
        </div>
      {/snippet}

      <!-- Right Main Content: Tabs for Data, Query, Schema, Health -->
      {#snippet right()}
        <div class="w-full h-full flex flex-col bg-background overflow-hidden">
          <!-- Segmented Tab Header -->
          <div class="h-9 px-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between text-xs font-mono shrink-0">
            <!-- Tabs Toggle: Data | Query | Schema | Health -->
            <div class="flex items-center gap-1 bg-surface-container/60 p-0.5 rounded-md border border-outline-variant/60">
              <button
                onclick={() => (activeTab = 'data')}
                class="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] transition-all cursor-pointer {activeTab === 'data'
                  ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'}"
              >
                <Table size={12} />
                <span>Data Grid</span>
              </button>

              <button
                onclick={() => (activeTab = 'query')}
                class="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] transition-all cursor-pointer {activeTab === 'query'
                  ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'}"
              >
                <Terminal size={12} />
                <span>SQL Query</span>
              </button>

              <button
                onclick={() => (activeTab = 'schema')}
                class="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] transition-all cursor-pointer {activeTab === 'schema'
                  ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'}"
              >
                <Code2 size={12} />
                <span class="hidden sm:inline">Schema & DDL</span>
                <span class="sm:hidden">Schema</span>
              </button>

              <button
                onclick={() => {
                  activeTab = 'erd';
                  erdAutoFitted = false;
                }}
                class="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] transition-all cursor-pointer {activeTab === 'erd'
                  ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'}"
              >
                <Workflow size={12} />
                <span class="hidden sm:inline">ER Diagram</span>
                <span class="sm:hidden">ERD</span>
                {#if erdStats.relationCount > 0}
                  <span class="text-[9px] px-1 rounded-full bg-primary/10 text-primary dark:text-indigo-400 font-bold hidden md:inline">
                    {erdStats.relationCount}
                  </span>
                {/if}
              </button>

              <button
                onclick={() => (activeTab = 'health')}
                class="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] transition-all cursor-pointer {activeTab === 'health'
                  ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'}"
              >
                <Activity size={12} />
                <span>PRAGMA</span>
              </button>
            </div>

            <!-- Current Table context -->
            <div class="hidden sm:flex items-center gap-2 text-[11px] text-outline">
              <span>TABLE:</span>
              <span class="font-semibold text-on-surface">{selectedTableName || 'None'}</span>
            </div>
          </div>

          <!-- TAB 1: DATA GRID VIEW -->
          {#if activeTab === 'data'}
            <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
              <!-- Filter & Export Subtoolbar -->
              <div class="h-9 px-3 border-b border-outline-variant bg-surface flex items-center justify-between gap-3 text-xs font-mono shrink-0">
                <!-- Row search filter -->
                <div class="flex items-center gap-2 flex-1 max-w-sm">
                  <Search size={12} class="text-outline shrink-0" />
                  <input
                    bind:value={gridSearchQuery}
                    oninput={handleGridSearch}
                    type="text"
                    placeholder="Search records in {selectedTableName}..."
                    class="w-full bg-transparent text-[11px] text-on-surface placeholder:text-outline focus:outline-none"
                  />
                  {#if gridSearchQuery}
                    <button
                      onclick={() => {
                        gridSearchQuery = '';
                        handleGridSearch();
                      }}
                      class="text-outline hover:text-on-surface cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  {/if}
                </div>

                <!-- Right Actions: Export Table to CSV / JSON / SQL -->
                <div class="flex items-center gap-1 text-[11px]">
                  <span class="text-outline mr-1">{gridDurationMs}ms</span>
                  <div class="h-3.5 w-px bg-outline-variant mr-1"></div>

                  <button
                    onclick={exportTableCsv}
                    class="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer"
                    title="Export current page as CSV"
                  >
                    <FileSpreadsheet size={11} />
                    <span>CSV</span>
                  </button>

                  <button
                    onclick={exportTableJson}
                    class="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer"
                    title="Export current page as JSON"
                  >
                    <FileCode size={11} />
                    <span>JSON</span>
                  </button>

                  <button
                    onclick={exportTableSql}
                    class="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer"
                    title="Export current page as INSERT SQL"
                  >
                    <FileText size={11} />
                    <span>SQL</span>
                  </button>
                </div>
              </div>

              <!-- Data Grid Table -->
              <div class="flex-1 overflow-auto bg-surface relative">
                {#if gridRows.length > 0}
                  <table class="w-full text-left font-mono text-xs border-collapse">
                    <thead class="sticky top-0 z-10 bg-surface-container border-b border-outline-variant shadow-2xs">
                      <tr>
                        <!-- Row index -->
                        <th class="py-2 px-3 text-[10px] text-outline font-semibold w-12 border-r border-outline-variant/60 text-center">
                          #
                        </th>
                        {#each gridColumns as col}
                          {@const colInfo = selectedTable?.columns?.find((c) => c.name === col)}
                          <th
                            onclick={() => handleSort(col)}
                            class="py-2 px-3 text-[11px] font-semibold text-on-surface border-r border-outline-variant/60 cursor-pointer hover:bg-surface-container-high transition-colors select-none"
                          >
                            <div class="flex items-center justify-between gap-1.5">
                              <div class="flex items-center gap-1 truncate">
                                {#if colInfo?.pk}
                                  <Key size={10} class="text-amber-500 shrink-0" />
                                {/if}
                                <span class="truncate">{col}</span>
                                {#if colInfo?.type}
                                  <span class="text-[9px] text-outline font-normal">
                                    {colInfo.type}
                                  </span>
                                {/if}
                              </div>
                              <span class="text-outline shrink-0">
                                {#if gridSortCol === col}
                                  {#if gridSortOrder === 'ASC'}
                                    <ArrowUp size={11} class="text-primary" />
                                  {:else}
                                    <ArrowDown size={11} class="text-primary" />
                                  {/if}
                                {:else}
                                  <ArrowUpDown size={10} class="opacity-40" />
                                {/if}
                              </span>
                            </div>
                          </th>
                        {/each}
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-outline-variant/40">
                      {#each gridRows as row, rIdx}
                        <tr class="hover:bg-primary/5 transition-colors">
                          <td class="py-1.5 px-3 text-[10px] text-outline border-r border-outline-variant/40 text-center font-semibold">
                            {gridPage * gridPageSize + rIdx + 1}
                          </td>
                          {#each row as cell, cIdx}
                            {@const colName = gridColumns[cIdx]}
                            <td
                              onclick={() => (cellModalContent = { col: colName, val: cell })}
                              class="py-1.5 px-3 border-r border-outline-variant/40 truncate max-w-xs hover:bg-primary/10 cursor-pointer transition-colors"
                              title="Click to view full cell content"
                            >
                              {#if cell === null || cell === undefined}
                                <span class="text-outline/60 italic text-[11px]">NULL</span>
                              {:else if typeof cell === 'number'}
                                <span class="text-emerald-600 dark:text-emerald-400">{cell}</span>
                              {:else if typeof cell === 'boolean'}
                                <span class="text-amber-600 dark:text-amber-400">{cell ? 'true' : 'false'}</span>
                              {:else}
                                <span class="text-on-surface">{cell}</span>
                              {/if}
                            </td>
                          {/each}
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {:else}
                  <div class="h-full flex flex-col items-center justify-center text-outline gap-2 p-8 font-mono">
                    <Table size={28} class="opacity-40" />
                    <p class="text-xs">No records found for table "{selectedTableName}".</p>
                  </div>
                {/if}
              </div>

              <!-- Pagination Toolbar -->
              <div class="h-10 px-4 border-t border-outline-variant bg-surface flex items-center justify-between gap-3 text-xs font-mono shrink-0">
                <div class="flex items-center gap-2 text-[11px] text-outline">
                  <span>Showing {gridRows.length > 0 ? gridPage * gridPageSize + 1 : 0}–{Math.min((gridPage + 1) * gridPageSize, gridTotalRows)} of {gridTotalRows} rows</span>
                </div>

                <div class="flex items-center gap-3">
                  <!-- Page size selector -->
                  <div class="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                    <span class="text-outline">Rows:</span>
                    {#each [25, 50, 100, 250] as size}
                      <button
                        onclick={() => handlePageSizeChange(size)}
                        class="px-1.5 py-0.5 rounded text-[11px] transition-colors cursor-pointer {gridPageSize === size
                          ? 'bg-primary text-white font-semibold'
                          : 'hover:bg-surface-container text-on-surface-variant'}"
                      >
                        {size}
                      </button>
                    {/each}
                  </div>

                  <div class="h-4 w-px bg-outline-variant"></div>

                  <!-- Prev / Next Pagination -->
                  <div class="flex items-center gap-1">
                    <button
                      onclick={() => handlePageChange(gridPage - 1)}
                      disabled={gridPage <= 0}
                      class="p-1 rounded border border-outline-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span class="text-[11px] px-2 text-on-surface">
                      Page {gridPage + 1} of {totalPages}
                    </span>
                    <button
                      onclick={() => handlePageChange(gridPage + 1)}
                      disabled={gridPage >= totalPages - 1}
                      class="p-1 rounded border border-outline-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          <!-- TAB 2: SQL QUERY CONSOLE -->
          {:else if activeTab === 'query'}
            <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
              <!-- Top Console Controls -->
              <div class="h-10 px-3 border-b border-outline-variant bg-surface flex items-center justify-between gap-2 text-xs font-mono shrink-0">
                <div class="flex items-center gap-2">
                  <button
                    onclick={runCustomQuery}
                    class="flex items-center gap-1.5 px-3 py-1 rounded bg-primary text-white font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
                    title="Execute SQL Query (⌘Enter)"
                  >
                    <Play size={12} class="fill-current" />
                    <span>Run Query</span>
                  </button>

                  <span class="text-[11px] text-outline hidden sm:inline">⌘Enter</span>
                </div>

                <!-- Query presets -->
                <div class="flex items-center gap-1.5 overflow-x-auto">
                  <span class="text-[10px] text-outline">Snippets:</span>
                  <button
                    onclick={() => {
                      sqlQuery = `SELECT * FROM "${selectedTableName}" LIMIT 50;`;
                      runCustomQuery();
                    }}
                    class="px-2 py-0.5 rounded border border-outline-variant bg-surface-container text-[11px] text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    SELECT 50
                  </button>
                  <button
                    onclick={() => {
                      sqlQuery = `SELECT COUNT(*) AS total_rows FROM "${selectedTableName}";`;
                      runCustomQuery();
                    }}
                    class="px-2 py-0.5 rounded border border-outline-variant bg-surface-container text-[11px] text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    Count
                  </button>
                  <button
                    onclick={() => {
                      sqlQuery = `SELECT * FROM sqlite_master WHERE type IN ('table', 'view');`;
                      runCustomQuery();
                    }}
                    class="px-2 py-0.5 rounded border border-outline-variant bg-surface-container text-[11px] text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    Master Catalog
                  </button>
                </div>
              </div>

              <!-- SQL Editor (Top Half) & Results (Bottom Half) -->
              <div class="flex-1 flex flex-col min-h-0">
                <!-- Monaco SQL Editor -->
                <div class="h-2/5 border-b border-outline-variant relative">
                  <div
                    class="w-full h-full"
                    use:useMonacoEditor={{
                      value: sqlQuery,
                      language: 'sql',
                      theme: theme,
                      onChange: (val) => (sqlQuery = val),
                    }}
                  ></div>
                </div>

                <!-- Results Area (Bottom 3/5) -->
                <div class="h-3/5 flex flex-col min-h-0 bg-surface relative overflow-hidden font-mono">
                  <!-- Query Result Header -->
                  <div class="h-8 px-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between text-xs shrink-0">
                    <div class="flex items-center gap-2">
                      <span class="text-outline text-[11px] font-semibold">RESULTS:</span>
                      {#if queryExecuted}
                        {#if queryError}
                          <span class="text-red-500 font-semibold text-[11px]">Query Error</span>
                        {:else}
                          <span class="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                            {queryRows.length} {queryRows.length === 1 ? 'row' : 'rows'} ({queryDurationMs}ms)
                          </span>
                        {/if}
                      {:else}
                        <span class="text-outline text-[11px]">Ready</span>
                      {/if}
                    </div>

                    {#if queryRows.length > 0 && !queryError}
                      <div class="flex items-center gap-1.5">
                        <button
                          onclick={exportQueryCsv}
                          class="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant bg-surface text-[11px] hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer"
                        >
                          <FileSpreadsheet size={11} />
                          <span>CSV</span>
                        </button>
                        <button
                          onclick={exportQueryJson}
                          class="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant bg-surface text-[11px] hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer"
                        >
                          <FileCode size={11} />
                          <span>JSON</span>
                        </button>
                      </div>
                    {/if}
                  </div>

                  <!-- Error Banner -->
                  {#if queryError}
                    <div class="p-4 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                      <AlertCircle size={15} class="shrink-0 mt-0.5" />
                      <div class="overflow-x-auto">
                        <span class="font-bold">SQLite Error:</span>
                        <pre class="mt-1 whitespace-pre-wrap">{queryError}</pre>
                      </div>
                    </div>
                  {/if}

                  <!-- Results Table -->
                  <div class="flex-1 overflow-auto">
                    {#if queryRows.length > 0}
                      <table class="w-full text-left text-xs border-collapse">
                        <thead class="sticky top-0 bg-surface-container border-b border-outline-variant z-10">
                          <tr>
                            <th class="py-1.5 px-3 text-[10px] text-outline font-semibold w-10 border-r border-outline-variant/60 text-center">#</th>
                            {#each queryColumns as col}
                              <th class="py-1.5 px-3 text-[11px] font-semibold text-on-surface border-r border-outline-variant/60">
                                {col}
                              </th>
                            {/each}
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-outline-variant/40">
                          {#each queryRows as row, idx}
                            <tr class="hover:bg-primary/5">
                              <td class="py-1 px-3 text-[10px] text-outline border-r border-outline-variant/40 text-center font-semibold">
                                {idx + 1}
                              </td>
                              {#each row as cell, cIdx}
                                <td
                                  onclick={() => (cellModalContent = { col: queryColumns[cIdx], val: cell })}
                                  class="py-1 px-3 border-r border-outline-variant/40 truncate max-w-xs hover:bg-primary/10 cursor-pointer"
                                >
                                  {#if cell === null || cell === undefined}
                                    <span class="text-outline/60 italic text-[11px]">NULL</span>
                                  {:else}
                                    <span>{cell}</span>
                                  {/if}
                                </td>
                              {/each}
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    {:else if !queryError}
                      <div class="h-full flex flex-col items-center justify-center text-outline p-6 text-xs gap-2">
                        <Terminal size={24} class="opacity-40" />
                        <span>Run a SQL query above to view results.</span>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>

          <!-- TAB 3: SCHEMA & DDL VIEW -->
          {:else if activeTab === 'schema'}
            <div class="flex-1 flex flex-col min-h-0 overflow-hidden font-mono text-xs">
              <!-- Columns breakdown -->
              <div class="h-1/2 flex flex-col border-b border-outline-variant overflow-hidden">
                <div class="h-8 px-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between text-xs shrink-0">
                  <span class="text-outline text-[11px] font-semibold">TABLE COLUMNS ({selectedTable?.columns?.length || 0})</span>
                  <span class="text-on-surface font-semibold">{selectedTableName}</span>
                </div>

                <div class="flex-1 overflow-auto bg-surface">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead class="sticky top-0 bg-surface-container border-b border-outline-variant z-10">
                      <tr>
                        <th class="py-2 px-3 text-[11px] font-semibold text-outline border-r border-outline-variant/60 w-12 text-center">CID</th>
                        <th class="py-2 px-3 text-[11px] font-semibold text-on-surface border-r border-outline-variant/60">Name</th>
                        <th class="py-2 px-3 text-[11px] font-semibold text-on-surface border-r border-outline-variant/60">Type</th>
                        <th class="py-2 px-3 text-[11px] font-semibold text-on-surface border-r border-outline-variant/60">Primary Key</th>
                        <th class="py-2 px-3 text-[11px] font-semibold text-on-surface border-r border-outline-variant/60">Not Null</th>
                        <th class="py-2 px-3 text-[11px] font-semibold text-on-surface">Default</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-outline-variant/40">
                      {#each selectedTable?.columns || [] as col}
                        <tr class="hover:bg-primary/5">
                          <td class="py-1.5 px-3 text-center text-outline text-[10px]">{col.cid}</td>
                          <td class="py-1.5 px-3 font-semibold text-on-surface flex items-center gap-1.5">
                            {#if col.pk}
                              <Key size={11} class="text-amber-500" />
                            {/if}
                            <span>{col.name}</span>
                          </td>
                          <td class="py-1.5 px-3 text-primary dark:text-indigo-400 font-semibold">{col.type}</td>
                          <td class="py-1.5 px-3">
                            {#if col.pk}
                              <span class="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[10px] border border-amber-500/20">
                                PRIMARY KEY
                              </span>
                            {:else}
                              <span class="text-outline/60">-</span>
                            {/if}
                          </td>
                          <td class="py-1.5 px-3">
                            {#if col.notnull}
                              <span class="text-red-500 font-semibold text-[10px]">NOT NULL</span>
                            {:else}
                              <span class="text-outline/60">NULL</span>
                            {/if}
                          </td>
                          <td class="py-1.5 px-3 text-outline">
                            {col.dflt_value !== null ? col.dflt_value : 'NULL'}
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- DDL Statement in Monaco (Read-Only) -->
              <div class="h-1/2 flex flex-col relative overflow-hidden">
                <div class="h-8 px-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between text-xs shrink-0">
                  <span class="text-outline text-[11px] font-semibold">CREATE TABLE DDL STATEMENT</span>
                  <button
                    onclick={() => copyText(selectedTable?.sql || '')}
                    class="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant bg-surface hover:bg-surface-container text-on-surface-variant cursor-pointer"
                  >
                    {#if copied}
                      <Check size={11} class="text-secondary" />
                      <span>Copied!</span>
                    {:else}
                      <Copy size={11} />
                      <span>Copy DDL</span>
                    {/if}
                  </button>
                </div>
                <div class="flex-1 w-full h-full">
                  <div
                    class="w-full h-full"
                    use:useMonacoEditor={{
                      value: selectedTable?.sql || `-- No DDL found for ${selectedTableName}`,
                      language: 'sql',
                      theme: theme,
                      readOnly: true,
                    }}
                  ></div>
                </div>
              </div>
            </div>

          <!-- TAB: ER DIAGRAM & DBML VIEW -->
          {:else if activeTab === 'erd'}
            <div class="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              <!-- ERD Sub-Toolbar -->
              <div class="h-9 px-3 border-b border-outline-variant bg-surface flex items-center justify-between gap-2 text-xs font-mono shrink-0 overflow-x-auto no-scrollbar">
                <!-- Left: View Switcher & Stats -->
                <div class="flex items-center gap-2 shrink-0">
                  <!-- Mode Pills: Visual | DBML | Mermaid -->
                  <div class="flex items-center bg-surface-container/60 p-0.5 rounded border border-outline-variant/60">
                    <button
                      onclick={() => (erdViewMode = 'visual')}
                      class="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer {erdViewMode === 'visual'
                        ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'}"
                      title="Interactive Visual ER Diagram"
                    >
                      <Workflow size={11} />
                      <span>Visual</span>
                    </button>
                    <button
                      onclick={() => (erdViewMode = 'dbml')}
                      class="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer {erdViewMode === 'dbml'
                        ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'}"
                      title="Database Markup Language (DBML)"
                    >
                      <FileCode size={11} />
                      <span>DBML</span>
                    </button>
                    <button
                      onclick={() => (erdViewMode = 'mermaid')}
                      class="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer {erdViewMode === 'mermaid'
                        ? 'bg-surface text-primary dark:text-indigo-400 font-semibold shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'}"
                      title="Mermaid erDiagram DSL"
                    >
                      <Code2 size={11} />
                      <span>Mermaid</span>
                    </button>
                  </div>

                  <span class="text-[11px] text-outline hidden sm:inline">
                    {erdStats.tableCount} tables · {erdStats.relationCount} relationships
                  </span>
                </div>

                <!-- Right: Action Controls -->
                <div class="flex items-center gap-1.5 shrink-0">
                  {#if erdViewMode === 'visual'}
                    <!-- Pan / Zoom Controls -->
                    <div class="flex items-center gap-0.5 bg-surface-container/60 p-0.5 rounded border border-outline-variant/60">
                      <button
                        onclick={() => panZoomCtrl?.zoomIn()}
                        class="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface transition-colors cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn size={12} />
                      </button>
                      <button
                        onclick={() => panZoomCtrl?.zoomOut()}
                        class="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface transition-colors cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut size={12} />
                      </button>
                      <button
                        onclick={() => panZoomCtrl?.fitToScreen()}
                        class="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface transition-colors cursor-pointer"
                        title="Fit to Screen"
                      >
                        <Maximize size={12} />
                      </button>
                      <button
                        onclick={() => panZoomCtrl?.reset()}
                        class="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface transition-colors cursor-pointer"
                        title="Reset View"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>

                    <div class="h-4 w-px bg-outline-variant"></div>

                    <!-- Export SVG / PNG -->
                    <button
                      onclick={handleExportErdSvg}
                      class="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant hover:bg-surface-container text-[11px] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                      title="Download Vector SVG"
                    >
                      <Download size={11} />
                      <span class="hidden sm:inline">SVG</span>
                    </button>
                    <button
                      onclick={handleExportErdPng}
                      class="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant hover:bg-surface-container text-[11px] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                      title="Download Raster PNG"
                    >
                      <Download size={11} />
                      <span class="hidden sm:inline">PNG</span>
                    </button>

                    <button
                      onclick={openInMermaidStudio}
                      class="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary dark:text-indigo-400 border border-primary/20 hover:bg-primary/20 text-[11px] font-semibold transition-colors cursor-pointer"
                      title="Open and edit in Mermaid Studio"
                    >
                      <ExternalLink size={11} />
                      <span class="hidden md:inline">Edit in Studio</span>
                    </button>

                  {:else if erdViewMode === 'dbml'}
                    <button
                      onclick={copyDbml}
                      class="flex items-center gap-1 px-2.5 py-0.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer text-[11px]"
                      title="Copy DBML to clipboard"
                    >
                      {#if dbmlCopied}
                        <Check size={11} class="text-secondary" />
                        <span>Copied!</span>
                      {:else}
                        <Copy size={11} />
                        <span>Copy DBML</span>
                      {/if}
                    </button>
                    <button
                      onclick={downloadDbml}
                      class="flex items-center gap-1 px-2.5 py-0.5 rounded bg-primary text-white hover:opacity-90 font-medium transition-colors cursor-pointer text-[11px] shadow-xs"
                      title="Download as .dbml file"
                    >
                      <Download size={11} />
                      <span>Download .dbml</span>
                    </button>

                  {:else if erdViewMode === 'mermaid'}
                    <button
                      onclick={copyMermaid}
                      class="flex items-center gap-1 px-2.5 py-0.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer text-[11px]"
                      title="Copy Mermaid Code"
                    >
                      {#if mermaidCopied}
                        <Check size={11} class="text-secondary" />
                        <span>Copied!</span>
                      {:else}
                        <Copy size={11} />
                        <span>Copy Code</span>
                      {/if}
                    </button>
                    <button
                      onclick={openInMermaidStudio}
                      class="flex items-center gap-1 px-2.5 py-0.5 rounded bg-primary text-white hover:opacity-90 font-medium transition-colors cursor-pointer text-[11px] shadow-xs"
                      title="Open in Mermaid Studio"
                    >
                      <ExternalLink size={11} />
                      <span>Open in Studio</span>
                    </button>
                  {/if}
                </div>
              </div>

              <!-- Main Viewport Area -->
              <div class="flex-1 min-h-0 relative w-full h-full overflow-hidden bg-background">
                {#if erdViewMode === 'visual'}
                  {#if erdParseError}
                    <div class="absolute top-2 inset-x-4 z-30 bg-amber-500/10 border border-amber-500/30 rounded p-3 text-xs font-mono text-amber-600 dark:text-amber-400 flex items-start gap-2">
                      <AlertTriangle size={14} class="shrink-0 mt-0.5" />
                      <div>
                        <strong>ER Diagram Render Notice:</strong>
                        <p class="text-[11px] mt-0.5">{erdParseError}</p>
                      </div>
                    </div>
                  {/if}

                  <!-- SVG Pan & Zoom Viewport -->
                  <div
                    class="w-full h-full relative overflow-hidden flex items-center justify-center select-none"
                    use:usePanZoom={{
                      onRegister: (ctrl) => (panZoomCtrl = ctrl),
                    }}
                  >
                    <div
                      class="transition-opacity duration-200 flex items-center justify-center rounded-lg p-4 pointer-events-auto shadow-sm {theme === 'dark' ? 'bg-surface/90 shadow-inner' : 'bg-white shadow-xs'}"
                      use:useMermaidRender={{
                        code: erdMermaidCode,
                        scheme: scheme,
                        theme: theme,
                        onError: (err) => {
                          erdParseError = err ? err.message : null;
                        },
                        onSuccess: (node) => {
                          svgElement = node;
                          erdParseError = null;
                          if (!erdAutoFitted) {
                            erdAutoFitted = true;
                            setTimeout(() => panZoomCtrl?.fitToScreen(), 80);
                          }
                        },
                      }}
                    ></div>
                  </div>

                  <!-- Canvas bottom watermark -->
                  <div class="absolute bottom-2 right-3 pointer-events-none text-[10px] font-mono text-outline/60">
                    Drag to pan • Scroll to zoom
                  </div>

                {:else if erdViewMode === 'dbml'}
                  <!-- DBML Monaco Editor -->
                  <div
                    class="w-full h-full"
                    use:useMonacoEditor={{
                      value: erdDbmlCode,
                      language: 'plaintext',
                      theme: monacoTheme,
                      readOnly: true,
                    }}
                  ></div>

                {:else if erdViewMode === 'mermaid'}
                  <!-- Mermaid Monaco Editor -->
                  <div
                    class="w-full h-full"
                    use:useMonacoEditor={{
                      value: erdMermaidCode,
                      language: 'mermaid',
                      theme: monacoTheme,
                      readOnly: true,
                    }}
                  ></div>
                {/if}
              </div>
            </div>

          <!-- TAB 4: PRAGMA & HEALTH VIEW -->
          {:else if activeTab === 'health'}
            <div class="flex-1 overflow-y-auto p-6 font-mono text-xs">
              <div class="max-w-3xl mx-auto space-y-6">
                <!-- Health summary banner -->
                <div class="p-4 rounded-lg border {metadata?.integrityOk
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'} flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center {metadata?.integrityOk ? 'bg-emerald-500/20' : 'bg-red-500/20'}">
                    {#if metadata?.integrityOk}
                      <Check size={16} class="text-emerald-600 dark:text-emerald-400" />
                    {:else}
                      <AlertCircle size={16} class="text-red-600 dark:text-red-400" />
                    {/if}
                  </div>
                  <div>
                    <h3 class="font-bold text-sm">
                      {metadata?.integrityOk ? 'Database Integrity Verified (PRAGMA OK)' : 'Integrity Check Warning'}
                    </h3>
                    <p class="text-[11px] opacity-80 mt-0.5">
                      {metadata?.integrityOk ? 'B-Tree pages, free lists, and cell indices are healthy and uncorrupted.' : 'Database reported integrity issues on check.'}
                    </p>
                  </div>
                </div>

                <!-- Database Metrics Cards Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div class="p-3.5 rounded-lg border border-outline-variant bg-surface flex flex-col gap-1">
                    <span class="text-[10px] text-outline font-semibold">SQLITE VERSION</span>
                    <span class="text-base font-bold text-on-surface">{metadata?.sqliteVersion}</span>
                  </div>

                  <div class="p-3.5 rounded-lg border border-outline-variant bg-surface flex flex-col gap-1">
                    <span class="text-[10px] text-outline font-semibold">PAGE SIZE</span>
                    <span class="text-base font-bold text-on-surface">{metadata?.pageSize} bytes</span>
                  </div>

                  <div class="p-3.5 rounded-lg border border-outline-variant bg-surface flex flex-col gap-1">
                    <span class="text-[10px] text-outline font-semibold">TOTAL PAGES</span>
                    <span class="text-base font-bold text-on-surface">{metadata?.pageCount}</span>
                  </div>

                  <div class="p-3.5 rounded-lg border border-outline-variant bg-surface flex flex-col gap-1">
                    <span class="text-[10px] text-outline font-semibold">ENCODING</span>
                    <span class="text-base font-bold text-on-surface">{metadata?.encoding}</span>
                  </div>

                  <div class="p-3.5 rounded-lg border border-outline-variant bg-surface flex flex-col gap-1">
                    <span class="text-[10px] text-outline font-semibold">JOURNAL MODE</span>
                    <span class="text-base font-bold text-on-surface capitalize">{metadata?.journalMode}</span>
                  </div>

                  <div class="p-3.5 rounded-lg border border-outline-variant bg-surface flex flex-col gap-1">
                    <span class="text-[10px] text-outline font-semibold">WAL FILE CHECKPOINT</span>
                    <span class="text-base font-bold {metadata?.hasWal ? 'text-emerald-500' : 'text-outline'}">
                      {metadata?.hasWal ? 'Replayed & Merged' : 'None Attached'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/snippet}
    </SplitPane>
  </div>

  <!-- Drag-and-drop Visual Backdrop Overlay -->
  {#if isDraggingOver}
    <div class="absolute inset-0 z-50 bg-primary/20 backdrop-blur-xs border-2 border-dashed border-primary flex flex-col items-center justify-center pointer-events-none">
      <div class="bg-surface p-6 rounded-xl border border-outline-variant shadow-2xl flex flex-col items-center gap-2 text-center font-mono">
        <Upload size={32} class="text-primary animate-bounce" />
        <h3 class="text-sm font-bold text-on-surface">Drop SQLite Files to Load</h3>
        <p class="text-xs text-outline">Accepts .db, .sqlite, .sqlite3, and companion .wal / .shm files</p>
      </div>
    </div>
  {/if}

  <!-- Cell Value Inspector Modal -->
  {#if cellModalContent}
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-mono">
      <div class="w-full max-w-xl bg-surface border border-outline-variant rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div class="h-10 px-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between text-xs shrink-0">
          <div class="flex items-center gap-2">
            <span class="text-outline">COLUMN:</span>
            <span class="font-bold text-on-surface">{cellModalContent.col}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              onclick={() => copyText(String(cellModalContent?.val))}
              class="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant cursor-pointer text-[11px]"
            >
              {#if copied}
                <Check size={11} class="text-secondary" />
                <span>Copied</span>
              {:else}
                <Copy size={11} />
                <span>Copy</span>
              {/if}
            </button>
            <button
              onclick={() => (cellModalContent = null)}
              class="p-1 rounded hover:bg-surface-container text-outline hover:text-on-surface cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div class="p-4 max-h-[60vh] overflow-y-auto text-xs whitespace-pre-wrap select-text leading-relaxed">
          {cellModalContent.val === null ? 'NULL' : cellModalContent.val}
        </div>
      </div>
    </div>
  {/if}
</div>
