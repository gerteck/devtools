import type { Action } from 'svelte/action';
import mermaid from 'mermaid';

export interface MermaidRenderOptions {
  code: string;
  theme?: 'dark' | 'light';
  onError?: (err: Error | null) => void;
  onSuccess?: (svgNode: SVGSVGElement) => void;
}

let renderIdCounter = 0;

export const useMermaidRender: Action<HTMLElement, MermaidRenderOptions> = (node, initialOptions) => {
  let options = initialOptions;

  function initMermaid(theme: 'dark' | 'light' = 'dark') {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'neutral',
      securityLevel: 'loose',
      fontFamily: '"JetBrains Mono", Inter, monospace',
      themeVariables:
        theme === 'dark'
          ? {
              darkMode: true,
              background: '#121215',
              primaryColor: '#312e81',
              primaryTextColor: '#f4f4f5',
              primaryBorderColor: '#6366f1',
              lineColor: '#818cf8',
              secondaryColor: '#1e1b4b',
              tertiaryColor: '#18181b',
            }
          : {
              darkMode: false,
              background: '#ffffff',
              primaryColor: '#eef2ff',
              primaryTextColor: '#09090b',
              primaryBorderColor: '#3525cd',
              lineColor: '#4f46e5',
            },
    });
  }

  async function renderDiagram(opts: MermaidRenderOptions) {
    if (!opts.code || !opts.code.trim()) {
      node.innerHTML = '';
      opts.onError?.(null);
      return;
    }

    initMermaid(opts.theme);

    const renderId = `mermaid-svg-${Date.now()}-${++renderIdCounter}`;

    try {
      // Test syntax parse first
      await mermaid.parse(opts.code);

      // Render the diagram
      const { svg } = await mermaid.render(renderId, opts.code);
      node.innerHTML = svg;

      const svgElement = node.querySelector('svg');
      if (svgElement) {
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';
        svgElement.style.maxWidth = '100%';
        svgElement.style.display = 'block';
        opts.onSuccess?.(svgElement);
      }

      opts.onError?.(null);
    } catch (err: any) {
      // Clean up any stray error elements inserted into the DOM by Mermaid
      const strayError = document.getElementById('d' + renderId);
      if (strayError) strayError.remove();
      const strayRender = document.getElementById(renderId);
      if (strayRender && strayRender !== node) strayRender.remove();

      const message = err?.message || String(err);
      opts.onError?.(new Error(message));
    }
  }

  renderDiagram(options);

  return {
    update(newOptions: MermaidRenderOptions) {
      options = newOptions;
      renderDiagram(options);
    },
    destroy() {
      node.innerHTML = '';
    },
  };
};
