/**
 * CRUD file generators for multi-file repository output.
 *
 * WHY: Generates individual create, findById, list, update,
 * and rowToEntity files matching the hand-written directory structure.
 *
 * Re-exports from split modules for backward compatibility.
 */

export { generateRowToEntity } from './multi-file-crud-row.js';
export { generateCreate, generateUpdate } from './multi-file-crud-write.js';
export { generateFindById, generateList } from './multi-file-crud-read.js';
export { generateDeleteById } from './multi-file-crud-delete.js';
export { generateFindByTimeRange } from './multi-file-crud-time-range.js';
