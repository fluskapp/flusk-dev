import { Static } from '@sinclair/typebox';
/**
 * PatternEntity schema - captures detected repetitive prompt patterns
 * Identifies optimization opportunities by grouping duplicate API calls
 */
export declare const PatternEntitySchema: import("@sinclair/typebox").TObject<{
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
export type PatternEntity = Static<typeof PatternEntitySchema>;
//# sourceMappingURL=pattern.entity.d.ts.map