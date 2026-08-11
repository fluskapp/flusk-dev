/**
 * A file's structure view, from TypeScript's navigation tree.
 *
 * The strip is NAVIGATION, and that decides everything here. The compiler
 * returns its tree in whatever order suits it — which came out alphabetical —
 * and includes every import alias and every closure a function body happens
 * to contain: 131 rows for a 148-line file, sorted by name, is a list you
 * cannot scroll alongside the source and cannot use to find anything.
 *
 * So: SOURCE ORDER, because the strip has to track the file it sits beside;
 * no import aliases, because the imports are the top of the file and not its
 * shape; and no descent into function bodies, because a local const is not a
 * landmark. What is left is what an editor's structure view shows — the
 * declarations you would scroll to.
 */
import { locIn } from "./ts-map.js";
import type { OutlineItem } from "./types.js";

type LS = import("typescript").LanguageService;
type NavTree = import("typescript").NavigationTree;

/** `<global>`, `<function>`, `<class>` — nodes with no name worth listing. */
function anonymous(name: string): boolean {
	return name === "" || name.startsWith("<");
}

/** `map() callback`, `hit.matches.some() callback` — a closure, not a member. */
const CALLBACK = /\(\)\s+callback$/;

/** An import binding. Real in the AST, noise in a structure view. */
const HIDDEN_KINDS = new Set(["alias", "import"]);

/** Nothing inside one of these is a landmark: the body is the function. */
const OPAQUE_KINDS = new Set(["function", "method", "constructor", "getter", "setter", "arrow"]);

export function outlineFor(ls: LS, file: string): OutlineItem[] {
	const sf = ls.getProgram()?.getSourceFile(file);
	const tree = ls.getNavigationTree(file);
	if (sf === undefined || tree === undefined) return [];
	const out: OutlineItem[] = [];
	const walk = (node: NavTree, depth: number): void => {
		for (const child of node.childItems ?? []) {
			const span = child.spans[0];
			// An anonymous node is skipped but not pruned: its named children
			// (a method on `export default class {}`) still belong in the outline.
			if (span === undefined || anonymous(child.text) || CALLBACK.test(child.text)) {
				walk(child, depth);
				continue;
			}
			if (HIDDEN_KINDS.has(child.kind)) continue;
			out.push({ name: child.text, kind: child.kind, line: locIn(sf, span).line, depth });
			if (!OPAQUE_KINDS.has(child.kind)) walk(child, depth + 1);
		}
	};
	walk(tree, 0);
	// Source order, stable within a line: a strip sorted by name cannot track
	// the caret, and `outlineClick` navigates by line.
	return out.sort((a, b) => a.line - b.line || a.depth - b.depth);
}
