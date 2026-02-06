/**
 * Response schema for pattern entity
 */
export declare const PatternResponseSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    createdAt: import("@sinclair/typebox").TString;
    updatedAt: import("@sinclair/typebox").TString;
    organizationId: import("@sinclair/typebox").TString;
    promptHash: import("@sinclair/typebox").TString;
    occurrenceCount: import("@sinclair/typebox").TInteger;
    firstSeenAt: import("@sinclair/typebox").TString;
    lastSeenAt: import("@sinclair/typebox").TString;
    samplePrompts: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    avgCost: import("@sinclair/typebox").TNumber;
    totalCost: import("@sinclair/typebox").TNumber;
    suggestedConversion: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
/**
 * Query parameters for pattern list
 */
export declare const PatternQuerySchema: import("@sinclair/typebox").TObject<{
    organizationId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    minOccurrences: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    minTotalCost: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    sortBy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"occurrences">, import("@sinclair/typebox").TLiteral<"totalCost">, import("@sinclair/typebox").TLiteral<"lastSeen">]>>;
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    offset: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
//# sourceMappingURL=schemas.d.ts.map