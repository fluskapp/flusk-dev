/**
 * The runner widget's pure half: label composition (the chip must name a real
 * config or confess the honest empty state — never a phantom), the scan
 * normalizers that tolerate both meta shapes the feature could serve, and the
 * palette command matching.
 */
import { expect, it } from "vitest";
import {
	EMPTY_LABEL,
	matchCommands,
	normalizeDry,
	normalizeScan,
	resolveSelection,
	verifyCommandCount,
	widgetLabel,
} from "../src/ui/react/runconfig/widget-model.js";

it("keeps a stored selection only while it still exists", () => {
	expect(resolveSelection("fix-ci", ["nightly", "fix-ci"])).toBe("fix-ci");
	expect(resolveSelection("deleted", ["nightly", "fix-ci"])).toBe("nightly");
	expect(resolveSelection(null, ["nightly"])).toBe("nightly");
	expect(resolveSelection("anything", [])).toBeNull();
});

it("labels the chip with the selection, or the honest empty state", () => {
	expect(widgetLabel("fix-ci", ["nightly", "fix-ci"])).toBe("fix-ci");
	expect(widgetLabel("gone", ["nightly"])).toBe("nightly");
	expect(widgetLabel(null, [])).toBe(EMPTY_LABEL);
	// IntelliJ's empty-widget copy: imperative, ellipsis for a dialog opener.
	expect(EMPTY_LABEL).toBe("Add Configuration…");
});

it("normalizes a scan with inline meta fields", () => {
	const s = normalizeScan({
		configs: [{ name: "nightly", scope: "project", task: "t", fake: "demo.json" }],
		skipped: [{ path: "/x/bad.json", why: "unknown key: budget" }],
	});
	expect(s.configs).toEqual([{ name: "nightly", scope: "project", task: "t", fake: "demo.json" }]);
	expect(s.skipped).toEqual([{ path: "/x/bad.json", why: "unknown key: budget" }]);
});

it("normalizes a scan that nests the body under `config`, and drops the nameless", () => {
	const s = normalizeScan({
		configs: [
			{ name: "fix-ci", scope: "global", config: { spec: "ci", verify: false } },
			{ scope: "project", config: { task: "orphan" } },
		],
		skipped: "not-an-array",
	});
	expect(s.configs).toEqual([{ name: "fix-ci", scope: "global", spec: "ci", verify: false }]);
	expect(s.skipped).toEqual([]);
});

it("defaults an unknown scope to project — the committed file's scope", () => {
	expect(normalizeScan({ configs: [{ name: "n", scope: "elsewhere" }] }).configs[0]?.scope).toBe("project");
});

it("reads a dry reply as bare text, {text}, or the refusal's {why}", () => {
	expect(normalizeDry("plan")).toBe("plan");
	expect(normalizeDry({ ok: true, text: "plan" })).toBe("plan");
	expect(normalizeDry({ ok: false, why: "no such config" })).toBe("no such config");
	expect(normalizeDry(undefined)).toBe("");
});

it("counts verify commands from either probe shape; unknown stays null", () => {
	expect(verifyCommandCount({ commands: ["npm test"] })).toBe(1);
	expect(verifyCommandCount(["a", "b"])).toBe(2);
	expect(verifyCommandCount({ count: 0 })).toBe(0);
	expect(verifyCommandCount(null)).toBeNull();
});

it("surfaces the two palette commands on 2+ matching characters only", () => {
	expect(matchCommands("r").length).toBe(0);
	expect(matchCommands("run conf").map((c) => c.label)).toEqual(["Run configuration…"]);
	expect(matchCommands("CONFIGURATION").map((c) => c.label)).toEqual([
		"Run configuration…",
		"Edit configurations…",
	]);
	// Both commands open the dialog on the stored selection, or a blank form.
	for (const c of matchCommands("configuration")) {
		expect(c.rc("nightly")).toBe("nightly");
		expect(c.rc(null)).toBe("new");
	}
});
