<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from '@lucide/svelte';

  interface SplitPaneProps {
    storageKey?: string;
    defaultSplit?: number;
    minThreshold?: number;
    maxThreshold?: number;
    left: Snippet;
    right: Snippet;
    onResize?: (splitPercent: number) => void;
  }

  let {
    storageKey = 'devtools_split_percent',
    defaultSplit = 42,
    minThreshold = 12,
    maxThreshold = 88,
    left,
    right,
    onResize,
  }: SplitPaneProps = $props();

  let splitPercent = $state<number>(42);
  let lastActiveSplit = $state<number>(42);
  let isInitialized = false;

  $effect.pre(() => {
    if (!isInitialized) {
      isInitialized = true;
      let initialVal = defaultSplit;
      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw !== null) {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'number' && !isNaN(parsed)) {
              initialVal = parsed;
            }
          }
        } catch {
          // Ignore
        }
      }
      splitPercent = initialVal;
      lastActiveSplit =
        initialVal > minThreshold && initialVal < maxThreshold ? initialVal : defaultSplit;
    }
  });

  $effect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(splitPercent));
    } catch {
      // Ignore
    }
    if (splitPercent > minThreshold && splitPercent < maxThreshold) {
      lastActiveSplit = splitPercent;
    }
    onResize?.(splitPercent);
  });

  let containerRef = $state<HTMLElement | null>(null);
  let isDragging = $state(false);
  let isHorizontal = $state(true);

  // Check window size for md breakpoint (768px)
  function updateOrientation() {
    if (typeof window !== 'undefined') {
      isHorizontal = window.innerWidth >= 768;
    }
  }

  if (typeof window !== 'undefined') {
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
  }

  let isLeftCollapsed = $derived(splitPercent <= 0.5);
  let isRightCollapsed = $derived(splitPercent >= 99.5);

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    isDragging = true;
    updateOrientation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();

    let rawPercent: number;
    if (isHorizontal) {
      const offsetX = e.clientX - rect.left;
      rawPercent = (offsetX / rect.width) * 100;
    } else {
      const offsetY = e.clientY - rect.top;
      rawPercent = (offsetY / rect.height) * 100;
    }

    // Snap to 0 (Diagram Only) or 100 (Code Only) if dragged beyond thresholds
    if (rawPercent < minThreshold) {
      splitPercent = 0;
    } else if (rawPercent > maxThreshold) {
      splitPercent = 100;
    } else {
      splitPercent = Math.round(Math.min(Math.max(rawPercent, 10), 90) * 10) / 10;
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    window.dispatchEvent(new Event('resize'));
  }

  function handleDoubleClick() {
    // Reset to default split on double click
    splitPercent = defaultSplit;
    window.dispatchEvent(new Event('resize'));
  }

  function restoreSplit() {
    splitPercent = lastActiveSplit || defaultSplit;
    window.dispatchEvent(new Event('resize'));
  }
</script>

<div
  bind:this={containerRef}
  class="flex-1 flex flex-col md:flex-row min-h-0 w-full h-full relative overflow-hidden select-none"
  class:cursor-col-resize={isDragging && isHorizontal}
  class:cursor-row-resize={isDragging && !isHorizontal}
>
  <!-- Left / Top Pane -->
  <div
    class="flex flex-col relative transition-all duration-75 {isLeftCollapsed ? 'hidden' : 'flex'}"
    style={isHorizontal
      ? `width: ${isRightCollapsed ? '100%' : `${splitPercent}%`}; height: 100%;`
      : `height: ${isRightCollapsed ? '100%' : `${splitPercent}%`}; width: 100%;`}
  >
    {@render left()}
  </div>

  <!-- Draggable Divider -->
  <div
    role="separator"
    aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
    aria-valuenow={splitPercent}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
    ondblclick={handleDoubleClick}
    class="relative z-20 shrink-0 flex items-center justify-center transition-colors group
      {isHorizontal
        ? 'w-2 md:w-2 hover:w-2.5 cursor-col-resize border-x border-outline-variant/60'
        : 'h-2 md:h-2 hover:h-2.5 cursor-row-resize border-y border-outline-variant/60'}
      {isDragging ? 'bg-primary/25' : 'bg-surface hover:bg-primary/10'}
      {isLeftCollapsed || isRightCollapsed ? (isHorizontal ? 'w-5 md:w-5 bg-surface-container-high' : 'h-5 md:h-5 bg-surface-container-high') : ''}"
    title={isLeftCollapsed
      ? 'Click to expand code editor'
      : isRightCollapsed
        ? 'Click to expand diagram preview'
        : 'Drag to resize • Double-click to reset (42/58)'}
  >
    <!-- Grip Indicator or Restore Buttons -->
    {#if isLeftCollapsed}
      <!-- Collapsed Left: Button to restore Left Pane -->
      <button
        type="button"
        onclick={restoreSplit}
        class="w-full h-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/20 transition-colors cursor-pointer"
        title="Expand Editor"
      >
        {#if isHorizontal}
          <ChevronRight size={14} />
        {:else}
          <ChevronDown size={14} />
        {/if}
      </button>
    {:else if isRightCollapsed}
      <!-- Collapsed Right: Button to restore Right Pane -->
      <button
        type="button"
        onclick={restoreSplit}
        class="w-full h-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/20 transition-colors cursor-pointer"
        title="Expand Preview"
      >
        {#if isHorizontal}
          <ChevronLeft size={14} />
        {:else}
          <ChevronUp size={14} />
        {/if}
      </button>
    {:else}
      <!-- Normal Split: Subtle Centered Grip Pill -->
      <div
        class="pointer-events-none flex items-center justify-center rounded-full bg-outline/40 group-hover:bg-primary transition-colors
          {isHorizontal ? 'w-1 h-8 my-auto' : 'h-1 w-8 mx-auto'}"
      ></div>
    {/if}
  </div>

  <!-- Right / Bottom Pane -->
  <div
    class="flex flex-col relative transition-all duration-75 {isRightCollapsed ? 'hidden' : 'flex-1'}"
    style={isHorizontal
      ? `width: ${isLeftCollapsed ? '100%' : `${100 - splitPercent}%`}; height: 100%;`
      : `height: ${isLeftCollapsed ? '100%' : `${100 - splitPercent}%`}; width: 100%;`}
  >
    {@render right()}
  </div>
</div>
