import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import YAML from 'yaml';
import { Header } from './components/Header';
import { LeftPanel, LeftPanelHandle } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { validateYaml } from './utils/yamlValidator';
import { DOCKER_COMPOSE_SAMPLE, KUBERNETES_SAMPLE, BROKEN_SAMPLE } from './data/samples';

const SESSION_STORAGE_KEY = 'yaml_clean_session_v1';

export const App: React.FC = () => {
  // Load initial content from persisted local storage or default to Docker Compose sample
  const [yamlContent, setYamlContent] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved && saved.trim()) return saved;
    } catch {
      // LocalStorage access restricted or unavailable
    }
    return DOCKER_COMPOSE_SAMPLE || '';
  });

  // Default to dark mode
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(50);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const leftPanelRef = useRef<LeftPanelHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync dark mode class with <html> element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Debounced auto-save to LocalStorage to prevent work loss
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, yamlContent);
      } catch (err) {
        console.warn('Failed to auto-save session:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [yamlContent]);

  // In-browser validation engine execution
  const validationResult = useMemo(() => {
    return validateYaml(yamlContent);
  }, [yamlContent]);

  // Jump to specific line in editor
  const handleJumpToLine = useCallback((line: number, column?: number) => {
    leftPanelRef.current?.jumpToLine(line, column);
  }, []);

  // Load sample file
  const handleLoadSample = useCallback((sampleId: string) => {
    switch (sampleId) {
      case 'docker':
        setYamlContent(DOCKER_COMPOSE_SAMPLE);
        break;
      case 'k8s':
        setYamlContent(KUBERNETES_SAMPLE);
        break;
      case 'broken':
        setYamlContent(BROKEN_SAMPLE);
        break;
      case 'empty':
        setYamlContent('');
        break;
    }
  }, []);

  // Reset to default sample
  const handleResetToSample = useCallback(() => {
    if (window.confirm('Reset the editor to the default Docker Compose template? This clears your current session.')) {
      setYamlContent(DOCKER_COMPOSE_SAMPLE);
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {}
    }
  }, []);

  // Upload file handler
  const handleUploadFile = useCallback((content: string) => {
    setYamlContent(content);
  }, []);

  // Format / Prettify YAML (supports multi-document streams)
  const handleFormatYaml = useCallback(() => {
    try {
      const docs = YAML.parseAllDocuments(yamlContent, {
        keepSourceTokens: true,
        merge: true,
      });

      const firstErr = docs.find(d => d.errors.length > 0)?.errors[0];
      if (!firstErr) {
        setYamlContent(docs.map(d => d.toString().trim()).join('\n---\n') + '\n');
      } else {
        alert(`Cannot auto-format YAML with syntax errors:\n${firstErr.message}`);
      }
    } catch (err: any) {
      alert(`Format failed: ${err.message}`);
    }
  }, [yamlContent]);

  // Copy YAML
  const handleCopyYaml = useCallback(() => {
    navigator.clipboard.writeText(yamlContent);
  }, [yamlContent]);

  // Download YAML file
  const handleDownloadYaml = useCallback(() => {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [yamlContent]);

  // Resizable split divider drag handlers
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPercent = ((e.clientX - rect.left) / rect.width) * 100;
      if (newPercent >= 25 && newPercent <= 75) {
        setLeftWidthPercent(newPercent);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className={`h-screen w-screen flex flex-col ${darkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Top Header */}
      <Header
        validationResult={validationResult}
        onLoadSample={handleLoadSample}
        onUploadFile={handleUploadFile}
        onFormatYaml={handleFormatYaml}
        onCopyYaml={handleCopyYaml}
        onDownloadYaml={handleDownloadYaml}
        onResetToSample={handleResetToSample}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
      />

      {/* Main Two-Panel Split View */}
      <main
        ref={containerRef}
        className="flex-1 min-h-0 flex flex-col md:flex-row relative overflow-hidden"
      >
        {/* Left Panel: Source YAML Editor with Inline Linter */}
        <section
          style={{ width: `${leftWidthPercent}%` }}
          aria-label="YAML Editor Panel"
          className="h-full flex flex-col min-w-[280px]"
        >
          <LeftPanel
            ref={leftPanelRef}
            value={yamlContent}
            onChange={setYamlContent}
            validationResult={validationResult}
            darkMode={darkMode}
          />
        </section>

        {/* Resizable Divider */}
        <div
          onMouseDown={handleMouseDown}
          className={`hidden md:flex w-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-indigo-500 cursor-col-resize transition-colors items-center justify-center shrink-0 z-10 ${
            isResizing ? 'bg-indigo-500' : ''
          }`}
          title="Drag to resize panels"
        />

        {/* Right Panel: Validation, Anchors, Resolved YAML / Diff */}
        <section
          style={{ width: `${100 - leftWidthPercent}%` }}
          aria-label="Validation & Tools Panel"
          className="h-full flex flex-col min-w-[320px]"
        >
          <RightPanel
            validationResult={validationResult}
            currentYaml={yamlContent}
            onUpdateYaml={setYamlContent}
            onJumpToLine={handleJumpToLine}
          />
        </section>
      </main>
    </div>
  );
};
