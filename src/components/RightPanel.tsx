import React, { useState } from 'react';
import {
  AlertCircle,
  GitFork,
  FileCheck,
} from 'lucide-react';
import { ValidationResult } from '../types/yaml';
import { DiagnosticsTab } from './tabs/DiagnosticsTab';
import { AnchorsTab } from './tabs/AnchorsTab';
import { ResolvedTab } from './tabs/ResolvedTab';

type RightPanelTab = 'diagnostics' | 'anchors' | 'resolved';

interface RightPanelProps {
  validationResult: ValidationResult;
  currentYaml: string;
  onUpdateYaml: (newYaml: string) => void;
  onJumpToLine: (line: number, column?: number) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  validationResult,
  currentYaml,
  onJumpToLine,
}) => {
  const [activeTab, setActiveTab] = useState<RightPanelTab>('diagnostics');

  const errorCount = validationResult.issues.filter(i => i.severity === 'error').length;
  const warningCount = validationResult.issues.filter(i => i.severity === 'warning').length;
  const totalIssues = errorCount + warningCount;

  return (
    <div className="h-full flex flex-col bg-slate-50/70 dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 select-none transition-colors">
      {/* Tab Navigation Header */}
      <div className="h-10 px-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/60 flex items-center justify-between shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1">
          {/* Diagnostics Tab */}
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'diagnostics'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <AlertCircle
              className={`w-3.5 h-3.5 ${
                errorCount > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : warningCount > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            />
            <span>Validation</span>
            {totalIssues > 0 && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  errorCount > 0
                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                }`}
              >
                {totalIssues}
              </span>
            )}
          </button>

          {/* Anchors & Aliases Tab */}
          <button
            onClick={() => setActiveTab('anchors')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'anchors'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Anchors &amp; Merges</span>
            {validationResult.stats.anchorCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                {validationResult.stats.anchorCount}
              </span>
            )}
          </button>

          {/* Resolved & JSON Tab */}
          <button
            onClick={() => setActiveTab('resolved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'resolved'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Resolved YAML</span>
          </button>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'diagnostics' && (
          <DiagnosticsTab
            validationResult={validationResult}
            onJumpToLine={onJumpToLine}
          />
        )}
        {activeTab === 'anchors' && (
          <AnchorsTab
            validationResult={validationResult}
            onJumpToLine={onJumpToLine}
          />
        )}
        {activeTab === 'resolved' && (
          <ResolvedTab
            validationResult={validationResult}
            currentYaml={currentYaml}
          />
        )}
      </div>
    </div>
  );
};
