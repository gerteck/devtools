import type { Route, ToolItem } from './types';

export const TOOLS: ToolItem[] = [
  {
    id: 'json',
    name: 'JSON Formatter',
    version: 'v1.2',
    description: 'Format, validate, and inspect JSON payloads. Handles large inputs with collapsible trees and syntax highlighting.',
    tag: 'JSON / Schema',
    route: '/json',
    shortcutKey: '1',
    shortcutLabel: '⌘1',
    icon: '{ }',
  },
  {
    id: 'diff',
    name: 'Diff Checker',
    version: 'v1.0',
    description: 'Unified and split-pane text comparison for source code, configuration files, and raw text snippets.',
    tag: 'Text / Unified',
    route: '/diff',
    shortcutKey: '2',
    shortcutLabel: '⌘2',
    icon: 'difference',
  },
  {
    id: 'mermaid',
    name: 'Mermaid Studio',
    version: 'v0.9',
    description: 'Text-to-diagram editor supporting flowcharts, sequence diagrams, and class relations with SVG export.',
    tag: 'Diagrams / SVG',
    route: '/mermaid',
    shortcutKey: '3',
    shortcutLabel: '⌘3',
    icon: 'hub',
  },
];

class Router {
  currentRoute = $state<Route>(this.getRouteFromHash());

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        this.currentRoute = this.getRouteFromHash();
      });
    }
  }

  private getRouteFromHash(): Route {
    if (typeof window === 'undefined') return '/';
    const hash = window.location.hash.replace(/^#/, '');
    if (hash === '/json' || hash === '/diff' || hash === '/mermaid') {
      return hash;
    }
    return '/';
  }

  navigate(to: Route) {
    if (typeof window !== 'undefined') {
      window.location.hash = `#${to}`;
    }
  }
}

export const router = new Router();
