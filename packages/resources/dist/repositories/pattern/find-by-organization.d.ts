import { PatternEntity } from '@flusk/entities';
import { PatternFilters } from './types.js';
/**
 * Find patterns for a specific organization with filters
 * @param organizationId - UUID of the organization
 * @param filters - Optional filtering and sorting options
 * @returns Array of pattern entities matching the criteria
 */
export declare function findByOrganization(organizationId: string, filters?: PatternFilters): Promise<PatternEntity[]>;
//# sourceMappingURL=find-by-organization.d.ts.map