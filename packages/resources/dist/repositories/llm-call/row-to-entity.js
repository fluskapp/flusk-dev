/**
 * Convert database row to LLMCallEntity
 */
export function rowToEntity(row) {
    return {
        id: row.id,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        provider: row.provider,
        model: row.model,
        prompt: row.prompt,
        promptHash: row.prompt_hash,
        tokens: row.tokens,
        cost: parseFloat(row.cost),
        response: row.response,
        cached: row.cached,
        organizationId: row.organization_id,
        consentGiven: row.consent_given ?? true,
        consentPurpose: row.consent_purpose ?? 'optimization'
    };
}
//# sourceMappingURL=row-to-entity.js.map