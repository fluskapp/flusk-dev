/**
 * Parse generated files into GENERATED and CUSTOM regions.
 *
 * WHY: Before merging new output with an existing file, we need
 * to extract custom sections the user wrote so they survive
 * regeneration. Also detects manual edits in generated regions.
 */

/** A parsed region from a generated file */
export interface ParsedRegion {
  kind: 'generated' | 'custom' | 'static';
  label: string;
  content: string;
}

const GENERATED_RE = /^\/\/ --- BEGIN GENERATED.*?(?:\[(.+?)\])?\s*---$/;
const END_GENERATED_RE = /^\/\/ --- END GENERATED ---$/;
const CUSTOM_RE = /^\/\/ --- BEGIN CUSTOM.*?(?:\[(.+?)\])?\s*---$/;
const END_CUSTOM_RE = /^\/\/ --- END CUSTOM ---$/;

/**
 * Parse a file into an ordered list of regions.
 * Lines outside any marker become 'static' regions.
 */
export function parseRegions(content: string): ParsedRegion[] {
  const lines = content.split('\n');
  const regions: ParsedRegion[] = [];
  let current: { kind: 'generated' | 'custom'; label: string; lines: string[] } | null = null;
  let staticLines: string[] = [];

  for (const line of lines) {
    const genMatch = line.match(GENERATED_RE);
    const custMatch = line.match(CUSTOM_RE);

    if (genMatch || custMatch) {
      if (staticLines.length) {
        regions.push({ kind: 'static', label: '', content: staticLines.join('\n') });
        staticLines = [];
      }
      current = { kind: genMatch ? 'generated' : 'custom', label: (genMatch?.[1] ?? custMatch?.[1]) ?? '', lines: [] };
      continue;
    }

    if (current && ((current.kind === 'generated' && END_GENERATED_RE.test(line)) ||
        (current.kind === 'custom' && END_CUSTOM_RE.test(line)))) {
      regions.push({ kind: current.kind, label: current.label, content: current.lines.join('\n') });
      current = null;
      continue;
    }

    if (current) { current.lines.push(line); } else { staticLines.push(line); }
  }

  if (staticLines.length) {
    regions.push({ kind: 'static', label: '', content: staticLines.join('\n') });
  }
  return regions;
}

/** Extract only custom sections as a map of label → content */
export function extractCustomSections(content: string): Map<string, string> {
  const map = new Map<string, string>();
  let idx = 0;
  for (const r of parseRegions(content)) {
    if (r.kind === 'custom') {
      map.set(r.label || `custom-${idx++}`, r.content);
    }
  }
  return map;
}

/** Check whether GENERATED sections have been manually modified */
export function hasManualEdits(
  oldContent: string,
  expectedGenerated: Map<string, string>,
): string[] {
  const warnings: string[] = [];
  for (const r of parseRegions(oldContent)) {
    if (r.kind === 'generated' && expectedGenerated.has(r.label)) {
      if (r.content !== expectedGenerated.get(r.label)) {
        warnings.push(`Generated section "${r.label || 'default'}" was manually edited`);
      }
    }
  }
  return warnings;
}
