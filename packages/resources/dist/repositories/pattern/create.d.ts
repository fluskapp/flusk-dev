import { PatternEntity } from '@flusk/entities';
/**
 * Create a new pattern record
 * @param pattern - Pattern data (id, timestamps auto-generated)
 * @returns Created pattern entity with generated id and timestamps
 */
export declare function create(pattern: Omit<PatternEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<PatternEntity>;
//# sourceMappingURL=create.d.ts.map