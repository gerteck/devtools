import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import type { ColorScheme, ThemeMode } from '../types';

// Configure Monaco Environment for local web workers
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

// Register custom Mermaid syntax language in Monaco
if (!monaco.languages.getLanguages().some((l) => l.id === 'mermaid')) {
  monaco.languages.register({ id: 'mermaid' });

  monaco.languages.setMonarchTokensProvider('mermaid', {
    defaultToken: '',
    tokenPostfix: '.mermaid',

    keywords: [
      'graph',
      'flowchart',
      'sequenceDiagram',
      'classDiagram',
      'stateDiagram',
      'stateDiagram-v2',
      'erDiagram',
      'gantt',
      'pie',
      'gitGraph',
      'subgraph',
      'end',
      'participant',
      'actor',
      'activate',
      'deactivate',
      'loop',
      'alt',
      'else',
      'opt',
      'par',
      'critical',
      'option',
      'rect',
      'autonumber',
      'title',
      'note',
      'over',
      'left of',
      'right of',
      'class',
      'direction',
      'TB',
      'BT',
      'RL',
      'LR',
      'TD',
    ],

    typeKeywords: ['int', 'string', 'boolean', 'float', 'void', 'datetime'],

    operators: [
      '-->',
      '---',
      '-.->',
      '-.-',
      '==>',
      '===',
      '--o',
      '--x',
      '->>',
      '-->>',
      '-x',
      '--)',
      ':::',
      ':|>',
      '|',
      '..>',
      '..',
      '-->|',
      '--|',
    ],

    tokenizer: {
      root: [
        // Comments
        [/%%.*$/, 'comment'],

        // Strings
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],

        // Directives
        [/%%{[^}]+}%%/, 'meta'],

        // IDs & Node shapes
        [/\[.*?\]/, 'type'],
        [/\(.*?\)/, 'string'],
        [/\{.*?\}/, 'keyword'],
        [/>.*?\]/, 'type'],

        // Keywords and identifiers
        [
          /[a-zA-Z_][\w-]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@typeKeywords': 'type',
              '@default': 'identifier',
            },
          },
        ],

        // Arrows & Operators
        [/[->=.:|~+*]{1,4}/, 'operator'],

        // Whitespace
        { include: '@whitespace' },
      ],

      whitespace: [[/[ \t\r\n]+/, 'white']],
    },
  });
}

// Register custom PlantUML syntax language in Monaco
if (!monaco.languages.getLanguages().some((l) => l.id === 'plantuml')) {
  monaco.languages.register({ id: 'plantuml' });

  monaco.languages.setMonarchTokensProvider('plantuml', {
    defaultToken: '',
    tokenPostfix: '.plantuml',

    keywords: [
      'actor',
      'participant',
      'boundary',
      'control',
      'entity',
      'database',
      'collections',
      'queue',
      'class',
      'interface',
      'abstract',
      'enum',
      'package',
      'node',
      'folder',
      'frame',
      'cloud',
      'component',
      'state',
      'note',
      'left',
      'right',
      'of',
      'over',
      'as',
      'autonumber',
      'title',
      'header',
      'footer',
      'legend',
      'alt',
      'else',
      'opt',
      'loop',
      'par',
      'break',
      'critical',
      'group',
      'box',
      'end',
      'skinparam',
      'hide',
      'show',
      'activate',
      'deactivate',
      'return',
      'destroy',
    ],

    operators: ['->', '-->', '<--', '<-', '->>', '-->>', '..>', '<..', '*--', 'o--', '--', '=='],

    tokenizer: {
      root: [
        // Comments
        [/'[^'\n]*$/, 'comment'],
        [/\/'[\s\S]*?'\//, 'comment'],

        // Strings
        [/"([^"\\]|\\.)*"/, 'string'],

        // Directives and headers
        [/^!.*$/, 'meta'],
        [/@@(startuml|enduml)/, 'keyword'],

        // Keywords and identifiers
        [
          /[a-zA-Z_][\w-]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          },
        ],

        // Arrows & Operators
        [/[-><=.*o:]{1,4}/, 'operator'],

        // Whitespace
        { include: '@whitespace' },
      ],

      whitespace: [[/[ \t\r\n]+/, 'white']],
    },
  });
}

// --- THEMES ---

// 1. Default (Zinc) Dark
const defaultDarkDef: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
      { token: 'operator', foreground: '38bdf8' },
      { token: 'string', foreground: '34d399' },
      { token: 'type', foreground: 'fbbf24' },
      { token: 'identifier', foreground: 'e4e4e7' },
    ],
    colors: {
      'editor.background': '#121215',
      'editor.foreground': '#f4f4f5',
      'editorLineNumber.foreground': '#52525b',
      'editorLineNumber.activeForeground': '#a1a1aa',
      'editor.lineHighlightBackground': '#1c1c21',
      'editorGutter.background': '#121215',
      'editorCursor.foreground': '#818cf8',
      'editor.selectionBackground': '#3730a380',
    },
  };
  monaco.editor.defineTheme('devtools-dark', defaultDarkDef);
  monaco.editor.defineTheme('theme-default-dark', defaultDarkDef);

  // 1. Default (Zinc) Light
  const defaultLightDef: monaco.editor.IStandaloneThemeData = {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' },
      { token: 'keyword', foreground: '3525cd', fontStyle: 'bold' },
      { token: 'operator', foreground: '0284c7' },
      { token: 'string', foreground: '059669' },
      { token: 'type', foreground: 'd97706' },
      { token: 'identifier', foreground: '09090b' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#09090b',
      'editorLineNumber.foreground': '#a1a1aa',
      'editorLineNumber.activeForeground': '#09090b',
      'editor.lineHighlightBackground': '#f4f4f6',
      'editorGutter.background': '#ffffff',
      'editorCursor.foreground': '#3525cd',
      'editor.selectionBackground': '#eef2ff',
    },
  };
  monaco.editor.defineTheme('devtools-light', defaultLightDef);
  monaco.editor.defineTheme('theme-default-light', defaultLightDef);

  // 2. Gruvbox Dark
  monaco.editor.defineTheme('theme-gruvbox-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '928374', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'fb4934', fontStyle: 'bold' },
      { token: 'operator', foreground: 'fe8019' },
      { token: 'string', foreground: 'b8bb26' },
      { token: 'type', foreground: 'fabd2f' },
      { token: 'identifier', foreground: 'ebdbb2' },
    ],
    colors: {
      'editor.background': '#1d2021',
      'editor.foreground': '#ebdbb2',
      'editorLineNumber.foreground': '#665c54',
      'editorLineNumber.activeForeground': '#ebdbb2',
      'editor.lineHighlightBackground': '#282828',
      'editorGutter.background': '#1d2021',
      'editorCursor.foreground': '#fe8019',
      'editor.selectionBackground': '#50494580',
    },
  });

  // 2. Gruvbox Light
  monaco.editor.defineTheme('theme-gruvbox-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '928374', fontStyle: 'italic' },
      { token: 'keyword', foreground: '9d0006', fontStyle: 'bold' },
      { token: 'operator', foreground: 'af3a03' },
      { token: 'string', foreground: '79740e' },
      { token: 'type', foreground: 'b57614' },
      { token: 'identifier', foreground: '3c3836' },
    ],
    colors: {
      'editor.background': '#f9f5d7',
      'editor.foreground': '#3c3836',
      'editorLineNumber.foreground': '#bdae93',
      'editorLineNumber.activeForeground': '#3c3836',
      'editor.lineHighlightBackground': '#ebdbb2',
      'editorGutter.background': '#f9f5d7',
      'editorCursor.foreground': '#af3a03',
      'editor.selectionBackground': '#d5c4a180',
    },
  });

  // 3. Catppuccin Dark (Mocha)
  monaco.editor.defineTheme('theme-catppuccin-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'cba6f7', fontStyle: 'bold' },
      { token: 'operator', foreground: '89dceb' },
      { token: 'string', foreground: 'a6e3a1' },
      { token: 'type', foreground: 'f9e2af' },
      { token: 'identifier', foreground: 'cdd6f4' },
    ],
    colors: {
      'editor.background': '#181825',
      'editor.foreground': '#cdd6f4',
      'editorLineNumber.foreground': '#585b70',
      'editorLineNumber.activeForeground': '#cdd6f4',
      'editor.lineHighlightBackground': '#313244',
      'editorGutter.background': '#181825',
      'editorCursor.foreground': '#cba6f7',
      'editor.selectionBackground': '#45475a80',
    },
  });

  // 3. Catppuccin Light (Latte)
  monaco.editor.defineTheme('theme-catppuccin-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '9ca0b0', fontStyle: 'italic' },
      { token: 'keyword', foreground: '8839ef', fontStyle: 'bold' },
      { token: 'operator', foreground: '04a5e5' },
      { token: 'string', foreground: '40a02b' },
      { token: 'type', foreground: 'df8e1d' },
      { token: 'identifier', foreground: '4c4f69' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#4c4f69',
      'editorLineNumber.foreground': '#bcc0cc',
      'editorLineNumber.activeForeground': '#4c4f69',
      'editor.lineHighlightBackground': '#e6e9ef',
      'editorGutter.background': '#ffffff',
      'editorCursor.foreground': '#8839ef',
      'editor.selectionBackground': '#ccd0da80',
    },
  });

  // 4. Nord Dark
  monaco.editor.defineTheme('theme-nord-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
      { token: 'keyword', foreground: '81a1c1', fontStyle: 'bold' },
      { token: 'operator', foreground: '88c0d0' },
      { token: 'string', foreground: 'a3be8c' },
      { token: 'type', foreground: 'ebcb8b' },
      { token: 'identifier', foreground: 'eceff4' },
    ],
    colors: {
      'editor.background': '#242933',
      'editor.foreground': '#eceff4',
      'editorLineNumber.foreground': '#4c566a',
      'editorLineNumber.activeForeground': '#d8dee9',
      'editor.lineHighlightBackground': '#2e3440',
      'editorGutter.background': '#242933',
      'editorCursor.foreground': '#88c0d0',
      'editor.selectionBackground': '#434c5e80',
    },
  });

  // 4. Nord Light
  monaco.editor.defineTheme('theme-nord-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '9baec8', fontStyle: 'italic' },
      { token: 'keyword', foreground: '5e81ac', fontStyle: 'bold' },
      { token: 'operator', foreground: '88c0d0' },
      { token: 'string', foreground: '8fbcbb' },
      { token: 'type', foreground: 'd08770' },
      { token: 'identifier', foreground: '2e3440' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#2e3440',
      'editorLineNumber.foreground': '#d8dee9',
      'editorLineNumber.activeForeground': '#2e3440',
      'editor.lineHighlightBackground': '#e5e9f0',
      'editorGutter.background': '#ffffff',
      'editorCursor.foreground': '#5e81ac',
      'editor.selectionBackground': '#eceff4',
    },
  });

export function getMonacoThemeName(scheme: ColorScheme, mode: ThemeMode): string {
  return `theme-${scheme}-${mode}`;
}

export { monaco };
