import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

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

  // Define dark theme tokens
  monaco.editor.defineTheme('devtools-dark', {
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
  });

  // Define light theme tokens
  monaco.editor.defineTheme('devtools-light', {
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
  });
}

export { monaco };
