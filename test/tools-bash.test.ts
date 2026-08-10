import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEventBus } from "../src/core/events.js";
import type { Policy } from "../src/safety/policy.js";
import { allowAllPolicy } from "../src/safety/policy.js";
import { bashTool } from "../src/tools/bash.js";
import type { ToolContext } from "../src/tools/tool.js";

let dir: string;

function ctx(overrides: Partial<ToolContext> = {}): ToolContext {
	return {
		repoRoot: dir,
		cwd: dir,
		signal: new AbortController().signal,
		policy: allowAllPolicy,
		events: createEventBus(),
		...overrides,
	};
}

beforeAll(async () => {
	dir = await mkdtemp(join(tmpdir(), "ah-bash-"));
});

afterAll(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe("bash tool", () => {
	it("round-trips echo output with exit code 0", async () => {
		const res = await bashTool.execute({ command: "echo hello" }, ctx());
		expect(res.output).toContain("hello");
		expect(res.output).not.toContain("[exit code");
		expect(res.details).toEqual({ exitCode: 0 });
	});

	it("runs in ctx.cwd", async () => {
		const res = await bashTool.execute({ command: "pwd" }, ctx());
		expect(res.output.trim().endsWith(dir.split("/").pop() as string)).toBe(true);
	});

	it("appends the exit code for a failing command without throwing", async () => {
		const res = await bashTool.execute({ command: "false" }, ctx());
		expect(res.output).toContain("[exit code 1]");
		expect(res.details).toEqual({ exitCode: 1 });
	});

	it("throws on timeout", async () => {
		await expect(
			bashTool.execute({ command: "sleep 5", timeout_ms: 200 }, ctx()),
		).rejects.toThrowError(/timed out after 200ms/);
	});

	it("throws when the policy denies the command", async () => {
		const denyAll: Policy = {
			decide: () => ({ allow: false, reason: "bash is forbidden here" }),
		};
		await expect(
			bashTool.execute({ command: "echo hi" }, ctx({ policy: denyAll })),
		).rejects.toThrowError("bash is forbidden here");
	});

	it("streams accumulated output via onUpdate", async () => {
		const updates: string[] = [];
		const res = await bashTool.execute(
			{ command: "echo one; echo two" },
			ctx({ onUpdate: (p) => updates.push(p) }),
		);
		expect(updates.length).toBeGreaterThan(0);
		expect(updates.at(-1)).toBe(res.output);
	});

	it("interleaves stderr into the output", async () => {
		const res = await bashTool.execute({ command: "echo err >&2" }, ctx());
		expect(res.output).toContain("err");
	});

	it("settles promptly when a background child holds stdout open", async () => {
		// 'close' never fires while the grandchild holds the pipe; 'exit' + grace must settle.
		const res = await bashTool.execute({ command: "sleep 5 & echo hi" }, ctx());
		expect(res.output).toContain("hi");
		expect(res.details).toEqual({ exitCode: 0 });
	}, 3_000);

	it("timeout kills the whole process group, including pipeline children", async () => {
		await expect(
			bashTool.execute({ command: "sleep 30 | cat", timeout_ms: 200 }, ctx()),
		).rejects.toThrowError(/timed out after 200ms/);
	}, 3_000);

	it("rejects without running the command when the signal is already aborted", async () => {
		const controller = new AbortController();
		controller.abort();
		const marker = join(dir, "should-not-exist");
		await expect(
			bashTool.execute({ command: `touch ${marker}` }, ctx({ signal: controller.signal })),
		).rejects.toThrowError(/aborted before execution/);
		expect(existsSync(marker)).toBe(false);
	});
});
