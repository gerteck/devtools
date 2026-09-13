<script lang="ts">
  let {
    loader,
    name = 'Tool',
    props = {},
  }: {
    loader: () => Promise<{ default: any }>;
    name?: string;
    props?: Record<string, any>;
  } = $props();

  const componentCache: Record<string, any> =
    (globalThis as any).__devtools_component_cache ||
    ((globalThis as any).__devtools_component_cache = {});

  let LoadedComponent = $state<any>(null);
  let error = $state<string | null>(null);

  $effect(() => {
    if (componentCache[name]) {
      LoadedComponent = componentCache[name];
      return;
    }

    let active = true;
    loader()
      .then((m) => {
        if (active) {
          componentCache[name] = m.default;
          LoadedComponent = m.default;
        }
      })
      .catch((err) => {
        if (active) {
          error = err?.message || 'Failed to load module';
        }
      });

    return () => {
      active = false;
    };
  });
</script>

{#if LoadedComponent}
  <LoadedComponent {...props} />
{:else if error}
  <div class="flex-1 flex flex-col items-center justify-center p-8 font-mono text-xs text-rose-500">
    <p class="font-bold text-sm">Failed to load {name}</p>
    <p class="text-on-surface-variant mt-1.5">{error}</p>
    <button
      onclick={() => window.location.reload()}
      class="mt-4 px-3 py-1.5 rounded bg-surface border border-outline-variant text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
    >
      Reload Page
    </button>
  </div>
{:else}
  <div class="flex-1 flex items-center justify-center font-mono text-xs text-on-surface-variant gap-2.5">
    <div class="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    <span>Loading {name}...</span>
  </div>
{/if}
