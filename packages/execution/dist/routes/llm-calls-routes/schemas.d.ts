/**
 * Request schema for creating a new LLM call
 * Excludes auto-generated fields (id, timestamps, hash, cost)
 */
export declare const CreateLLMCallSchema: import("@sinclair/typebox").TObject<import("@sinclair/typebox").TProperties>;
/**
 * Response schema for successful LLM call creation
 */
export declare const LLMCallResponseSchema: import("@sinclair/typebox").TObject<import("@sinclair/typebox").TProperties>;
/**
 * Response schema for cached responses
 */
export declare const CachedResponseSchema: import("@sinclair/typebox").TObject<{
    cached: import("@sinclair/typebox").TLiteral<true>;
    response: import("@sinclair/typebox").TString;
    promptHash: import("@sinclair/typebox").TString;
    id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
//# sourceMappingURL=schemas.d.ts.map