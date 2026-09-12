import type { Action } from 'svelte/action';
import { monaco } from '../utils/monaco';

export interface MonacoEditorOptions {
  value: string;
  language: string;
  theme?: string;
  readOnly?: boolean;
  wordWrap?: 'on' | 'off';
  onChange?: (value: string) => void;
}

export const useMonacoEditor: Action<HTMLElement, MonacoEditorOptions> = (node, initialOptions) => {
  let options = initialOptions;
  let isInternalChange = false;

  const editor = monaco.editor.create(node, {
    value: options.value,
    language: options.language,
    theme: options.theme || 'devtools-dark',
    readOnly: options.readOnly ?? false,
    automaticLayout: true,
    fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace',
    fontSize: 13,
    lineHeight: 20,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: options.wordWrap ?? 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    renderLineHighlight: 'all',
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    padding: { top: 12, bottom: 12 },
  });

  const disposable = editor.onDidChangeModelContent(() => {
    if (!isInternalChange && options.onChange) {
      options.onChange(editor.getValue());
    }
  });

  // Observe resize to maintain layout responsiveness
  const resizeObserver = new ResizeObserver(() => {
    editor.layout();
  });
  resizeObserver.observe(node);

  return {
    update(newOptions: MonacoEditorOptions) {
      if (newOptions.theme && newOptions.theme !== options.theme) {
        monaco.editor.setTheme(newOptions.theme);
      }
      if (newOptions.language && newOptions.language !== options.language) {
        const model = editor.getModel();
        if (model) {
          monaco.editor.setModelLanguage(model, newOptions.language);
        }
      }
      if (newOptions.value !== editor.getValue()) {
        isInternalChange = true;
        editor.setValue(newOptions.value);
        isInternalChange = false;
      }
      if (newOptions.readOnly !== undefined && newOptions.readOnly !== options.readOnly) {
        editor.updateOptions({ readOnly: newOptions.readOnly });
      }
      options = newOptions;
    },
    destroy() {
      resizeObserver.disconnect();
      disposable.dispose();
      editor.dispose();
    },
  };
};
