/**
 * CLI flags for the Flusk generator
 * Used by: flusk g [entity] [flags]
 */
export interface GeneratorFlags {
    /**
     * Preview changes without writing files
     * @example flusk g llm-call.entity.ts --dry-run
     */
    dryRun?: boolean;
    /**
     * Overwrite files even if manually modified
     * @example flusk g llm-call.entity.ts --force
     */
    force?: boolean;
    /**
     * Skip adding @generated header (for testing)
     * @example flusk g llm-call.entity.ts --no-header
     */
    noHeader?: boolean;
    /**
     * Generate all entities in .fluskrc.json
     * @example flusk g --all
     */
    all?: boolean;
    /**
     * Verbose output showing all operations
     * @example flusk g llm-call.entity.ts --verbose
     */
    verbose?: boolean;
    /**
     * Validate entity schema without generating
     * @example flusk g llm-call.entity.ts --validate-only
     */
    validateOnly?: boolean;
    /**
     * Output directory (overrides default)
     * @example flusk g llm-call.entity.ts --output-dir ./custom
     */
    outputDir?: string;
    /**
     * Specific generators to run (comma-separated)
     * @example flusk g llm-call.entity.ts --only types,repositories
     */
    only?: string;
    /**
     * Skip specific generators (comma-separated)
     * @example flusk g llm-call.entity.ts --skip migrations
     */
    skip?: string;
}
export interface GeneratorContext {
    flags: GeneratorFlags;
    entityPath: string;
    entityName: string;
    config: {
        maxLines: number;
        templatesDir: string;
    };
    timestamp: string;
    version: string;
}
export declare const DEFAULT_FLAGS: GeneratorFlags;
/**
 * Parse CLI flags from argv
 */
export declare function parseFlags(args: string[]): GeneratorFlags;
/**
 * Validate flag combinations
 */
export declare function validateFlags(flags: GeneratorFlags): {
    valid: boolean;
    error?: string;
};
//# sourceMappingURL=flags.d.ts.map