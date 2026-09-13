import type { Action } from 'svelte/action';
import mermaid from 'mermaid';

import type { ColorScheme, ThemeMode } from '../types';

export interface MermaidRenderOptions {
  code: string;
  scheme?: ColorScheme;
  theme?: ThemeMode;
  onError?: (err: Error | null) => void;
  onSuccess?: (svgNode: SVGSVGElement) => void;
}

let renderIdCounter = 0;

export const useMermaidRender: Action<HTMLElement, MermaidRenderOptions> = (node, initialOptions) => {
  let options = initialOptions;

  function initMermaid(scheme: ColorScheme = 'default', mode: ThemeMode = 'dark') {
    let themeVars: Record<string, any>;

    if (scheme === 'gruvbox') {
      themeVars = mode === 'dark'
        ? {
            darkMode: true,
            background: '#1d2021',
            primaryColor: '#3c3836',
            primaryTextColor: '#ebdbb2',
            primaryBorderColor: '#fe8019',
            lineColor: '#fabd2f',
            secondaryColor: '#504945',
            tertiaryColor: '#282828',
          }
        : {
            darkMode: false,
            background: '#f9f5d7',
            primaryColor: '#ebdbb2',
            primaryTextColor: '#282828',
            primaryBorderColor: '#af3a03',
            lineColor: '#b57614',
          };
    } else if (scheme === 'catppuccin') {
      themeVars = mode === 'dark'
        ? {
            darkMode: true,
            background: '#181825',
            primaryColor: '#313244',
            primaryTextColor: '#cdd6f4',
            primaryBorderColor: '#cba6f7',
            lineColor: '#89b4fa',
            secondaryColor: '#45475a',
            tertiaryColor: '#1e1e2e',
          }
        : {
            darkMode: false,
            background: '#ffffff',
            primaryColor: '#e6e9ef',
            primaryTextColor: '#4c4f69',
            primaryBorderColor: '#8839ef',
            lineColor: '#1e66f5',
          };
    } else if (scheme === 'nord') {
      themeVars = mode === 'dark'
        ? {
            darkMode: true,
            background: '#242933',
            primaryColor: '#3b4252',
            primaryTextColor: '#eceff4',
            primaryBorderColor: '#88c0d0',
            lineColor: '#81a1c1',
            secondaryColor: '#434c5e',
            tertiaryColor: '#2e3440',
          }
        : {
            darkMode: false,
            background: '#ffffff',
            primaryColor: '#e5e9f0',
            primaryTextColor: '#2e3440',
            primaryBorderColor: '#5e81ac',
            lineColor: '#81a1c1',
          };
    } else {
      // Default (Zinc)
      themeVars = mode === 'dark'
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
          };
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: mode === 'dark' ? 'dark' : 'neutral',
      securityLevel: 'loose',
      fontFamily: '"JetBrains Mono", Inter, monospace',
      themeVariables: themeVars,
    });
  }

  async function renderDiagram(opts: MermaidRenderOptions) {
    if (!opts.code || !opts.code.trim()) {
      node.innerHTML = '';
      opts.onError?.(null);
      return;
    }

    initMermaid(opts.scheme, opts.theme);

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
