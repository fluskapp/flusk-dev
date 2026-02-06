import { Static } from '@sinclair/typebox';
/**
 * ConversionType enum - types of optimizations Flusk can suggest
 */
export declare const ConversionTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cache">, import("@sinclair/typebox").TLiteral<"downgrade">, import("@sinclair/typebox").TLiteral<"remove">]>;
export type ConversionType = Static<typeof ConversionTypeSchema>;
/**
 * ConversionStatus enum - lifecycle states of conversion suggestions
 */
export declare const ConversionStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"suggested">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"rejected">]>;
export type ConversionStatus = Static<typeof ConversionStatusSchema>;
/**
 * Cache configuration for 'cache' conversion type
 */
export declare const CacheConfigSchema: import("@sinclair/typebox").TObject<{
    ttl: import("@sinclair/typebox").TInteger;
    conditions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
}>;
/**
 * Downgrade configuration for 'downgrade' conversion type
 */
export declare const DowngradeConfigSchema: import("@sinclair/typebox").TObject<{
    fromModel: import("@sinclair/typebox").TString;
    toModel: import("@sinclair/typebox").TString;
    estimatedQualityLoss: import("@sinclair/typebox").TNumber;
}>;
/**
 * Remove configuration for 'remove' conversion type
 */
export declare const RemoveConfigSchema: import("@sinclair/typebox").TObject<{
    reason: import("@sinclair/typebox").TString;
    alternative: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
/**
 * Union of all config types
 */
export declare const ConversionConfigSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    ttl: import("@sinclair/typebox").TInteger;
    conditions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
}>, import("@sinclair/typebox").TObject<{
    fromModel: import("@sinclair/typebox").TString;
    toModel: import("@sinclair/typebox").TString;
    estimatedQualityLoss: import("@sinclair/typebox").TNumber;
}>, import("@sinclair/typebox").TObject<{
    reason: import("@sinclair/typebox").TString;
    alternative: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>]>;
export type ConversionConfig = Static<typeof ConversionConfigSchema>;
/**
 * ConversionEntity schema - optimization suggestions for LLM usage
 * Core entity for converting wasteful API calls into deterministic automation
 */
export declare const ConversionEntitySchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    createdAt: import("@sinclair/typebox").TString;
    updatedAt: import("@sinclair/typebox").TString;
    patternId: import("@sinclair/typebox").TString;
    organizationId: import("@sinclair/typebox").TString;
    conversionType: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cache">, import("@sinclair/typebox").TLiteral<"downgrade">, import("@sinclair/typebox").TLiteral<"remove">]>;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"suggested">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"rejected">]>;
    estimatedSavings: import("@sinclair/typebox").TNumber;
    config: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
        ttl: import("@sinclair/typebox").TInteger;
        conditions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>, import("@sinclair/typebox").TObject<{
        fromModel: import("@sinclair/typebox").TString;
        toModel: import("@sinclair/typebox").TString;
        estimatedQualityLoss: import("@sinclair/typebox").TNumber;
    }>, import("@sinclair/typebox").TObject<{
        reason: import("@sinclair/typebox").TString;
        alternative: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>]>;
}>;
export type ConversionEntity = Static<typeof ConversionEntitySchema>;
//# sourceMappingURL=conversion.entity.d.ts.map