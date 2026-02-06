import { ConversionEntity } from '@flusk/entities';
/**
 * Create a new conversion suggestion
 * @param conversion - Partial conversion data (id, timestamps auto-generated)
 * @returns Created conversion entity with generated id and timestamps
 */
export declare function create(conversion: Omit<ConversionEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConversionEntity>;
//# sourceMappingURL=create.d.ts.map