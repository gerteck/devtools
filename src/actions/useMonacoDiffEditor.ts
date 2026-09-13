import type { Action } from 'svelte/action';
import { monaco } from '../utils/monaco';

export interface DiffStats {
  changesCount: number;
  additions: number;
  deletions: number;
}

export interface MonacoDiffEditorControls {
  goToDiff: (target: 'next' | 'previous') => void;
  getLineChanges: () => monaco.editor.ILineChange[] | null;
}

export interface MonacoDiffOptions {
  original: string;
  modified: string;
  language: string;
  theme?: string;
  readOnly?: boolean;
  originalEditable?: boolean;
  renderSideBySide?: boolean;
  hideUnchangedRegions?: boolean;
  contextLineCount?: number;
  minimumLineCount?: number;
  ignoreTrimWhitespace?: boolean;
  onModifiedChange?: (value: string) => void;
  onOriginalChange?: (value: string) => void;
  onDiffStatsChange?: (stats: DiffStats) => void;
  onInitControls?: (controls: MonacoDiffEditorControls) => void;
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
    ignoreTrimWhitespace: options.ignoreTrimWhitespace ?? false,
    padding: { top: 12, bottom: 12 },
    hideUnchangedRegions: {
      enabled: options.hideUnchangedRegions ?? false,
      contextLineCount: options.contextLineCount ?? 3,
      minimumLineCount: options.minimumLineCount ?? 3,
      revealLineCount: 20,
    },
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

  const computeStats = () => {
    const lineChanges = diffEditor.getLineChanges();
    if (!lineChanges) {
      options.onDiffStatsChange?.({ changesCount: 0, additions: 0, deletions: 0 });
      return;
    }
    let additions = 0;
    let deletions = 0;
    for (const change of lineChanges) {
      if (change.modifiedEndLineNumber >= change.modifiedStartLineNumber && change.modifiedStartLineNumber > 0) {
        additions += (change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1);
      }
      if (change.originalEndLineNumber >= change.originalStartLineNumber && change.originalStartLineNumber > 0) {
        deletions += (change.originalEndLineNumber - change.originalStartLineNumber + 1);
      }
    }
    options.onDiffStatsChange?.({
      changesCount: lineChanges.length,
      additions,
      deletions,
    });
  };

  const diffDisposable = diffEditor.onDidUpdateDiff(() => {
    computeStats();
  });

  if (options.onInitControls) {
    options.onInitControls({
      goToDiff: (target) => diffEditor.goToDiff(target),
      getLineChanges: () => diffEditor.getLineChanges(),
    });
  }
  const originalEditor = diffEditor.getOriginalEditor();
  const modifiedEditor = diffEditor.getModifiedEditor();

  // Helper to select all text in a specific editor
  const selectAllInEditor = (ed: monaco.editor.ICodeEditor) => {
    const model = ed.getModel();
    if (model) {
      ed.focus();
      try {
        ed.trigger('keyboard', 'editor.action.selectAll', null);
      } catch {
        // Fallback
      }
      ed.setSelection(model.getFullModelRange());
    }
  };

  // Bind Ctrl+A / Cmd+A command explicitly to both inner code editors
  originalEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA, () => {
    selectAllInEditor(originalEditor);
  });
  modifiedEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA, () => {
    selectAllInEditor(modifiedEditor);
  });

  // Also capture keyboard Ctrl+A / Cmd+A at DOM container level to ensure reliable selection
  const handleKeydown = (e: KeyboardEvent) => {
    if (
      (e.metaKey || e.ctrlKey) &&
      !e.shiftKey &&
      !e.altKey &&
      (e.key === 'a' || e.key === 'A' || e.code === 'KeyA')
    ) {
      const origDom = originalEditor.getDomNode();
      const modDom = modifiedEditor.getDomNode();
      const activeEl = document.activeElement;

      if (originalEditor.hasTextFocus() || (origDom && activeEl && origDom.contains(activeEl))) {
        e.preventDefault();
        e.stopPropagation();
        selectAllInEditor(originalEditor);
      } else if (modifiedEditor.hasTextFocus() || (modDom && activeEl && modDom.contains(activeEl))) {
        e.preventDefault();
        e.stopPropagation();
        selectAllInEditor(modifiedEditor);
      }
    }
  };
  node.addEventListener('keydown', handleKeydown, true);

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
      if (newOptions.ignoreTrimWhitespace !== undefined && newOptions.ignoreTrimWhitespace !== options.ignoreTrimWhitespace) {
        diffEditor.updateOptions({ ignoreTrimWhitespace: newOptions.ignoreTrimWhitespace });
      }
      if (
        newOptions.hideUnchangedRegions !== options.hideUnchangedRegions ||
        newOptions.contextLineCount !== options.contextLineCount ||
        newOptions.minimumLineCount !== options.minimumLineCount
      ) {
        diffEditor.updateOptions({
          hideUnchangedRegions: {
            enabled: newOptions.hideUnchangedRegions ?? false,
            contextLineCount: newOptions.contextLineCount ?? 3,
            minimumLineCount: newOptions.minimumLineCount ?? 3,
            revealLineCount: 20,
          },
        });
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
        node.removeEventListener('keydown', handleKeydown, true);
        resizeObserver.disconnect();
        origDisposable.dispose();
        modDisposable.dispose();
        diffDisposable.dispose();
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
