import { describe, it, expect } from 'vitest';
import { validateYaml } from './yamlValidator';
import {
  DOCKER_COMPOSE_SAMPLE,
  KUBERNETES_SAMPLE,
  BROKEN_SAMPLE,
} from '../data/samples';

describe('YAML Clean Validator & Anchor Engine', () => {
  it('should validate simple valid YAML', () => {
    const yaml = `
name: test-service
replicas: 3
enabled: true
`;
    const res = validateYaml(yaml);
    expect(res.isValid).toBe(true);
    expect(res.issues).toHaveLength(0);
    expect(res.parsedData.replicas).toBe(3);
    expect(res.parsedData.name).toBe('test-service');
    expect(res.stats.documentCount).toBe(1);
  });

  it('should handle empty or whitespace-only inputs gracefully', () => {
    const emptyRes = validateYaml('');
    expect(emptyRes.isValid).toBe(true);
    expect(emptyRes.issues).toHaveLength(0);
    expect(emptyRes.anchors).toHaveLength(0);
    expect(emptyRes.stats.documentCount).toBe(0);

    const wsRes = validateYaml('   \n\n  \t\n');
    expect(wsRes.isValid).toBe(true);
    expect(wsRes.issues).toHaveLength(0);
  });

  it('should detect syntax errors with line and column', () => {
    const invalidYaml = `services:
  app:
    name: test
   bad_indentation: true
`;
    const res = validateYaml(invalidYaml);
    expect(res.isValid).toBe(false);
    expect(res.issues.length).toBeGreaterThan(0);
    const syntaxErr = res.issues.find(i => i.source === 'syntax');
    expect(syntaxErr).toBeDefined();
    expect(syntaxErr?.line).toBeGreaterThan(0);
  });

  it('should detect anchors, aliases, and count usage', () => {
    const yaml = `defaults: &default_cfg
  timeout: 30
  retry: true

prod_svc:
  config: *default_cfg

staging_svc:
  config: *default_cfg
`;
    const res = validateYaml(yaml);
    expect(res.isValid).toBe(true);
    expect(res.anchors).toHaveLength(1);
    expect(res.anchors[0].name).toBe('default_cfg');
    expect(res.anchors[0].references).toHaveLength(2);
    expect(res.anchors[0].isUsed).toBe(true);
    expect(res.stats.aliasCount).toBe(2);
  });

  it('should classify anchor node types properly (mapping, sequence, scalar)', () => {
    const yaml = `scalar_anchor: &str_anchor "my-production-cluster"
seq_anchor: &ports_anchor
  - 80
  - 443
map_anchor: &limits_anchor
  cpu: 500m
  memory: 1Gi

usage:
  cluster: *str_anchor
  ports: *ports_anchor
  limits: *limits_anchor
`;
    const res = validateYaml(yaml);
    expect(res.isValid).toBe(true);
    expect(res.anchors).toHaveLength(3);

    const scalar = res.anchors.find(a => a.name === 'str_anchor');
    const seq = res.anchors.find(a => a.name === 'ports_anchor');
    const map = res.anchors.find(a => a.name === 'limits_anchor');

    expect(scalar?.type).toBe('scalar');
    expect(seq?.type).toBe('sequence');
    expect(map?.type).toBe('mapping');
  });

  it('should flag dangling aliases as errors', () => {
    const yaml = `service:
  roles: *undefined_role_anchor
`;
    const res = validateYaml(yaml);
    expect(res.isValid).toBe(false);
    const dangling = res.issues.find(i => i.source === 'anchor' && i.severity === 'error');
    expect(dangling).toBeDefined();
    expect(dangling?.message).toContain('undefined_role_anchor');
    expect(res.stats.danglingAliasCount).toBe(1);
  });

  it('should flag unused anchors as warnings without invalidating the document', () => {
    const yaml = `orphan_anchor: &unused_conf
  foo: bar

active_conf:
  hello: world
`;
    const res = validateYaml(yaml);
    expect(res.isValid).toBe(true);
    const unused = res.issues.find(i => i.source === 'anchor' && i.severity === 'warning');
    expect(unused).toBeDefined();
    expect(unused?.message).toContain('unused_conf');
    expect(res.stats.unusedAnchorCount).toBe(1);
  });

  it('should properly process single and multiple merge keys', () => {
    const yaml = `base_a: &base_a
  a: 1
  shared: from_a

base_b: &base_b
  b: 2
  shared: from_b

service:
  <<: [*base_a, *base_b]
  c: 3
`;
    const res = validateYaml(yaml);
    expect(res.isValid).toBe(true);
    expect(res.mergeKeys).toHaveLength(1);
    expect(res.mergeKeys[0].targetAnchors).toEqual(['base_a', 'base_b']);
    expect(res.parsedData.service.a).toBe(1);
    expect(res.parsedData.service.b).toBe(2);
    expect(res.parsedData.service.c).toBe(3);
    expect(res.parsedData.service.shared).toBe('from_a');
  });

  it('should generate valid JSON and dereferenced YAML representation', () => {
    const yaml = `base: &base
  env: production
  tier: frontend

app:
  <<: *base
  name: web
`;
    const res = validateYaml(yaml);
    expect(res.isValid).toBe(true);
    expect(res.jsonString).toBeTruthy();

    const parsedJson = JSON.parse(res.jsonString);
    expect(parsedJson.app.env).toBe('production');
    expect(parsedJson.app.name).toBe('web');

    expect(res.resolvedYaml).toContain('env: production');
    expect(res.resolvedYaml).toContain('name: web');
    expect(res.resolvedYaml).not.toContain('<<:');
  });

  it('should parse multi-document YAML streams separated by ---', () => {
    const multiDoc = `apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - port: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
spec:
  replicas: 2
`;
    const res = validateYaml(multiDoc);
    expect(res.isValid).toBe(true);
    expect(res.stats.documentCount).toBe(2);
    expect(Array.isArray(res.parsedData)).toBe(true);
    expect(res.parsedData[0].kind).toBe('Service');
    expect(res.parsedData[1].kind).toBe('Deployment');
    expect(res.resolvedYaml).toContain('kind: Service');
    expect(res.resolvedYaml).toContain('---');
    expect(res.resolvedYaml).toContain('kind: Deployment');
  });

  it('should detect syntax errors in multi-document streams with accurate lines', () => {
    const multiDocError = `apiVersion: v1
kind: Service
---
apiVersion: apps/v1
kind: Deployment
  bad_indent: true
`;
    const res = validateYaml(multiDocError);
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.source === 'syntax')).toBe(true);
  });

  it('should detect hardcoded plaintext secrets as security warnings', () => {
    const yamlWithSecret = `service:
  name: auth-service
  api_key: "super_secret_production_token_12345"
`;
    const res = validateYaml(yamlWithSecret);
    expect(res.isValid).toBe(true); // Warnings don't invalidate document
    const secIssue = res.issues.find(i => i.source === 'security');
    expect(secIssue).toBeDefined();
    expect(secIssue?.severity).toBe('warning');
    expect(secIssue?.message).toContain('api_key');
  });

  it('should ignore secret warnings for placeholders and environment interpolations', () => {
    const yamlWithPlaceholders = `service:
  api_key: "\${ENV_API_KEY}"
  password: "CHANGE_ME"
  secret_token: "<REDACTED>"
`;
    const res = validateYaml(yamlWithPlaceholders);
    expect(res.isValid).toBe(true);
    const secIssues = res.issues.filter(i => i.source === 'security');
    expect(secIssues).toHaveLength(0);
  });

  it('should validate the built-in Docker Compose template', () => {
    const res = validateYaml(DOCKER_COMPOSE_SAMPLE);
    expect(res.isValid).toBe(true);
    expect(res.issues.filter(i => i.severity === 'error')).toHaveLength(0);
    expect(res.anchors.length).toBeGreaterThan(0);
    expect(res.mergeKeys.length).toBeGreaterThan(0);
    expect(res.parsedData.services['api-gateway']).toBeDefined();
  });

  it('should validate the built-in Kubernetes template', () => {
    const res = validateYaml(KUBERNETES_SAMPLE);
    expect(res.isValid).toBe(true);
    expect(res.issues.filter(i => i.severity === 'error')).toHaveLength(0);
    expect(res.anchors.length).toBeGreaterThan(0);
    expect(res.stats.aliasCount).toBeGreaterThan(0);
  });

  it('should flag errors on the built-in broken template', () => {
    const res = validateYaml(BROKEN_SAMPLE);
    expect(res.isValid).toBe(false);
    expect(res.issues.length).toBeGreaterThan(0);
    expect(res.stats.danglingAliasCount).toBeGreaterThan(0);
  });
});
