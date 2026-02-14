/**
 * Reserved words that cannot be used as field or entity names.
 *
 * WHY: These clash with SQL keywords, TypeScript keywords,
 * or internal framework names. Catching them early prevents
 * cryptic errors during code generation.
 */

export const RESERVED_WORDS = new Set([
  // SQL reserved
  'select', 'insert', 'update', 'delete', 'from', 'where',
  'table', 'index', 'create', 'drop', 'alter', 'group',
  'order', 'by', 'join', 'on', 'and', 'or', 'not', 'null',
  'primary', 'key', 'foreign', 'references', 'default',
  'check', 'unique', 'constraint', 'limit', 'offset',
  // TypeScript reserved
  'class', 'interface', 'type', 'enum', 'const', 'let',
  'var', 'function', 'return', 'import', 'export',
  // Base entity fields (auto-generated)
  'id', 'createdAt', 'updatedAt', 'created_at', 'updated_at',
]);

/** Check if a word is reserved */
export function isReservedWord(word: string): boolean {
  return RESERVED_WORDS.has(word.toLowerCase());
}
