import type { Action } from 'svelte/action';
import mermaid from 'mermaid';

import type { ColorScheme, ThemeMode } from '../types';

export interface MermaidRenderOptions {
  code: string;
  config?: string;
  scheme?: ColorScheme;
  theme?: ThemeMode;
  onError?: (err: Error | null) => void;
  onSuccess?: (svgNode: SVGSVGElement) => void;
}

let renderIdCounter = 0;

export const useMermaidRender: Action<HTMLElement, MermaidRenderOptions> = (node, initialOptions) => {
  let options = initialOptions;

  function initMermaid(
    scheme: ColorScheme = 'default',
    mode: ThemeMode = 'dark',
    customConfigStr?: string
  ) {
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

    let userConfig: Record<string, any> = {};
    if (customConfigStr && customConfigStr.trim()) {
      try {
        userConfig = JSON.parse(customConfigStr);
      } catch {
        // Ignore JSON syntax errors during active editing
      }
    }

    const requestedTheme = userConfig.theme;
    const finalConfig: any = {
      startOnLoad: false,
      suppressErrorRendering: true,
      securityLevel: 'loose',
      fontFamily: '"JetBrains Mono", Inter, monospace',
      ...userConfig,
    };

    // If no theme specified or theme is 'auto' or 'base', apply palette variables
    if (!requestedTheme || requestedTheme === 'auto' || requestedTheme === 'base') {
      finalConfig.theme = 'base';
      finalConfig.themeVariables = {
        ...themeVars,
        ...(userConfig.themeVariables || {}),
      };
    } else {
      finalConfig.theme = requestedTheme;
      if (userConfig.themeVariables) {
        finalConfig.themeVariables = userConfig.themeVariables;
      }
    }

    mermaid.initialize(finalConfig);
  }

  function cleanupStrayMermaidNodes(renderId: string) {
    try {
      const strayError = document.getElementById('d' + renderId);
      if (strayError && !node.contains(strayError)) strayError.remove();

      // Clean up any stray elements appended directly to document body by Mermaid
      document
        .querySelectorAll('body > [id^="dmermaid"], body > [id^="mermaid-svg-"], body > .mermaid-error')
        .forEach((el) => {
          if (!node.contains(el)) el.remove();
        });
    } catch {
      // Ignore DOM cleanup errors
    }
  }

  let renderTimer: ReturnType<typeof setTimeout> | null = null;
  let renderSeq = 0;

  async function renderDiagram(opts: MermaidRenderOptions) {
    const currentSeq = ++renderSeq;

    if (!opts.code || !opts.code.trim()) {
      node.innerHTML = '';
      opts.onError?.(null);
      return;
    }

    try {
      initMermaid(opts.scheme, opts.theme, opts.config);
    } catch (err) {
      console.warn('Failed to re-initialize Mermaid:', err);
    }

    const renderId = `mermaid-svg-${Date.now()}-${++renderIdCounter}`;

    try {
      // Test syntax parse first
      await mermaid.parse(opts.code);

      // Render the diagram
      const { svg } = await mermaid.render(renderId, opts.code);

      // Discard stale renders if another render was triggered while this was processing
      if (currentSeq !== renderSeq) return;

      node.innerHTML = svg;

      const svgElement = node.querySelector('svg');
      if (svgElement) {
        svgElement.style.maxWidth = '100%';
        svgElement.style.height = 'auto';
        svgElement.style.display = 'block';
        opts.onSuccess?.(svgElement);
      }

      cleanupStrayMermaidNodes(renderId);
      opts.onError?.(null);
    } catch (err: any) {
      if (currentSeq !== renderSeq) return;

      cleanupStrayMermaidNodes(renderId);

      const rawMsg = err?.message || String(err);
      // Clean up cryptic internal parser stack traces to show concise message
      const firstLine = rawMsg.split('\n')[0].replace(/^Error:\s*/, '');
      opts.onError?.(new Error(firstLine || 'Invalid Mermaid syntax.'));
    }
  }

  renderDiagram(options);

  return {
    update(newOptions: MermaidRenderOptions) {
      options = newOptions;
      if (renderTimer) clearTimeout(renderTimer);
      renderTimer = setTimeout(() => {
        renderDiagram(options);
      }, 120);
    },
    destroy() {
      if (renderTimer) clearTimeout(renderTimer);
      node.innerHTML = '';
    },
  };
};
