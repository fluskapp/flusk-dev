import { Type } from '@sinclair/typebox';
/**
 * BaseEntity schema - foundation for all entities in Flusk
 * Provides common fields: id, createdAt, updatedAt
 */
export const BaseEntitySchema = Type.Object({
    id: Type.String({
        format: 'uuid',
        description: 'Unique identifier for the entity'
    }),
    createdAt: Type.String({
        format: 'date-time',
        description: 'Timestamp when the entity was created'
    }),
    updatedAt: Type.String({
        format: 'date-time',
        description: 'Timestamp when the entity was last updated'
    })
});
//# sourceMappingURL=base.entity.js.map