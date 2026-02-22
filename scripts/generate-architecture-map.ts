#!/usr/bin/env npx tsx
/**
 * Scans the Flusk monorepo and outputs architecture-map.json
 * Usage: npx tsx scripts/generate-architecture-map.ts
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

interface Node { id: string; name: string; type: string; details: Record<string, unknown>; }
interface Link { source: string; target: string; label: string; }

const nodes: Node[] = [];
const links: Link[] = [];
const seen = new Set<string>();

function addNode(id: string, name: string, type: string, details: Record<string, unknown> = {}) {
  if (seen.has(id)) return;
  seen.add(id);
  nodes.push({ id, name, type, details });
}
function addLink(source: string, target: string, label = '') {
  if (seen.has(source) && seen.has(target)) links.push({ source, target, label });
}

// 1. Entities from YAML
const entityDir = resolve(ROOT, 'packages/schema/entities');
const entityNames: string[] = [];
for (const f of readdirSync(entityDir).filter(f => f.endsWith('.yaml'))) {
  const content = readFileSync(resolve(entityDir, f), 'utf-8');
  const nameMatch = content.match(/^name:\s*(.+)/m);
  const storageMatch = content.match(/^storage:\s*\[(.+)\]/m);
  const fields = [...content.matchAll(/^  (\w+):\s*$/gm)].map(m => m[1]);
  const name = nameMatch?.[1]?.trim() ?? basename(f, '.yaml');
  entityNames.push(name);
  addNode(`entity:${name}`, name, 'entity', {
    storage: storageMatch?.[1]?.trim() ?? 'unknown',
    fields,
    yamlFile: f,
  });
}

// 2. Business Logic
const blDir = resolve(ROOT, 'packages/business-logic/src');
if (existsSync(blDir)) {
  for (const domain of readdirSync(blDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
    const domainDir = resolve(blDir, domain.name);
    const fns = readdirSync(domainDir)
      .filter(f => f.endsWith('.function.ts'))
      .map(f => f.replace('.function.ts', ''));
    for (const fn of fns) {
      addNode(`logic:${domain.name}/${fn}`, fn, 'logic', { domain: domain.name });
    }
  }
}

// 3. Routes
const routeDir = resolve(ROOT, 'packages/execution/src/routes');
if (existsSync(routeDir)) {
  for (const f of readdirSync(routeDir).filter(f => f.endsWith('.routes.ts') || f.endsWith('.route.ts'))) {
    const name = f.replace(/\.routes?\.ts$/, '');
    addNode(`route:${name}`, `/${name}`, 'route', { file: f });
  }
}

// 4. Repositories
const repoDir = resolve(ROOT, 'packages/resources/src/repositories');
if (existsSync(repoDir)) {
  for (const entry of readdirSync(repoDir, { withFileTypes: true })) {
    const name = entry.isDirectory() ? entry.name : entry.name.replace('.repository.ts', '');
    if (!entry.name.endsWith('.ts') && !entry.isDirectory()) continue;
    addNode(`repo:${name}`, `${name} repo`, 'repo', {});
    // Link to entity
    const matchEntity = entityNames.find(e => e.toLowerCase().replace(/[^a-z]/g, '') === name.replace(/-/g, ''));
    if (matchEntity) addLink(`repo:${name}`, `entity:${matchEntity}`, 'stores');
  }
}

// 5. Clients
const clientDir = resolve(ROOT, 'packages/resources/src/clients');
if (existsSync(clientDir)) {
  for (const f of readdirSync(clientDir).filter(f => f.endsWith('.client.ts') && !f.includes('.test.'))) {
    const name = f.replace('.client.ts', '');
    addNode(`client:${name}`, name, 'client', {});
  }
}

// 6. CLI Commands
const cmdDir = resolve(ROOT, 'packages/cli/src/commands');
if (existsSync(cmdDir)) {
  for (const f of readdirSync(cmdDir).filter(f => f.endsWith('.ts') && !f.includes('.test.'))) {
    const name = f.replace('.ts', '');
    addNode(`cmd:${name}`, `flusk ${name}`, 'command', {});
  }
}

// 7. TUI Screens
const tuiDir = resolve(ROOT, 'packages/cli/src/tui/screens');
if (existsSync(tuiDir)) {
  for (const f of readdirSync(tuiDir).filter(f => f.endsWith('.tsx'))) {
    const name = f.replace('.tsx', '');
    addNode(`tui:${name}`, `${name} screen`, 'tui', {});
  }
}

// 8. OTel
const otelDir = resolve(ROOT, 'packages/otel/src');
if (existsSync(otelDir)) {
  for (const sub of ['instrumentations', 'exporters', 'hooks', 'plugins', 'processors']) {
    const dir = resolve(otelDir, sub);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(f => f.endsWith('.ts') && !f.includes('.test.') && f !== 'index.ts')) {
      const name = f.replace('.ts', '');
      addNode(`otel:${name}`, name, 'otel', { category: sub });
    }
  }
}

const output = { nodes, links, generatedAt: new Date().toISOString() };
const outPath = resolve(ROOT, 'docs', 'architecture-map.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`✅ Generated ${outPath} — ${nodes.length} nodes, ${links.length} links`);
