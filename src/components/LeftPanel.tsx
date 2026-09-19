import React, { useRef, useImperativeHandle, forwardRef, useState, useMemo } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { linter, Diagnostic } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';
import { Trash2, Clipboard, WrapText, ArrowDownToLine, Files } from 'lucide-react';
import { ValidationResult } from '../types/yaml';

export interface LeftPanelHandle {
  jumpToLine: (line: number, column?: number) => void;
}

interface LeftPanelProps {
  value: string;
  onChange: (val: string) => void;
  validationResult: ValidationResult;
  darkMode: boolean;
}

export const LeftPanel = forwardRef<LeftPanelHandle, LeftPanelProps>(({
  value,
  onChange,
  validationResult,
  darkMode,
}, ref) => {
  const cmRef = useRef<ReactCodeMirrorRef>(null);
  const [wrapLines, setWrapLines] = useState(false);
  const [jumpFeedback, setJumpFeedback] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Expose jumpToLine method to parent component
  useImperativeHandle(ref, () => ({
    jumpToLine: (line: number, column: number = 1) => {
      const view = cmRef.current?.view;
      if (!view) return;

      try {
        const doc = view.state.doc;
        const targetLineNum = Math.max(1, Math.min(line, doc.lines));
        const lineInfo = doc.line(targetLineNum);
        const colPos = Math.min(lineInfo.from + (column - 1), lineInfo.to);

        view.dispatch({
          selection: { anchor: colPos, head: colPos },
          scrollIntoView: true,
        });
        view.focus();

        setJumpFeedback(`Jumped to line ${targetLineNum}`);
        setTimeout(() => setJumpFeedback(null), 2500);
      } catch (err) {
        console.warn('Failed to jump to line:', err);
      }
    },
  }));

  const handleClear = () => {
    if (value && window.confirm('Clear the current YAML content?')) {
      onChange('');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text);
      }
    } catch {
      alert('Clipboard access denied. Please use Cmd+V / Ctrl+V to paste directly into the editor.');
    }
  };

  // Drag and drop handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        if (typeof text === 'string') {
          onChange(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // CodeMirror native linter extension mapped from our validation results
  const yamlLinter = useMemo(() => {
    return linter(view => {
      const diagnostics: Diagnostic[] = [];
      const doc = view.state.doc;

      for (const issue of validationResult.issues) {
        const lineNum = Math.max(1, Math.min(issue.line, doc.lines));
        const lineInfo = doc.line(lineNum);
        const from = Math.min(lineInfo.from + Math.max(0, issue.column - 1), lineInfo.to);
        const to = Math.max(from + 1, lineInfo.to);

        let severity: 'error' | 'warning' | 'info' = 'error';
        if (issue.severity === 'warning') severity = 'warning';
        else if (issue.severity === 'info') severity = 'info';

        let source = 'Syntax';
        if (issue.source === 'anchor') source = 'Anchor';
        else if (issue.source === 'security') source = 'Security';
        else if (issue.source === 'schema') source = 'Schema';

        diagnostics.push({
          from,
          to,
          severity,
          source,
          message: issue.message + (issue.suggestion ? `\n\n💡 ${issue.suggestion}` : ''),
        });
      }

      return diagnostics;
    });
  }, [validationResult.issues]);

  const extensions = useMemo(() => {
    const ext = [yaml(), yamlLinter];
    if (wrapLines) {
      ext.push(EditorView.lineWrapping);
    }
    return ext;
  }, [yamlLinter, wrapLines]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`h-full flex flex-col relative transition-colors ${
        isDragOver ? 'ring-2 ring-indigo-500 bg-indigo-950/20' : ''
      }`}
    >
      {/* Editor Sub-Header */}
      <div className="h-10 px-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
            YAML Source Editor
          </span>
          <span className="text-zinc-400 dark:text-zinc-600">|</span>
          <span>{validationResult.stats.lines} lines</span>
          <span className="text-zinc-400 dark:text-zinc-600">•</span>
          <span>{formatSize(validationResult.stats.bytes)}</span>

          {validationResult.stats.documentCount > 1 && (
            <>
              <span className="text-zinc-400 dark:text-zinc-600">•</span>
              <span className="flex items-center gap-1 font-mono text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded">
                <Files className="w-2.5 h-2.5" />
                {validationResult.stats.documentCount} Docs
              </span>
            </>
          )}

          {jumpFeedback && (
            <span className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium animate-fade-in bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              <ArrowDownToLine className="w-3 h-3" />
              {jumpFeedback}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWrapLines(!wrapLines)}
            title={wrapLines ? 'Disable line wrap' : 'Enable line wrap'}
            className={`flex items-center gap-1 px-1.5 py-1 rounded transition-colors ${
              wrapLines
                ? 'bg-indigo-600 text-white font-medium'
                : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <WrapText className="w-3.5 h-3.5" />
            <span className="text-[11px]">Wrap Lines</span>
          </button>

          <button
            onClick={handlePaste}
            title="Paste from clipboard"
            className="flex items-center gap-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 px-1.5 py-1 rounded transition-colors"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span className="text-[11px]">Paste</span>
          </button>

          <button
            onClick={handleClear}
            title="Clear editor"
            className="flex items-center gap-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 px-1.5 py-1 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Clear</span>
          </button>
        </div>
      </div>

      {/* Drag & drop overlay indicator */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-indigo-950/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none border-2 border-dashed border-indigo-400">
          <p className="text-base font-medium text-white">Drop YAML file to inspect</p>
          <p className="text-xs text-indigo-200 mt-1">Validation and anchor analysis run in-browser instantly</p>
        </div>
      )}

      {/* CodeMirror Editor with Native Linter & Gutter Diagnostics */}
      <div className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-[#282c34] text-zinc-900 dark:text-zinc-100">
        <CodeMirror
          ref={cmRef}
          value={value}
          height="100%"
          theme={darkMode ? oneDark : 'light'}
          extensions={extensions}
          onChange={onChange}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
          className="h-full"
        />
      </div>
    </div>
  );
});

LeftPanel.displayName = 'LeftPanel';
