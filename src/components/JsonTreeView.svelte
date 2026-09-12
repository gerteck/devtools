<script lang="ts">
  import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-svelte';
  import JsonTreeView from './JsonTreeView.svelte';

  let {
    data,
    keyName = '',
    isLast = true,
    depth = 0,
    defaultExpanded = true
  }: {
    data: any;
    keyName?: string;
    isLast?: boolean;
    depth?: number;
    defaultExpanded?: boolean;
  } = $props();

  let isExpanded = $state(true);
  $effect(() => {
    isExpanded = depth < 3 ? defaultExpanded : false;
  });
  let copied = $state(false);

  const dataType = $derived(
    data === null
      ? 'null'
      : Array.isArray(data)
      ? 'array'
      : typeof data
  );

  const isContainer = $derived(dataType === 'object' || dataType === 'array');

  const childEntries = $derived(
    isContainer && data !== null
      ? Object.entries(data)
      : []
  );

  function toggle() {
    isExpanded = !isExpanded;
  }

  function copyValue() {
    navigator.clipboard.writeText(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="font-mono text-xs leading-relaxed select-text">
  {#if isContainer}
    <div class="flex items-center group hover:bg-surface-container/50 rounded py-0.5 px-1 -mx-1 transition-colors">
      <button
        onclick={toggle}
        class="w-4 h-4 flex items-center justify-center text-on-surface-variant hover:text-on-surface mr-1 focus:outline-none"
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        {#if isExpanded}
          <ChevronDown size={13} />
        {:else}
          <ChevronRight size={13} />
        {/if}
      </button>

      {#if keyName}
        <span class="text-primary dark:text-indigo-400 font-medium mr-1.5">"{keyName}":</span>
      {/if}

      <span class="text-on-surface-variant mr-1">
        {dataType === 'array' ? '[' : '{'}
      </span>

      {#if !isExpanded}
        <button
          onclick={toggle}
          class="text-outline hover:text-on-surface text-[11px] px-1.5 py-0.2 bg-surface-container rounded border border-outline-variant mr-1 cursor-pointer"
        >
          {dataType === 'array' ? `${childEntries.length} items` : `${childEntries.length} keys`}
        </button>
        <span class="text-on-surface-variant">
          {dataType === 'array' ? ']' : '}'}{isLast ? '' : ','}
        </span>
      {/if}

      <!-- Quick copy button on hover -->
      <button
        onclick={copyValue}
        class="opacity-0 group-hover:opacity-100 ml-2 p-0.5 text-outline hover:text-on-surface transition-opacity"
        title="Copy node JSON"
      >
        {#if copied}
          <Check size={11} class="text-secondary" />
        {:else}
          <Copy size={11} />
        {/if}
      </button>
    </div>

    {#if isExpanded}
      <div class="pl-4 border-l border-outline-variant/60 ml-2 space-y-0.5 my-0.5">
        {#each childEntries as [childKey, childValue], i}
          <JsonTreeView
            data={childValue}
            keyName={dataType === 'array' ? '' : childKey}
            isLast={i === childEntries.length - 1}
            depth={depth + 1}
            {defaultExpanded}
          />
        {/each}
      </div>
      <div class="pl-5 text-on-surface-variant">
        {dataType === 'array' ? ']' : '}'}{isLast ? '' : ','}
      </div>
    {/if}
  {:else}
    <!-- Leaf value -->
    <div class="flex items-center group hover:bg-surface-container/50 rounded py-0.5 px-1 -mx-1 pl-5 transition-colors">
      {#if keyName}
        <span class="text-primary dark:text-indigo-400 font-medium mr-1.5">"{keyName}":</span>
      {/if}

      {#if dataType === 'string'}
        <span class="text-emerald-600 dark:text-emerald-400">"{data}"</span>
      {:else if dataType === 'number'}
        <span class="text-amber-600 dark:text-amber-400 font-semibold">{data}</span>
      {:else if dataType === 'boolean'}
        <span class="text-purple-600 dark:text-purple-400 font-semibold">{String(data)}</span>
      {:else if dataType === 'null'}
        <span class="text-rose-500 italic">null</span>
      {:else}
        <span class="text-on-surface">{String(data)}</span>
      {/if}

      {#if !isLast}
        <span class="text-on-surface-variant">,</span>
      {/if}

      <button
        onclick={copyValue}
        class="opacity-0 group-hover:opacity-100 ml-2 p-0.5 text-outline hover:text-on-surface transition-opacity"
        title="Copy value"
      >
        {#if copied}
          <Check size={11} class="text-secondary" />
        {:else}
          <Copy size={11} />
        {/if}
      </button>
    </div>
  {/if}
</div>
