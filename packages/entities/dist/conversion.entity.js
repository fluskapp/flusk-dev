import { Type } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';
/**
 * ConversionType enum - types of optimizations Flusk can suggest
 */
export const ConversionTypeSchema = Type.Union([
    Type.Literal('cache', {
        description: 'Cache identical prompts to avoid redundant API calls'
    }),
    Type.Literal('downgrade', {
        description: 'Use cheaper model that achieves same results'
    }),
    Type.Literal('remove', {
        description: 'Eliminate unnecessary API call entirely'
    })
]);
/**
 * ConversionStatus enum - lifecycle states of conversion suggestions
 */
export const ConversionStatusSchema = Type.Union([
    Type.Literal('suggested', {
        description: 'Automatically detected, awaiting user review'
    }),
    Type.Literal('accepted', {
        description: 'User approved, automation rules active'
    }),
    Type.Literal('rejected', {
        description: 'User declined, will not suggest again'
    })
]);
/**
 * Cache configuration for 'cache' conversion type
 */
export const CacheConfigSchema = Type.Object({
    ttl: Type.Integer({
        description: 'Time-to-live in seconds for cached responses',
        minimum: 60,
        default: 3600
    }),
    conditions: Type.Optional(Type.Array(Type.String({
        description: 'Optional conditions that must be met for caching'
    })))
});
/**
 * Downgrade configuration for 'downgrade' conversion type
 */
export const DowngradeConfigSchema = Type.Object({
    fromModel: Type.String({
        description: 'Original expensive model',
        minLength: 1
    }),
    toModel: Type.String({
        description: 'Suggested cheaper model',
        minLength: 1
    }),
    estimatedQualityLoss: Type.Number({
        description: 'Estimated quality degradation (0.0-1.0, lower is better)',
        minimum: 0,
        maximum: 1
    })
});
/**
 * Remove configuration for 'remove' conversion type
 */
export const RemoveConfigSchema = Type.Object({
    reason: Type.String({
        description: 'Explanation of why this call can be removed',
        minLength: 1
    }),
    alternative: Type.Optional(Type.String({
        description: 'Suggested alternative approach if applicable'
    }))
});
/**
 * Union of all config types
 */
export const ConversionConfigSchema = Type.Union([
    CacheConfigSchema,
    DowngradeConfigSchema,
    RemoveConfigSchema
]);
/**
 * ConversionEntity schema - optimization suggestions for LLM usage
 * Core entity for converting wasteful API calls into deterministic automation
 */
export const ConversionEntitySchema = Type.Composite([
    BaseEntitySchema,
    Type.Object({
        patternId: Type.String({
            format: 'uuid',
            description: 'Reference to the pattern this conversion applies to'
        }),
        organizationId: Type.String({
            format: 'uuid',
            description: 'Organization that owns this conversion'
        }),
        conversionType: ConversionTypeSchema,
        status: ConversionStatusSchema,
        estimatedSavings: Type.Number({
            description: 'Projected monthly savings in USD if accepted',
            minimum: 0
        }),
        config: ConversionConfigSchema
    })
]);
//# sourceMappingURL=conversion.entity.js.map