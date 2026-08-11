/**
 * The token layer's contract. The palette is NOT copied here: every value
 * assertion resolves the key recorded in SEMANTIC against the JetBrains theme
 * files in docs/, so the comment beside each declaration is verified, not
 * decorative. If a theme file changes, this test is what notices.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { THEME_CSS } from "../src/ui/styles-theme.js";
import { METRICS, resolve, SEMANTIC, type ThemeName } from "../src/ui/styles-tokens.js";

/** The theme files are JSONC — strip `//` comments before parsing. */
function themeFile(name: ThemeName): { colors: Record<string, string>; ui: unknown } {
	const raw = readFileSync(`docs/expUI_${name}.json`, "utf8")
		.replace(/^\s*\/\/.*$/gm, "")
		.replace(/(:\s*"[^"]*")\s*\/\/.*$/gm, "$1");
	return JSON.parse(raw);
}

const THEMES: Record<ThemeName, ReturnType<typeof themeFile>> = {
	light: themeFile("light"),
	dark: themeFile("dark"),
};

/** "Editor.ToolTip.foreground" -> the hex it holds, following named colours. */
function keyValue(theme: ThemeName, key: string): string {
	let node: unknown = THEMES[theme].ui;
	for (const part of key.split(".")) {
		if (node && typeof node === "object" && part in node) {
			node = (node as Record<string, unknown>)[part];
			continue;
		}
		// expUI flattens some keys ("SearchField.background" under a parent).
		const rest = key.slice(key.indexOf(part));
		node = node && typeof node === "object" ? (node as Record<string, unknown>)[rest] : undefined;
		break;
	}
	const value = typeof node === "string" ? node : "";
	return (THEMES[theme].colors[value] ?? value).toUpperCase();
}

/** The declarations of one theme: light is bare :root, dark is the toggle. */
function block(theme: ThemeName): string {
	const start = THEME_CSS.indexOf(theme === "light" ? ":root {" : ':root[data-theme="dark"] {');
	return THEME_CSS.slice(start, THEME_CSS.indexOf("}", start));
}

const themes: ThemeName[] = ["light", "dark"];

describe("semantic tokens", () => {
	it("declares every semantic token in both themes", () => {
		for (const theme of themes) {
			const css = block(theme);
			for (const [token] of SEMANTIC) expect(css, `${token} in ${theme}`).toContain(`--ij-${token}:`);
		}
	});

	it("never resolves one to an empty value", () => {
		for (const theme of themes)
			for (const [token, light, dark] of SEMANTIC) {
				const hex = resolve(theme, theme === "light" ? light : dark);
				expect(hex, `${token} in ${theme}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
			}
	});

	it("matches the JetBrains theme files exactly", () => {
		let checked = 0;
		for (const [token, light, dark, source] of SEMANTIC) {
			if (source.startsWith("~")) continue;
			for (const theme of themes) {
				const want = keyValue(theme, source);
				expect(want, `${source} missing from ${theme}`).toMatch(/^#[0-9A-F]{6}$/);
				expect(resolve(theme, theme === "light" ? light : dark).toUpperCase(), `${token} ${theme}`).toBe(want);
				checked++;
			}
		}
		expect(checked).toBeGreaterThan(40);
	});

	it("names a real theme key, or says it did not", () => {
		for (const [token, , , source] of SEMANTIC)
			expect(source.startsWith("~") || source.includes("."), `${token}: ${source}`).toBe(true);
	});
});

describe("metrics", () => {
	const metric = (name: string): string => METRICS.find(([m]) => m === name)?.[1] ?? "";

	it("takes its sourced values from the theme files", () => {
		const ui = THEMES.light.ui as Record<string, Record<string, unknown>>;
		expect(metric("row-h")).toBe(`${ui.Tree?.rowHeight}px`);
		expect(metric("tab-h")).toBe(`${ui.TabbedPane?.tabHeight}px`);
		expect(metric("radius")).toBe(`${ui.Component?.arc}px`);
		expect(metric("radius-sm")).toBe(`${ui.EditorTabs?.underlineArc}px`);
		expect(metric("control-h")).toBe(`${String(ui.TextField?.minimumSize).split(",")[1]}px`);
	});

	it("marks every value the theme files do not carry", () => {
		for (const [token, value, source] of METRICS) {
			expect(value, token).toMatch(/^[0-9.]+px$/);
			expect(source.startsWith("~") || /[A-Z]/.test(source), `${token}: ${source}`).toBe(true);
		}
	});
});

describe("the rest of the CSS", () => {
	const styles = readdirSync("src/ui").filter((f) => f.startsWith("styles-") && f.endsWith(".ts"));
	const css = styles.map((f) => readFileSync(`src/ui/${f}`, "utf8")).join("\n") + THEME_CSS;
	// --tw-* are the resizable tool-window widths; client-grips.ts writes them.
	const defined = new Set([...css.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]));

	it("only references variables the token layer defines", () => {
		for (const used of new Set([...css.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1])))
			expect(defined.has(used as string), `${used} is used but never defined`).toBe(true);
	});

	it("keeps the three theme states", () => {
		expect(THEME_CSS).toContain(':root[data-theme="dark"]');
		expect(THEME_CSS).toContain("@media (prefers-color-scheme: dark)");
		expect(THEME_CSS).toContain(':root:not([data-theme="light"])');
		for (const [token] of SEMANTIC) expect(THEME_CSS).toContain(`--ij-${token}:`);
	});

	it("aliases the old names onto semantic tokens", () => {
		for (const alias of ["--bg", "--panel", "--border", "--text", "--dim", "--accent", "--row"])
			expect(THEME_CSS).toMatch(new RegExp(`${alias}: var\\(--ij-`));
	});
});
