import type { Route, ToolItem } from './types';

export const TOOLS: ToolItem[] = $state([
  {
    id: 'notepad',
    name: 'Developer Notepad',
    description: 'Multi-tab developer scratchpad with syntax highlighting, case transforms, line utilities, and markdown preview.',
    tag: 'Notes / Utilities',
    route: '/notepad',
    shortcutKey: '1',
    shortcutLabel: '⌘1',
    icon: 'notebook-pen',
  },
  {
    id: 'json',
    name: 'JSON Formatter',
    description: 'Format, validate, and inspect JSON payloads. Handles large inputs with collapsible trees and syntax highlighting.',
    tag: 'JSON / Schema',
    route: '/json',
    shortcutKey: '2',
    shortcutLabel: '⌘2',
    icon: '{ }',
  },
  {
    id: 'diff',
    name: 'Diff Checker',
    description: 'Unified and split-pane text comparison for source code, configuration files, and raw text snippets.',
    tag: 'Text / Unified',
    route: '/diff',
    shortcutKey: '3',
    shortcutLabel: '⌘3',
    icon: 'difference',
  },
  {
    id: 'mermaid',
    name: 'Mermaid Studio',
    version: 'v11.17.2',
    description: 'Text-to-diagram editor supporting flowcharts, sequence diagrams, and class relations with SVG export.',
    tag: 'Diagrams / SVG',
    route: '/mermaid',
    shortcutKey: '4',
    shortcutLabel: '⌘4',
    icon: 'hub',
  },
  {
    id: 'plantuml',
    name: 'PlantUML Studio',
    version: 'v1.2026.8',
    description: 'Component, sequence, and class diagrams with cloud encoding, pan-zoom viewer, and high-res export.',
    tag: 'UML / Cloud',
    route: '/plantuml',
    shortcutKey: '5',
    shortcutLabel: '⌘5',
    icon: 'network',
  },
  {
    id: 'sqlite',
    name: 'SQLite Viewer',
    version: 'v3.53.4',
    description: 'Inspect, query, and export SQLite databases client-side with full .wal write-ahead log support.',
    tag: 'Database / SQL',
    route: '/sqlite',
    shortcutKey: '6',
    shortcutLabel: '⌘6',
    icon: 'database',
  },
]);

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
    if (
      hash === '/notepad' ||
      hash === '/json' ||
      hash === '/diff' ||
      hash === '/mermaid' ||
      hash === '/plantuml' ||
      hash === '/sqlite'
    ) {
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
