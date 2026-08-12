/**
 * The dynamic import of `typescript`, alone.
 *
 * flusk has to build and run on a machine that does not have typescript
 * installed, so its absence must be a VALUE — a null the registry turns into
 * a sentence — and never an import-time crash. Nothing at module scope in the
 * doc feature may `import "typescript"` statically; this is the one place the
 * module is reached for, and the result is cached both ways so a missing
 * install costs one failed resolution per process rather than one per lookup.
 */
type TS = typeof import("typescript");

let mod: TS | null | undefined;

/** The typescript module, or null when it is not installed. Cached both ways. */
export async function loadTypeScript(): Promise<TS | null> {
	if (mod !== undefined) return mod;
	try {
		const m = (await import("typescript")) as unknown as { default?: TS };
		mod = m.default ?? (m as unknown as TS);
	} catch {
		mod = null; // not installed — the documented, supported case
	}
	return mod;
}
