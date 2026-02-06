import { Static } from '@sinclair/typebox';
/**
 * BaseEntity schema - foundation for all entities in Flusk
 * Provides common fields: id, createdAt, updatedAt
 */
export declare const BaseEntitySchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    createdAt: import("@sinclair/typebox").TString;
    updatedAt: import("@sinclair/typebox").TString;
}>;
export type BaseEntity = Static<typeof BaseEntitySchema>;
//# sourceMappingURL=base.entity.d.ts.map