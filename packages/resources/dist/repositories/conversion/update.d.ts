import { ConversionEntity } from '@flusk/entities';
/**
 * Update conversion record
 * @param id - UUID of the conversion to update
 * @param data - Partial data to update
 * @returns Updated conversion entity or null if not found
 */
export declare function update(id: string, data: Partial<Omit<ConversionEntity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ConversionEntity | null>;
//# sourceMappingURL=update.d.ts.map