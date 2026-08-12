/**
 * The ONLY door LangChain comes through.
 *
 * flusk core is dependency-free on purpose, so LangGraph is an optional
 * dependency loaded by dynamic import at use. Absent packages are not an
 * error: `loadLang()` answers null and `langMissing()` names the single npm
 * command that fixes it, so `flusk` still builds, tests and runs without them.
 *
 * The specifiers are variables, not literals, which is also what lets `tsc`
 * pass on a checkout that never installed the optional packages.
 */

export const LANGGRAPH = "@langchain/langgraph";
export const LANGCHAIN_CORE = "@langchain/core";
export const LANGCHAIN = "langchain";
export const LANGCHAIN_ANTHROPIC = "@langchain/anthropic";

/** `import()`, injectable so a test can simulate the packages being absent. */
export type Importer = (specifier: string) => Promise<unknown>;

export const nodeImporter: Importer = (specifier) => import(specifier);

/** A compiled graph: all the runtime asks of LangGraph once it is built. */
export interface CompiledFlow<S> {
	invoke: (input: Partial<S>) => Promise<S>;
}

export interface GraphBuilder<S> {
	addNode: (id: string, fn: (state: S) => Promise<Partial<S>>) => unknown;
	addEdge: (from: string, to: string) => unknown;
	/** `ends` lists every destination `path` may return, END included. */
	addConditionalEdges: (
		from: string,
		path: (state: S) => string | string[],
		ends: string[],
	) => unknown;
	compile: () => CompiledFlow<S>;
}

export interface ChannelSpec<T> {
	reducer: (a: T, b: T) => T;
	default: () => T;
}

export interface Annotate {
	<T>(spec: ChannelSpec<T>): unknown;
	Root: (channels: Record<string, unknown>) => unknown;
}

/** The narrow slice of LangGraph the runtime uses, typed structurally. */
export interface LangDeps {
	StateGraph: new <S>(schema: unknown) => GraphBuilder<S>;
	Annotation: Annotate;
	START: string;
	END: string;
}

/**
 * The one command that makes the flow runtime available.
 *
 * `--include=optional`, not `--save-optional`: all four packages are ALREADY in
 * package.json's optionalDependencies and pinned in the lockfile, so the job is
 * to install what is declared — not to re-resolve from the registry and rewrite
 * the ranges. The names ride along as a comment so the line still says what it
 * restores.
 */
export function langMissing(): string {
	const names = [LANGGRAPH, LANGCHAIN_CORE, LANGCHAIN, LANGCHAIN_ANTHROPIC].join(", ");
	return `npm install --include=optional  # restores ${names}`;
}

function shape(mod: Record<string, unknown>): LangDeps | null {
	const { StateGraph, Annotation, START, END } = mod;
	if (typeof StateGraph !== "function" || typeof Annotation !== "function") return null;
	if (typeof START !== "string" || typeof END !== "string") return null;
	return { StateGraph, Annotation, START, END } as unknown as LangDeps;
}

let cached: LangDeps | null | undefined;

/**
 * LangGraph plus core, or null when either is missing. Cached, because a miss
 * costs a failed module resolution and every node would otherwise pay it.
 * Passing an importer bypasses the cache — only tests do that.
 */
export async function loadLang(importer?: Importer): Promise<LangDeps | null> {
	if (importer === undefined && cached !== undefined) return cached;
	const load = importer ?? nodeImporter;
	let deps: LangDeps | null = null;
	try {
		await load(LANGCHAIN_CORE);
		deps = shape((await load(LANGGRAPH)) as Record<string, unknown>);
	} catch {
		deps = null;
	}
	if (importer === undefined) cached = deps;
	return deps;
}

/** Test seam: forgets a cached load so the next call resolves again. */
export function resetLang(): void {
	cached = undefined;
}
