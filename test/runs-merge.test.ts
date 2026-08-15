/**
 * The merged run feed's row model (src/ui/react/runs/feed-row.ts): flow runs
 * take their place among sessions and journals by date, keep their steps for
 * the stage chips, and stay findable by everything the speed search indexes —
 * kind, flow name, arrow shape.
 */
import { describe, expect, it } from "vitest";
import type { FlowRunRow } from "../src/features/flows/flow-runs.repository.js";
import type { RunRow } from "../src/features/projects/projects.types.js";
import {
	feedKind,
	flowStages,
	flowToRow,
	mergeRows,
	rowText,
	rowVal,
	shapeLine,
} from "../src/ui/react/runs/feed-row.js";

const step = (nodeId: string, ok = true) => ({
	nodeId,
	kind: "code" as const,
	at: "2026-08-01T10:00:00Z",
	ok,
	output: "",
	promptTokens: 10,
	costUsd: 0.01,
	...(ok ? {} : { note: "verify failed" }),
});

const flow: FlowRunRow = {
	runId: "2026-08-01T10-00-00-abc",
	flow: "build",
	task: "ship the retry hook",
	at: "2026-08-01T10:00:00Z",
	status: "done",
	project: "proj-a",
	costUsd: 0.03,
	ref: "/h/docs/runs/2026-08-01-flow.md",
	steps: [step("plan"), step("code"), step("verify")],
};

const journal: RunRow = {
	id: "j1",
	kind: "journal",
	project: "proj-a",
	title: "Run: fix the gate",
	status: "done",
	at: "2026-08-02T09:00:00Z",
	ref: "/h/docs/runs/2026-08-02-gate.md",
	progress: "8/13 · gate",
};

describe("feed-row", () => {
	it("a flow run becomes a feed row: kind chip, shape line, steps kept", () => {
		const r = flowToRow(flow);
		expect(r.kind).toBe("flow");
		expect(r.title).toBe("ship the retry hook");
		expect(r.shape).toBe("plan → code → verify");
		expect(r.steps).toHaveLength(3);
		expect(r.ref).toBe(flow.ref);
	});

	it("a retried node appears once in the shape, as the shape names it once", () => {
		expect(shapeLine([step("code", false), step("code"), step("verify")])).toBe("code → verify");
	});

	it("merged rows interleave by date, newest first", () => {
		const rows = mergeRows([journal], [flow]);
		expect(rows.map((r) => r.kind)).toEqual(["journal", "flow"]);
	});

	it("flow steps draw as the stage chips they are", () => {
		const stages = flowStages([step("plan"), step("verify", false)]);
		expect(stages[0]).toEqual({ name: "plan", status: "done", duration: "", detail: "code" });
		// The note, when the step left one, is the hover detail — not the kind.
		expect(stages[1]).toMatchObject({ status: "failed", detail: "verify failed" });
	});

	it("speed search sees kind, flow name and shape; sort sees the shared columns", () => {
		const r = flowToRow(flow);
		expect(rowText(r)).toContain("flow");
		expect(rowText(r)).toContain("build");
		expect(rowText(r)).toContain("plan → code → verify");
		expect(rowVal(r, "cost")).toBe(0.03);
		expect(rowVal(r, "when")).toBe(flow.at);
		expect(rowVal(journal, "run")).toBe("run: fix the gate");
	});

	it("an unrecognized ?kind= is the whole feed, not a crash", () => {
		expect(feedKind(undefined)).toBe("all");
		expect(feedKind("flows")).toBe("all");
		expect(feedKind("flow")).toBe("flow");
	});
});
