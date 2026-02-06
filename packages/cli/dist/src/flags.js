/**
 * CLI flags for the Flusk generator
 * Used by: flusk g [entity] [flags]
 */
export const DEFAULT_FLAGS = {
    dryRun: false,
    force: false,
    noHeader: false,
    all: false,
    verbose: false,
    validateOnly: false,
};
/**
 * Parse CLI flags from argv
 */
export function parseFlags(args) {
    const flags = { ...DEFAULT_FLAGS };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--dry-run':
                flags.dryRun = true;
                break;
            case '--force':
                flags.force = true;
                break;
            case '--no-header':
                flags.noHeader = true;
                break;
            case '--all':
                flags.all = true;
                break;
            case '--verbose':
            case '-v':
                flags.verbose = true;
                break;
            case '--validate-only':
                flags.validateOnly = true;
                break;
            case '--output-dir':
                flags.outputDir = args[++i];
                break;
            case '--only':
                flags.only = args[++i];
                break;
            case '--skip':
                flags.skip = args[++i];
                break;
        }
    }
    return flags;
}
/**
 * Validate flag combinations
 */
export function validateFlags(flags) {
    if (flags.only && flags.skip) {
        return {
            valid: false,
            error: 'Cannot use --only and --skip together',
        };
    }
    if (flags.dryRun && flags.force) {
        return {
            valid: false,
            error: '--force has no effect with --dry-run',
        };
    }
    if (flags.validateOnly && (flags.force || flags.noHeader)) {
        return {
            valid: false,
            error: '--validate-only cannot be used with --force or --no-header',
        };
    }
    return { valid: true };
}
//# sourceMappingURL=flags.js.map