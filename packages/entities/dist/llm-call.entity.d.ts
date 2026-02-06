import { Static } from '@sinclair/typebox';
/**
 * TokenUsage schema - tracks input and output token counts
 */
export declare const TokenUsageSchema: import("@sinclair/typebox").TObject<{
    input: import("@sinclair/typebox").TInteger;
    output: import("@sinclair/typebox").TInteger;
    total: import("@sinclair/typebox").TInteger;
}>;
export type TokenUsage = Static<typeof TokenUsageSchema>;
/**
 * LLMCallEntity schema - captures all LLM API call data
 * Core entity for tracking wasteful API usage and optimization opportunities
 */
export declare const LLMCallEntitySchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TString;
    createdAt: import("@sinclair/typebox").TString;
    updatedAt: import("@sinclair/typebox").TString;
    organizationId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    provider: import("@sinclair/typebox").TString;
    model: import("@sinclair/typebox").TString;
    prompt: import("@sinclair/typebox").TString;
    promptHash: import("@sinclair/typebox").TString;
    tokens: import("@sinclair/typebox").TObject<{
        input: import("@sinclair/typebox").TInteger;
        output: import("@sinclair/typebox").TInteger;
        total: import("@sinclair/typebox").TInteger;
    }>;
    cost: import("@sinclair/typebox").TNumber;
    response: import("@sinclair/typebox").TString;
    cached: import("@sinclair/typebox").TBoolean;
    consentGiven: import("@sinclair/typebox").TBoolean;
    consentPurpose: import("@sinclair/typebox").TString;
}>;
export type LLMCallEntity = Static<typeof LLMCallEntitySchema>;
//# sourceMappingURL=llm-call.entity.d.ts.map