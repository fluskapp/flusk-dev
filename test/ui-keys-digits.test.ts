/**
 * The digit bindings, checked against each other rather than one at a time.
 *
 * A number the handler admits but does not act on is worse than an unbound
 * key: the chorded branch calls preventDefault before it discovers there is
 * nothing behind the number, so ⌘4 stops switching browser tabs and opens
 * nothing instead. The two lists have to agree, and the help sheet with them.
 */
import { expect, it } from "vitest";
import { HELP_HTML } from "../src/ui/client-help.js";
import { CLIENT_KEYS_JS } from "../src/ui/client-keys.js";

/** The digits each `/^…$/.test(e.key)` pattern in the handler admits. */
function admitted(): string[][] {
	const patterns = [...CLIENT_KEYS_JS.matchAll(/\/\^\[([^\]]+)\]\$\/\.test\(e\.key\)/g)];
	expect(patterns.length).toBe(2); // the chorded branch and the bare one
	return patterns.map((m) => {
		const out: string[] = [];
		for (const part of (m[1] ?? "").matchAll(/(\d)-(\d)|(\d)/g)) {
			if (part[3] !== undefined) out.push(part[3]);
			else for (let d = Number(part[1]); d <= Number(part[2] ?? part[1]); d++) out.push(String(d));
		}
		return out;
	});
}

/** Digits `toolWindow` actually does something with. */
function bound(): string[] {
	const explicit = [...CLIENT_KEYS_JS.matchAll(/n === "(\d)"\)\s*\w/g)].map((m) => m[1] as string);
	const panelBlock = CLIENT_KEYS_JS.slice(CLIENT_KEYS_JS.indexOf("var PANEL_KEYS"));
	const panels = [...panelBlock.slice(0, panelBlock.indexOf("}")).matchAll(/"(\d)":/g)].map(
		(m) => m[1] as string,
	);
	return [...explicit, ...panels].sort();
}

it("every digit the handler swallows opens something", () => {
	const [chorded, bare] = admitted();
	expect(chorded).toEqual(bare);
	expect(chorded?.slice().sort()).toEqual(bound());
});

it("every digit that opens something has a row in the help sheet", () => {
	for (const digit of bound()) {
		expect(HELP_HTML).toContain(`<kbd>${digit}</kbd>`);
	}
});
