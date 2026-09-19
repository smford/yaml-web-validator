export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueSource = 'syntax' | 'anchor' | 'schema' | 'security';

export interface ValidationIssue {
  id: string;
  code?: string;
  severity: IssueSeverity;
  message: string;
  line: number;
  column: number;
  source: IssueSource;
  snippet?: string;
  suggestion?: string;
}

export interface YamlAliasReference {
  targetAnchor: string;
  line: number;
  column: number;
  isMergeKey: boolean;
  isDangling: boolean;
  contextSnippet?: string;
}

export interface YamlAnchor {
  name: string;
  line: number;
  column: number;
  type: 'mapping' | 'sequence' | 'scalar' | 'unknown';
  valuePreview: string;
  references: YamlAliasReference[];
  isUsed: boolean;
}

export interface MergeKeyInfo {
  line: number;
  column: number;
  targetAnchors: string[];
  isResolved: boolean;
  contextSnippet?: string;
}

export interface ValidationStats {
  lines: number;
  characters: number;
  bytes: number;
  anchorCount: number;
  aliasCount: number;
  mergeKeyCount: number;
  unusedAnchorCount: number;
  danglingAliasCount: number;
  documentCount: number;
  parseTimeMs: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  anchors: YamlAnchor[];
  aliases: YamlAliasReference[];
  mergeKeys: MergeKeyInfo[];
  parsedData: any;
  resolvedYaml: string;
  jsonString: string;
  stats: ValidationStats;
}
