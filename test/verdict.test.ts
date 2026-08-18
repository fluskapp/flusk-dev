/**
 * The unified verdict: status grammar in, one of five answers out, and the
 * run-level ladder that folds the gate's word in. Blocked is warn, not err.
 */
import { expect, it } from "vitest";
import { runVerdict, statusToVerdict } from "../src/features/run/verdict.types.js";

it("statusToVerdict maps the whole status grammar, case-insensitively", () => {
	expect(statusToVerdict("running")).toBe("live");
	expect(statusToVerdict("active")).toBe("live");
	expect(statusToVerdict("completed")).toBe("ok");
	expect(statusToVerdict("done")).toBe("ok");
	expect(statusToVerdict("ok")).toBe("ok");
	expect(statusToVerdict("pass")).toBe("ok");
	expect(statusToVerdict("passed")).toBe("ok");
	expect(statusToVerdict("error")).toBe("err");
	expect(statusToVerdict("failed")).toBe("err");
	expect(statusToVerdict("blocked")).toBe("warn");
	expect(statusToVerdict("stopped")).toBe("warn");
	expect(statusToVerdict("aborted")).toBe("none");
	expect(statusToVerdict("")).toBe("none");
	expect(statusToVerdict("something-foreign")).toBe("none");
	expect(statusToVerdict("Completed")).toBe("ok");
});

it("runVerdict folds the gate in: blocked wins over completed, report WARN/BLOCK demote", () => {
	expect(runVerdict("running")).toBe("live");
	expect(runVerdict("running", { outcome: "blocked" })).toBe("live");
	expect(runVerdict("error", { outcome: "blocked" })).toBe("err");
	expect(runVerdict("error", { reportCheck: "ALLOW" })).toBe("err");
	expect(runVerdict("blocked")).toBe("warn");
	expect(runVerdict("completed", { outcome: "blocked" })).toBe("warn");
	expect(runVerdict("completed", { reportCheck: "BLOCK" })).toBe("warn");
	expect(runVerdict("completed", { reportCheck: "WARN" })).toBe("warn");
	expect(runVerdict("completed", { reportCheck: "ALLOW" })).toBe("ok");
	expect(runVerdict("completed")).toBe("ok");
	expect(runVerdict("completed", null)).toBe("ok");
	expect(runVerdict("stopped")).toBe("warn");
	expect(runVerdict("aborted")).toBe("none");
});
