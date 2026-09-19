import YAML from 'yaml';
import {
  ValidationResult,
  ValidationIssue,
  YamlAnchor,
  YamlAliasReference,
  MergeKeyInfo,
  ValidationStats,
} from '../types/yaml';

export interface ParseOptions {
  maxAliasCount?: number;
  checkUnusedAnchors?: boolean;
  scanSecrets?: boolean;
}

// Common patterns for detecting sensitive keys and hardcoded credentials
const SENSITIVE_KEY_PATTERN = /^(?:api[_-]?key|auth[_-]?token|access[_-]?token|secret[_-]?key|client[_-]?secret|password|passwd|db[_-]?password|jwt[_-]?secret|private[_-]?key)$/i;
const PLACEHOLDER_PATTERN = /^(?:todo|changeme|change[_-]?me|replace[_-]?me|dummy|test|none|null|<.*>|\${.*}|{{.*}}|env:.*|vault:.*)$/i;
const PEM_KEY_PATTERN = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
const AWS_KEY_PATTERN = /^AKIA[0-9A-Z]{16}$/;
const GITHUB_TOKEN_PATTERN = /^gh[pousr]_[A-Za-z0-9_]{36,}/;

/**
 * Validates and analyzes a YAML document or multi-document stream completely in-browser.
 * Traverses the AST/CST across multiple documents to catalog anchors, track aliases,
 * identify merge keys, check for dangling references, scan for hardcoded secrets,
 * and produce dereferenced evaluated outputs.
 */
export function validateYaml(text: string, options: ParseOptions = {}): ValidationResult {
  const startTime = performance.now();
  const maxAliasCount = options.maxAliasCount ?? 50000;
  const checkUnusedAnchors = options.checkUnusedAnchors ?? true;
  const scanSecrets = options.scanSecrets ?? true;

  const lines = text.split('\n');
  const lineCount = lines.length;
  const characterCount = text.length;
  const byteCount = new TextEncoder().encode(text).length;

  // Empty string handling
  if (!text.trim()) {
    const emptyStats: ValidationStats = {
      lines: lineCount,
      characters: characterCount,
      bytes: byteCount,
      anchorCount: 0,
      aliasCount: 0,
      mergeKeyCount: 0,
      unusedAnchorCount: 0,
      danglingAliasCount: 0,
      documentCount: 0,
      parseTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
    };
    return {
      isValid: true,
      issues: [],
      anchors: [],
      aliases: [],
      mergeKeys: [],
      parsedData: null,
      resolvedYaml: '',
      jsonString: '',
      stats: emptyStats,
    };
  }

  const issues: ValidationIssue[] = [];
  const lineCounter = new YAML.LineCounter();
  let docs: YAML.Document.Parsed[] = [];

  try {
    docs = YAML.parseAllDocuments(text, {
      lineCounter,
      merge: true,
      keepSourceTokens: true,
    });
  } catch (err: any) {
    issues.push({
      id: 'parse-exception',
      severity: 'error',
      message: err.message || 'Failed to parse YAML document stream',
      line: 1,
      column: 1,
      source: 'syntax',
    });
  }

  const anchorMap = new Map<string, YamlAnchor>();
  const aliases: YamlAliasReference[] = [];
  const mergeKeys: MergeKeyInfo[] = [];

  // Iterate through all documents in the multi-document stream
  for (let docIdx = 0; docIdx < docs.length; docIdx++) {
    const doc = docs[docIdx];

    // Collect parse errors
    if (doc.errors && doc.errors.length > 0) {
      for (const err of doc.errors) {
        const pos = err.linePos ? { line: err.linePos[0].line, col: err.linePos[0].col } : { line: 1, col: 1 };
        issues.push({
          id: `syntax-err-${pos.line}-${pos.col}-${Math.random().toString(36).slice(2, 6)}`,
          severity: 'error',
          message: err.message || 'Syntax error',
          line: pos.line,
          column: pos.col,
          source: 'syntax',
          snippet: lines[pos.line - 1] || undefined,
        });
      }
    }

    // Collect parser warnings
    if (doc.warnings && doc.warnings.length > 0) {
      for (const warn of doc.warnings) {
        const pos = warn.linePos ? { line: warn.linePos[0].line, col: warn.linePos[0].col } : { line: 1, col: 1 };
        issues.push({
          id: `syntax-warn-${pos.line}-${pos.col}-${Math.random().toString(36).slice(2, 6)}`,
          severity: 'warning',
          message: warn.message || 'Parser warning',
          line: pos.line,
          column: pos.col,
          source: 'syntax',
          snippet: lines[pos.line - 1] || undefined,
        });
      }
    }

    if (doc.contents) {
      YAML.visit(doc, {
        Node(_key, node) {
          // Anchors
          if (node && (node as any).anchor) {
            const anchorName = (node as any).anchor as string;
            const range = (node as any).range;
            const pos = range ? lineCounter.linePos(range[0]) : { line: 1, col: 1 };

            let nodeType: 'mapping' | 'sequence' | 'scalar' | 'unknown' = 'unknown';
            if (YAML.isMap(node)) nodeType = 'mapping';
            else if (YAML.isSeq(node)) nodeType = 'sequence';
            else if (YAML.isScalar(node)) nodeType = 'scalar';

            let preview = '';
            try {
              preview = String(node.toString()).trim().slice(0, 100);
            } catch {
              preview = `<${nodeType}>`;
            }

            if (!anchorMap.has(anchorName)) {
              anchorMap.set(anchorName, {
                name: anchorName,
                line: pos.line,
                column: pos.col,
                type: nodeType,
                valuePreview: preview,
                references: [],
                isUsed: false,
              });
            }
          }

          // Aliases
          if (node && YAML.isAlias(node)) {
            const target = (node as any).source as string;
            const range = (node as any).range;
            const pos = range ? lineCounter.linePos(range[0]) : { line: 1, col: 1 };
            const contextLine = lines[pos.line - 1] || '';

            aliases.push({
              targetAnchor: target,
              line: pos.line,
              column: pos.col,
              isMergeKey: false,
              isDangling: false,
              contextSnippet: contextLine.trim(),
            });
          }
        },

        Pair(_key, pair) {
          if (!pair || !pair.key) return;

          // Merge key inspection
          const keySource = (pair.key as any).source;
          const keyValue = (pair.key as any).value;
          const isMerge = keySource === '<<' || String(keyValue).includes('<<');

          if (isMerge) {
            const range = (pair.key as any).range;
            const pos = range ? lineCounter.linePos(range[0]) : { line: 1, col: 1 };
            const targets: string[] = [];

            if (YAML.isAlias(pair.value)) {
              targets.push((pair.value as any).source);
            } else if (YAML.isSeq(pair.value)) {
              for (const item of (pair.value as any).items) {
                if (YAML.isAlias(item)) {
                  targets.push((item as any).source);
                }
              }
            }

            mergeKeys.push({
              line: pos.line,
              column: pos.col,
              targetAnchors: targets,
              isResolved: true,
              contextSnippet: (lines[pos.line - 1] || '').trim(),
            });
          }

          // Shift-Left Security: Secret & credential scanning
          if (scanSecrets && pair.value) {
            const keyStr = String((pair.key as any).value || (pair.key as any).source || '').trim();
            const val = (pair.value as any).value;
            const valStr = typeof val === 'string' ? val.trim() : typeof val === 'number' ? String(val) : '';

            if (valStr && !PLACEHOLDER_PATTERN.test(valStr)) {
              let isSecret = false;
              let reason = '';

              if (SENSITIVE_KEY_PATTERN.test(keyStr) && valStr.length >= 6) {
                isSecret = true;
                reason = `Sensitive configuration key "${keyStr}" contains an unencrypted plaintext value.`;
              } else if (PEM_KEY_PATTERN.test(valStr)) {
                isSecret = true;
                reason = `Hardcoded private key (PEM format) detected for key "${keyStr}".`;
              } else if (AWS_KEY_PATTERN.test(valStr)) {
                isSecret = true;
                reason = `AWS Access Key ID format detected for key "${keyStr}".`;
              } else if (GITHUB_TOKEN_PATTERN.test(valStr)) {
                isSecret = true;
                reason = `GitHub personal access token format detected for key "${keyStr}".`;
              }

              if (isSecret) {
                const range = (pair.key as any).range;
                const pos = range ? lineCounter.linePos(range[0]) : { line: 1, col: 1 };
                issues.push({
                  id: `secret-${pos.line}-${pos.col}-${keyStr}`,
                  code: 'HARDCODED_SECRET',
                  severity: 'warning',
                  source: 'security',
                  message: reason,
                  line: pos.line,
                  column: pos.col,
                  snippet: lines[pos.line - 1] || undefined,
                  suggestion: 'Inject secrets via environment variables (e.g., ${SECRET}) or reference a secret store (Vault, AWS Secrets Manager).',
                });
              }
            }
          }
        },
      });
    }
  }

  // Cross-reference aliases with anchors
  let danglingCount = 0;
  for (const alias of aliases) {
    const anchor = anchorMap.get(alias.targetAnchor);
    if (anchor) {
      anchor.references.push(alias);
      anchor.isUsed = true;
    } else {
      alias.isDangling = true;
      danglingCount++;
      issues.push({
        id: `dangling-alias-${alias.line}-${alias.column}-${alias.targetAnchor}`,
        severity: 'error',
        message: `Dangling alias "*${alias.targetAnchor}": Anchor "&${alias.targetAnchor}" is not defined in this document.`,
        line: alias.line,
        column: alias.column,
        source: 'anchor',
        snippet: lines[alias.line - 1] || undefined,
        suggestion: `Define "&${alias.targetAnchor}" before using it, or verify the anchor name spelling.`,
      });
    }
  }

  // Check for unused anchors
  let unusedCount = 0;
  if (checkUnusedAnchors) {
    for (const [name, anchor] of anchorMap) {
      if (!anchor.isUsed) {
        unusedCount++;
        issues.push({
          id: `unused-anchor-${anchor.line}-${anchor.column}-${name}`,
          severity: 'warning',
          message: `Unused anchor "&${name}": Defined at line ${anchor.line} but never referenced by any alias.`,
          line: anchor.line,
          column: anchor.column,
          source: 'anchor',
          snippet: lines[anchor.line - 1] || undefined,
          suggestion: `Remove this anchor if it is obsolete, or use "*${name}" to reference it.`,
        });
      }
    }
  }

  // Resolve document(s) to JSON and fully dereferenced YAML
  let parsedData: any = null;
  let resolvedYaml = '';
  let jsonString = '';

  const hasErrors = issues.some(i => i.severity === 'error');
  if (!hasErrors && docs.length > 0) {
    try {
      const resolvedObjects: any[] = [];
      const resolvedYamls: string[] = [];

      for (const doc of docs) {
        const jsObj = doc.toJS({ maxAliasCount });
        resolvedObjects.push(jsObj);

        try {
          const deepCloned = JSON.parse(JSON.stringify(jsObj));
          resolvedYamls.push(YAML.stringify(deepCloned, { indent: 2 }).trim());
        } catch {
          resolvedYamls.push(YAML.stringify(jsObj, { indent: 2 }).trim());
        }
      }

      parsedData = docs.length === 1 ? resolvedObjects[0] : resolvedObjects;
      jsonString = JSON.stringify(parsedData, null, 2);
      resolvedYaml = resolvedYamls.join('\n---\n');
    } catch (err: any) {
      issues.push({
        id: 'resolve-error',
        severity: 'error',
        message: `Failed to resolve YAML references: ${err.message}`,
        line: 1,
        column: 1,
        source: 'anchor',
      });
    }
  }

  const valid = !issues.some(i => i.severity === 'error');
  const anchorsList = Array.from(anchorMap.values()).sort((a, b) => a.line - b.line);

  const stats: ValidationStats = {
    lines: lineCount,
    characters: characterCount,
    bytes: byteCount,
    anchorCount: anchorsList.length,
    aliasCount: aliases.length,
    mergeKeyCount: mergeKeys.length,
    unusedAnchorCount: unusedCount,
    danglingAliasCount: danglingCount,
    documentCount: docs.length,
    parseTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
  };

  return {
    isValid: valid,
    issues: issues.sort((a, b) => a.line - b.line || a.column - b.column),
    anchors: anchorsList,
    aliases,
    mergeKeys,
    parsedData,
    resolvedYaml,
    jsonString,
    stats,
  };
}
