import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { formatEvidence, runVerify } from "../src/features/verify/gate.repository.js";

let cwd: string;
beforeAll(async () => {
	cwd = await mkdtemp(join(tmpdir(), "flusk-gate-"));
	await writeFile(join(cwd, "marker.txt"), "from-cwd");
});

describe("runVerify", () => {
	it("passes when every command exits 0 and captures each tail", () => {
		const out = runVerify(["true", "echo ok"], cwd, 5);
		expect(out.passed).toBe(true);
		expect(out.results.map((r) => r.exitCode)).toEqual([0, 0]);
		expect(out.results[1]?.tail).toBe("ok");
		expect(out.results.some((r) => r.skipped)).toBe(false);
	});

	it("stops at the first failure and reports later commands as skipped", () => {
		const out = runVerify(
			["echo one; echo two; echo three; exit 3", "echo never", "echo never2"],
			cwd,
			2,
		);
		expect(out.passed).toBe(false);
		expect(out.results[0]).toMatchObject({ exitCode: 3, tail: "two\nthree" });
		expect(out.results[1]).toMatchObject({ exitCode: -1, tail: "", skipped: true });
		expect(out.results[2]).toMatchObject({ exitCode: -1, tail: "", skipped: true });
	});

	it("includes stderr in the tail", () => {
		const out = runVerify(["echo boom >&2; exit 1"], cwd, 3);
		expect(out.passed).toBe(false);
		expect(out.results[0]?.tail).toContain("boom");
	});

	it("runs commands in the given cwd", () => {
		const out = runVerify(["cat marker.txt"], cwd, 1);
		expect(out.results[0]).toMatchObject({ exitCode: 0, tail: "from-cwd" });
	});

	it("an empty command list passes vacuously", () => {
		expect(runVerify([], cwd, 5)).toEqual({ passed: true, results: [] });
	});
});

describe("formatEvidence", () => {
	it("steers the agent with the failing command, exit code, and tail", () => {
		const out = runVerify(["echo tsc error TS2322; exit 2", "echo never"], cwd, 4);
		const msg = formatEvidence(out.results);
		expect(msg).toContain("Verification failed: echo tsc error TS2322; exit 2 exited 2");
		expect(msg).toContain("tsc error TS2322");
		expect(msg).toContain("Fix the failures, run the command yourself to confirm, then finish.");
	});

	it("returns an empty string when nothing failed", () => {
		expect(formatEvidence(runVerify(["true"], cwd, 5).results)).toBe("");
		expect(formatEvidence([])).toBe("");
	});
});
