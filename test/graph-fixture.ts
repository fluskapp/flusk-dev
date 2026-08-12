/**
 * A real, tiny TypeScript project on disk for the code-graph tests, plus the
 * synthetic history the co-change tests need.
 *
 * REAL, not mocked: the structure half of the graph is only worth testing
 * against an actual language service resolving actual `./x.js` specifiers, and
 * an import edge that a fake resolver produces proves nothing about the one
 * flusk will build.
 *
 * The project root is always a directory literally named `proj`, because a
 * node id is `file:<project>/<rel>` where `<project>` is the root's BASENAME:
 * two checkouts of one repo at different absolute paths must mint identical
 * ids, and `cloneFixture` exists to assert exactly that.
 */
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HistoryCard } from "../src/features/history/types.js";

/** Five files: an importer, its two targets, and two islands nothing links to. */
export const SRC: Record<string, string> = {
	"greet.ts": `/** Greets a person by name. */
export function greet(who: string): string {
	return \`hello \${who}\`;
}

export interface Person {
	name: string;
}
`,
	"use.ts": `import { greet } from "./greet.js";
import { util } from "./util.js";

export const line = greet("world");
export const twice = \`\${greet("again")}\${util()}\`;
`,
	"util.ts": `export function util(): number {
	return 42;
}
`,
	"alone.ts": `export const alone = 1;
`,
	"extra.ts": `export const extra = 2;
`,
};

const TSCONFIG = JSON.stringify({
	compilerOptions: {
		target: "ES2022",
		module: "NodeNext",
		moduleResolution: "NodeNext",
		strict: true,
	},
	include: ["src"],
});

export interface GraphFixture {
	/** The project root: always `<tmp>/proj`. */
	root: string;
	/** An FLUSK_HOME of its own, so one test's graph file cannot leak into another. */
	home: string;
	src(name: string): string;
	cleanup(): void;
}

function make(base: string): GraphFixture {
	const root = join(base, "proj");
	mkdirSync(join(root, "src"), { recursive: true });
	const home = join(base, "home");
	mkdirSync(home, { recursive: true });
	return {
		root,
		home,
		src: (name: string) => join(root, "src", name),
		cleanup: () => rmSync(base, { recursive: true, force: true }),
	};
}

export function graphProject(): GraphFixture {
	const fx = make(mkdtempSync(join(tmpdir(), "flusk-graph-")));
	writeFileSync(join(fx.root, "tsconfig.json"), TSCONFIG);
	for (const [name, body] of Object.entries(SRC)) writeFileSync(fx.src(name), body);
	return fx;
}

/**
 * The same project at a DIFFERENT absolute path, same basename — a second
 * clone of one repo. Its ids must come out byte-identical.
 */
export function cloneFixture(fx: GraphFixture): GraphFixture {
	const copy = make(mkdtempSync(join(tmpdir(), "flusk-graph-")));
	cpSync(fx.root, copy.root, { recursive: true });
	return copy;
}

/** A full 40-hex sha, which is what a commit id is required to carry. */
export const sha = (n: number): string => `${n}`.padStart(40, "0");

/** A commit card shaped exactly as src/history/source-git.ts emits one. */
export function commitCard(n: number, paths: string[], title = `commit ${n}`): HistoryCard {
	return {
		id: `commit:proj:${sha(n).slice(0, 8)}`,
		kind: "commit",
		project: "proj",
		title,
		text: title,
		at: new Date(Date.UTC(2026, 0, n)).toISOString(),
		paths,
		outcome: "shipped",
		ref: sha(n),
	};
}

/** An flusk session card: same shape, but its ref is a session key, not a sha. */
export function sessionCard(key: string, paths: string[]): HistoryCard {
	return {
		id: `session:${key}`,
		kind: "session",
		project: "proj",
		title: `run ${key}`,
		text: "",
		at: "2026-01-09T00:00:00.000Z",
		paths,
		outcome: "verified",
		ref: key,
	};
}
