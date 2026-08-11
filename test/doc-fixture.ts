/**
 * A tiny but real TypeScript project on disk for the doc-engine tests: a
 * documented exported function, an interface, a class with a documented
 * method, and a second file that calls the function so "find usages" has a
 * cross-file answer to find.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const GREET_TS = `/**
 * Greets a person by name.
 * @param who the name to greet
 * @returns the greeting line
 */
export function greet(who: string): string {
	return \`hello \${who}\`;
}

export interface Person {
	name: string;
}

export class Greeter {
	/** Greets everyone in the room. */
	all(people: Person[]): string {
		return people.map((p) => greet(p.name)).join(", ");
	}
}
`;

export const USE_TS = `import { greet } from "./greet.js";

export const line = greet("world");
`;

const TSCONFIG = JSON.stringify({
	compilerOptions: {
		target: "ES2022",
		module: "NodeNext",
		moduleResolution: "NodeNext",
		strict: true,
	},
	include: ["src"],
});

export interface DocFixture {
	root: string;
	greet: string;
	use: string;
	cleanup(): void;
}

/** `extra` writes additional files, e.g. to push a project over the file cap. */
export function docProject(extra: Record<string, string> = {}): DocFixture {
	const root = mkdtempSync(join(tmpdir(), "ah-doc-"));
	mkdirSync(join(root, "src"), { recursive: true });
	writeFileSync(join(root, "tsconfig.json"), TSCONFIG);
	writeFileSync(join(root, "src", "greet.ts"), GREET_TS);
	writeFileSync(join(root, "src", "use.ts"), USE_TS);
	for (const [name, body] of Object.entries(extra)) writeFileSync(join(root, "src", name), body);
	return {
		root,
		greet: join(root, "src", "greet.ts"),
		use: join(root, "src", "use.ts"),
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

/** 1-based line/col of the `nth` occurrence of `needle` — the test's own maths. */
export function posOf(src: string, needle: string, nth = 1): { line: number; col: number } {
	let idx = -1;
	for (let i = 0; i < nth; i++) {
		idx = src.indexOf(needle, idx + 1);
		if (idx === -1) throw new Error(`no occurrence ${i + 1} of ${needle}`);
	}
	const before = src.slice(0, idx);
	return { line: before.split("\n").length, col: idx - before.lastIndexOf("\n") };
}
