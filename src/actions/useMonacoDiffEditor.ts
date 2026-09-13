import type { Action } from 'svelte/action';
import { monaco } from '../utils/monaco';

export interface MonacoDiffOptions {
  original: string;
  modified: string;
  language: string;
  theme?: string;
  readOnly?: boolean;
  originalEditable?: boolean;
  renderSideBySide?: boolean;
  onModifiedChange?: (value: string) => void;
  onOriginalChange?: (value: string) => void;
}

export const useMonacoDiffEditor: Action<HTMLElement, MonacoDiffOptions> = (node, initialOptions) => {
  let options = initialOptions;
  let isInternalChange = false;

  const originalModel = monaco.editor.createModel(options.original, options.language);
  const modifiedModel = monaco.editor.createModel(options.modified, options.language);

  const diffEditor = monaco.editor.createDiffEditor(node, {
    theme: options.theme || 'devtools-dark',
    readOnly: options.readOnly ?? false,
    originalEditable: options.originalEditable ?? true,
    automaticLayout: true,
    fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace',
    fontSize: 13,
    lineHeight: 20,
    renderSideBySide: options.renderSideBySide ?? true,
    renderIndicators: true,
    enableSplitViewResizing: true,
    padding: { top: 12, bottom: 12 },
  });

  diffEditor.setModel({
    original: originalModel,
    modified: modifiedModel,
  });

  const origDisposable = originalModel.onDidChangeContent(() => {
    if (!isInternalChange && options.onOriginalChange) {
      options.onOriginalChange(originalModel.getValue());
    }
  });

  const modDisposable = modifiedModel.onDidChangeContent(() => {
    if (!isInternalChange && options.onModifiedChange) {
      options.onModifiedChange(modifiedModel.getValue());
    }
  });

  const resizeObserver = new ResizeObserver(() => {
    diffEditor.layout();
  });
  resizeObserver.observe(node);

  return {
    update(newOptions: MonacoDiffOptions) {
      if (newOptions.theme && newOptions.theme !== options.theme) {
        monaco.editor.setTheme(newOptions.theme);
      }
      if (newOptions.language && newOptions.language !== options.language) {
        monaco.editor.setModelLanguage(originalModel, newOptions.language);
        monaco.editor.setModelLanguage(modifiedModel, newOptions.language);
      }
      if (newOptions.renderSideBySide !== undefined && newOptions.renderSideBySide !== options.renderSideBySide) {
        diffEditor.updateOptions({ renderSideBySide: newOptions.renderSideBySide });
      }
      if (newOptions.originalEditable !== undefined && newOptions.originalEditable !== options.originalEditable) {
        diffEditor.updateOptions({ originalEditable: newOptions.originalEditable });
      }
      if (newOptions.original !== originalModel.getValue()) {
        isInternalChange = true;
        originalModel.setValue(newOptions.original);
        isInternalChange = false;
      }
      if (newOptions.modified !== modifiedModel.getValue()) {
        isInternalChange = true;
        modifiedModel.setValue(newOptions.modified);
        isInternalChange = false;
      }
      options = newOptions;
    },
    destroy() {
      try {
        resizeObserver.disconnect();
        origDisposable.dispose();
        modDisposable.dispose();
        diffEditor.setModel(null);
        diffEditor.dispose();
        originalModel.dispose();
        modifiedModel.dispose();
      } catch (err) {
        console.warn('Error disposing Monaco diff editor:', err);
      }
    },
  };
};
