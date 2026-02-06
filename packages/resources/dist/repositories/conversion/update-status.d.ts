import { ConversionEntity } from '@flusk/entities';
/**
 * Update conversion status (accept or reject)
 * @param id - UUID of the conversion to update
 * @param status - New status ('accepted' or 'rejected')
 * @returns Updated conversion entity or null if not found
 */
export declare function updateStatus(id: string, status: 'accepted' | 'rejected'): Promise<ConversionEntity | null>;
//# sourceMappingURL=update-status.d.ts.map