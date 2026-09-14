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

  // Helper to select all text in the editor
  const selectAllInEditor = () => {
    const model = editor.getModel();
    if (model) {
      editor.focus();
      try {
        editor.trigger('keyboard', 'editor.action.selectAll', null);
      } catch {
        // Fallback to manual model selection range
      }
      editor.setSelection(model.getFullModelRange());
    }
  };

  // Bind Ctrl+A / Cmd+A command explicitly to Monaco editor
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA, () => {
    selectAllInEditor();
  });

  // Also capture keyboard Ctrl+A / Cmd+A at DOM container level to ensure reliable selection
  const handleKeydown = (e: KeyboardEvent) => {
    if (
      (e.metaKey || e.ctrlKey) &&
      !e.shiftKey &&
      !e.altKey &&
      (e.key === 'a' || e.key === 'A' || e.code === 'KeyA')
    ) {
      const dom = editor.getDomNode();
      const activeEl = document.activeElement;
      const target = e.target as Node | null;

      if (
        editor.hasTextFocus() ||
        (dom && activeEl && dom.contains(activeEl)) ||
        (dom && target && dom.contains(target)) ||
        (target && node.contains(target))
      ) {
        e.preventDefault();
        e.stopPropagation();
        selectAllInEditor();
      }
    }
  };
  node.addEventListener('keydown', handleKeydown, true);

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
      if (newOptions.wordWrap !== undefined && newOptions.wordWrap !== options.wordWrap) {
        editor.updateOptions({ wordWrap: newOptions.wordWrap });
      }
      options = newOptions;
    },
    destroy() {
      try {
        node.removeEventListener('keydown', handleKeydown, true);
        resizeObserver.disconnect();
        disposable.dispose();
        editor.dispose();
      } catch (err) {
        console.warn('Error disposing Monaco editor:', err);
      }
    },
  };
};
