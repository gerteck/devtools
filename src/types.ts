export type Route = '/' | '/json' | '/diff' | '/mermaid' | '/plantuml' | '/sqlite';

export type ColorScheme = 'default' | 'gruvbox' | 'catppuccin' | 'nord';
export type ThemeMode = 'dark' | 'light';

export interface ToolItem {
  id: string;
  name: string;
  version?: string;
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
