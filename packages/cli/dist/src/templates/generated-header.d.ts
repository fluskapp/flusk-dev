/**
 * Template for @generated file headers
 * Used by the CLI generator to mark generated files
 */
export interface GeneratedHeaderOptions {
    version: string;
    sourceFile: string;
    timestamp?: string;
    noHeader?: boolean;
}
export declare function createGeneratedHeader(options: GeneratedHeaderOptions): string;
export declare function extractGeneratedMetadata(content: string): {
    isGenerated: boolean;
    version?: string;
    sourceFile?: string;
    timestamp?: string;
};
//# sourceMappingURL=generated-header.d.ts.map