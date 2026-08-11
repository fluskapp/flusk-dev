/**
 * The design system as data: every colour, metric and type step the workbench
 * is allowed to use. Colours come from JetBrains' own IntelliJ New UI theme
 * files (docs/expUI_light.json, docs/expUI_dark.json), so each is traceable.
 *
 * Two layers:
 *   RAMPS     the raw named palette (--ij-gray-1 …). This module only —
 *             scripts/check-design.sh fails any other file that reads one.
 *   SEMANTIC  what the rest of the CSS consumes (--ij-bg-panel …). Each row
 *             carries the theme key its value came from; that key is emitted
 *             beside the declaration, and a "~" source is not in the files.
 */

export type ThemeName = "light" | "dark";

const R = (s: string): string[] => s.split(" ");

/** colors{} of each theme file, ramp by ramp. Index 0 is …1 (Gray1, Blue1). */
export const RAMPS: Record<ThemeName, Record<string, string[]>> = {
	light: {
		gray: R("#000000 #27282E #383A42 #494B57 #5A5D6B #6C707E #818594 #A8ADBD #C9CCD6 #D3D5DB #DFE1E5 #EBECF0 #F7F8FA #FFFFFF"),
		blue: R("#2E55A3 #315FBD #3369D6 #3574F0 #4682FA #588CF3 #709CF5 #88ADF7 #A0BDF8 #C2D6FC #D4E2FF #EDF3FF #F5F8FE"),
		green: R("#1E6B33 #1F7536 #1F8039 #208A3C #369650 #55A76A #89C398 #AFDBB8 #C5E5CC #E3F7E7 #F2FCF3"),
		yellow: R("#A46704 #C27D04 #DF9303 #FFAF0F #FDBD3D #FED277 #FEE6B1 #FFF1D1 #FFF5DB #FFFAEB"),
		red: R("#AD2B38 #BC303E #CC3645 #DB3B4B #E55765 #E46A76 #ED99A1 #F2B6BB #FAD4D8 #FFEBEC #FFF2F3 #FFF7F7"),
		orange: R("#A14916 #B85516 #CE6117 #E56D17 #EC8F4C #F2B181 #F9D2B6 #FFEFE3 #FFF4EB"),
		purple: R("#55339C #643CB8 #7444D4 #834DF0 #A177F4 #BFA1F8 #DCCBFB #EFE5FF #F5EDFF #FAF5FF"),
		teal: R("#096A6E #077A7F #058B90 #039BA1 #3FB3B8 #7BCCCF #B6E4E5 #DAF4F5 #F2FCFC"),
	},
	dark: {
		gray: R("#1E1F22 #2B2D30 #393B40 #43454A #4E5157 #5A5D63 #6F737A #868A91 #9DA0A8 #B4B8BF #CED0D6 #DFE1E5 #F0F1F2 #FFFFFF"),
		blue: R("#25324D #2E436E #35538F #375FAD #366ACE #3574F0 #467FF2 #548AF7 #6B9BFA #83ACFC #99BBFF #B5CEFF #D1E0FF"),
		green: R("#253627 #273828 #375239 #436946 #4E8052 #57965C #5FAD65 #73BD79 #89CC8E #A0DBA5 #B9EBBD #D4FAD7"),
		yellow: R("#3D3223 #5E4D33 #826A41 #9E814A #BA9752 #D6AE58 #F2C55C #F5D273 #F7DE8B #FCEBA4 #FFF6BD"),
		red: R("#402929 #472B2B #5E3838 #7A4343 #9C4E4E #BD5757 #DB5C5C #E37774 #EB938D #F2B1AA #F7CCC6 #FAE3DE"),
		orange: R("#45322B #614438 #825845 #A36B4E #C27A53 #E08855 #E5986C #F0AC81 #F5BD98 #FACEAF #FFDFC7"),
		purple: R("#2F2936 #3B3147 #433358 #583D7A #6C469C #8150BE #955AE0 #A571E6 #B589EC #C4A0F3 #D4B8F9 #E4CEFF"),
		teal: R("#1D3838 #1D3D3B #1E4D4A #20635D #21786F #238E82 #24A394 #42B1A4 #60C0B5 #7DCEC5 #9BDDD6 #B9EBE6"),
	},
};

/** [token, light ramp step, dark ramp step, the theme key it was read from]. */
export const SEMANTIC: ReadonlyArray<readonly [string, string, string, string]> = [
	["bg-surface", "gray-14", "gray-1", "EditorTabs.background"],
	["bg-panel", "gray-13", "gray-2", "*.background"],
	["bg-editor", "gray-14", "gray-1", "Editor.SearchField.background"],
	["bg-tw-header", "gray-13", "gray-2", "ToolWindow.Header.inactiveBackground"],
	["bg-inset", "gray-13", "gray-2", "Table.stripeColor"],
	["border", "gray-12", "gray-1", "Borders.color"],
	["separator", "gray-12", "gray-3", "*.separatorColor"],
	["border-control", "gray-9", "gray-5", "Component.borderColor"],
	["text", "gray-1", "gray-12", "Editor.ToolTip.foreground"],
	["text-secondary", "gray-6", "gray-9", "StatusBar.Widget.foreground"],
	["text-disabled", "gray-8", "gray-6", "*.disabledText"],
	// A badge's foreground is Gray1 in dark; a default BUTTON's is white in both.
	["text-on-accent", "gray-14", "gray-1", "Badge.blueForeground"],
	["button-default-fg", "gray-14", "gray-14", "Button.default.foreground"],
	["link", "blue-2", "blue-9", "Link.activeForeground"],
	["selection", "blue-11", "blue-2", "*.selectionBackground"],
	["selection-inactive", "gray-11", "gray-4", "*.selectionInactiveBackground"],
	["selection-text", "gray-1", "gray-12", "*.selectionForeground"],
	["seg-selected", "gray-14", "gray-3", "SegmentedButton.selectedButtonColor"],
	["seg-selected-focused", "blue-11", "blue-3", "SegmentedButton.focusedSelectedButtonColor"],
	["search-option-on", "blue-11", "blue-3", "SearchOption.selectedBackground"],
	["hover", "blue-12", "gray-3", "*.hoverBackground"],
	["focus-ring", "blue-4", "blue-6", "*.focusColor"],
	["accent", "blue-4", "blue-6", "Button.default.startBackground"],
	["accent-hover", "blue-3", "blue-5", "~ derived: one Blue step off Button.default"],
	["accent-soft", "blue-12", "blue-1", "~ derived: the Blue ramp's own subtle end"],
	["notification-bg", "gray-2", "gray-3", "Notification.background"],
	["notification-fg", "gray-13", "gray-13", "Notification.foreground"],
	["status-error", "red-4", "red-7", "Label.errorForeground"],
	["status-warning", "yellow-1", "yellow-5", "Label.warningForeground"],
	["status-success", "green-4", "green-7", "Plugins.Button.installForeground"],
	["match-bg", "yellow-7", "yellow-5", "SearchMatch.startBackground"],
	["match-fg", "gray-1", "gray-1", "~ derived: darkest Gray, both match tints are light"],
];

const NO_METRIC = "~ not in the theme file; the value the workbench already uses";

/** [token, value, source]. IntelliJ's own metrics where the theme has them. */
export const METRICS: ReadonlyArray<readonly [string, string, string]> = [
	["row-h", "24px", "Tree.rowHeight and List.rowHeight"],
	["control-h", "28px", "TextField.minimumSize 49,28 and Button.minimumSize 72,28"],
	["tab-h", "40px", "TabbedPane.tabHeight"],
	["tw-header-h", "26px", NO_METRIC],
	["toolbar-h", "34px", NO_METRIC],
	["status-h", "22px", NO_METRIC],
	["space-1", "2px", "~ derived: half the spacing step"],
	["space", "4px", "Tree.border 4,12,4,12 and List.border 4,0,4,0 vertical inset"],
	["space-2", "8px", "List.Button.leftRightInset"],
	["space-3", "12px", "Tree.border 4,12,4,12 horizontal inset"],
	["space-4", "16px", "~ derived: four spacing steps"],
	["radius", "8px", "Component.arc and Button.arc"],
	["radius-sm", "4px", "EditorTabs.underlineArc and TabbedPane.tabSelectionArc"],
	["underline-h", "4px", "EditorTabs.underlineHeight"],
	["focus-ring-w", "1px", NO_METRIC],
];

const NO_TYPE = "~ fonts and sizes are IDE settings, not theme keys; workbench value";

/** [token, value, source]. The theme files carry no typography at all. */
export const TYPE: ReadonlyArray<readonly [string, string, string]> = [
	["font-ui", `-apple-system, "Segoe UI", "Inter", "Helvetica Neue", sans-serif`, NO_TYPE],
	["font-mono", `"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace`, NO_TYPE],
	["fs-1", "10px", NO_TYPE],
	["fs-2", "10.5px", NO_TYPE],
	["fs-3", "11px", NO_TYPE],
	["fs-4", "11.5px", NO_TYPE],
	["fs-5", "12px", NO_TYPE],
	["fs-6", "12.5px", NO_TYPE],
	["fs-7", "13.5px", NO_TYPE],
	["fs-8", "15px", NO_TYPE],
	["fs-9", "18px", NO_TYPE],
	["lh-tight", "1.3", NO_TYPE],
	["lh-code", "1.55", NO_TYPE],
	["lh", "1.5", NO_TYPE],
	["lh-loose", "1.6", NO_TYPE],
];

/** "gray-13" -> the hex that step holds in `theme`. "" when there is none. */
export function resolve(theme: ThemeName, ref: string): string {
	const cut = ref.lastIndexOf("-");
	const ramp = RAMPS[theme][ref.slice(0, cut)];
	return ramp?.[Number(ref.slice(cut + 1)) - 1] ?? "";
}

/** The raw palette of one theme. Redefined per theme so --ij-gray-1 flips. */
export function rampVars(theme: ThemeName): string {
	const out: string[] = [];
	for (const [name, hexes] of Object.entries(RAMPS[theme]))
		hexes.forEach((hex, i) => out.push(`--ij-${name}-${i + 1}: ${hex};`));
	return out.join(" ");
}

/** The semantic layer of one theme, each declaration tagged with its key. */
export function semanticVars(theme: ThemeName): string {
	return SEMANTIC.map(
		([token, light, dark, src]) =>
			`--ij-${token}: var(--ij-${theme === "light" ? light : dark}); /* ${src} */`,
	).join("\n\t");
}

const decl = ([token, value, src]: readonly [string, string, string]): string =>
	`--ij-${token}: ${value}; /* ${src} */`;

/** Metrics and typography do not change with the theme, so they emit once. */
export const METRIC_VARS = METRICS.map(decl).join("\n\t");
export const TYPE_VARS = TYPE.map(decl).join("\n\t");
