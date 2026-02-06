/**
 * Convert database row to PatternEntity
 */
export function rowToEntity(row) {
    return {
        id: row.id,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        organizationId: row.organization_id,
        promptHash: row.prompt_hash,
        occurrenceCount: row.occurrence_count,
        firstSeenAt: row.first_seen_at.toISOString(),
        lastSeenAt: row.last_seen_at.toISOString(),
        samplePrompts: row.sample_prompts || [],
        avgCost: parseFloat(row.avg_cost),
        totalCost: parseFloat(row.total_cost),
        suggestedConversion: row.suggested_conversion
    };
}
//# sourceMappingURL=row-to-entity.js.map