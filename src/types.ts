export type Route = '/' | '/json' | '/diff' | '/mermaid';

export interface ToolItem {
  id: string;
  name: string;
  version: string;
  description: string;
  tag: string;
  route: Route;
  shortcutKey: string;
  shortcutLabel: string;
  icon: string;
}

export interface JsonError {
  message: string;
  line?: number;
  column?: number;
}
