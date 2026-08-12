/**
 * The property the gate exists for: a report that claims more than the
 * harness saw must not pass. The comparison is between the report and
 * observations the model cannot forge — a check of harness state against
 * harness state is self-fulfilling and could never block anything.
 */
import { expect, it } from "vitest";
import { checkReportText, type Observations } from "../src/features/verify/report-check.js";

const nothing: Observations = { verify: [], filesTouched: [], commandsRun: [] };

const ran = (cmd: string, exit = 0): Observations => ({
	verify: [],
	filesTouched: ["src/parser.ts"],
	commandsRun: [{ cmd, exit }],
});

it("BLOCKs a fabricated pass when nothing was verified", () => {
	const v = checkReportText("Fixed the parser — all tests pass now.", nothing);
	expect(v.verdict).toBe("BLOCK");
	expect(v.reasons[0]).toContain("claims verification passed");
});

it("BLOCKs when the claimed verification only failed", () => {
	const v = checkReportText("The build succeeds.", ran("npm run build", 1));
	expect(v.verdict).toBe("BLOCK");
});

it("ALLOWs the same claim when the gate actually ran it", () => {
	const v = checkReportText("All tests pass.", {
		verify: [{ cmd: "npm test", exitCode: 0 }],
		filesTouched: ["src/a.ts"],
		commandsRun: [],
	});
	expect(v.verdict).toBe("ALLOW");
	expect(v.reasons).toEqual([]);
});

it("ALLOWs when the agent verified it itself", () => {
	expect(checkReportText("Tests are green.", ran("npx vitest run")).verdict).toBe("ALLOW");
});

it("does not count a skipped gate command as evidence", () => {
	const v = checkReportText("Checks pass.", {
		verify: [{ cmd: "npm test", exitCode: 0, skipped: true }],
		filesTouched: ["x"],
		commandsRun: [],
	});
	expect(v.verdict).toBe("BLOCK");
});

it("warns, not blocks, when edits are described but nothing was written", () => {
	const v = checkReportText("I updated the retry logic.", nothing);
	expect(v.verdict).toBe("WARN");
	expect(v.reasons[0]).toContain("no file was written");
});

it("warns when the report cites a command that never ran", () => {
	const v = checkReportText("Ran `cargo clippy` to confirm.", ran("npm test"));
	expect(v.verdict).toBe("WARN");
	expect(v.reasons.some((r) => r.includes("cargo clippy"))).toBe(true);
});

it("stays quiet on an honest, modest report", () => {
	const v = checkReportText(
		"Looked into the failure. The cause is a race in the queue; I have not changed anything yet.",
		nothing,
	);
	expect(v).toEqual({ verdict: "ALLOW", reasons: [] });
});

it("blocking beats warning when both fire", () => {
	const v = checkReportText("I updated the retry logic and the tests pass.", nothing);
	expect(v.verdict).toBe("BLOCK");
	expect(v.reasons.length).toBeGreaterThan(1);
});

it('ignores "fixed" as an edit claim, which reads as an adjective too often', () => {
	// "the fixed timeout", "a fixed set of retries" — too many false positives
	// to treat as evidence of having written code.
	expect(checkReportText("Explained why the fixed timeout is wrong.", nothing).verdict).toBe(
		"ALLOW",
	);
});
