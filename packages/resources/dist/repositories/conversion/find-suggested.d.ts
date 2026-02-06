import { ConversionEntity } from '@flusk/entities';
/**
 * Find suggested conversions for an organization (pending user review)
 * @param organizationId - UUID of the organization
 * @returns Array of suggested conversion entities
 */
export declare function findSuggested(organizationId: string): Promise<ConversionEntity[]>;
//# sourceMappingURL=find-suggested.d.ts.map