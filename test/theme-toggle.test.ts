/**
 * The theme toggle resolves the EFFECTIVE theme (ui/react/workbench/theme.ts).
 *
 * data-theme carries a CHOICE, not the current look: unset, the OS is
 * choosing through prefers-color-scheme. Flipping off the attribute alone set
 * data-theme="dark" on an already-dark screen — the first press did nothing
 * visible, and the control read as broken until you pressed it twice.
 */
import { afterEach, expect, it } from "vitest";
import { effectiveTheme, toggleTheme } from "../src/ui/react/workbench/theme.js";

/** Just the two calls the toggle makes — no DOM needed to state the rule. */
function el(theme?: string): HTMLElement {
	const attrs: Record<string, string> = theme === undefined ? {} : { "data-theme": theme };
	return {
		getAttribute: (k: string) => attrs[k] ?? null,
		setAttribute: (k: string, v: string) => {
			attrs[k] = v;
		},
	} as unknown as HTMLElement;
}

/** What the OS says when nothing was chosen. */
function osPrefersDark(dark: boolean): void {
	(globalThis as { matchMedia?: unknown }).matchMedia = (q: string) => ({
		matches: dark && q.includes("dark"),
	});
}

afterEach(() => {
	(globalThis as { matchMedia?: unknown }).matchMedia = undefined;
});

it("reads the OS when no choice was stored, and the choice when there is one", () => {
	osPrefersDark(true);
	expect(effectiveTheme(el())).toBe("dark");
	expect(effectiveTheme(el("light"))).toBe("light");
	osPrefersDark(false);
	expect(effectiveTheme(el())).toBe("light");
	expect(effectiveTheme(el("dark"))).toBe("dark");
});

it("the FIRST press changes the look on a dark-OS default — not a no-op", () => {
	osPrefersDark(true);
	const root = el();
	expect(toggleTheme(root)).toBe("light");
	expect(root.getAttribute("data-theme")).toBe("light");
	expect(toggleTheme(root)).toBe("dark");
});

it("with no matchMedia at all (SSR, old browser) the default is light", () => {
	const root = el();
	expect(effectiveTheme(root)).toBe("light");
	expect(toggleTheme(root)).toBe("dark");
});
