/**
 * The container runtime, offline: a scripted DockerExec proves the verbs
 * issue exactly the right docker commands (context included), devcontainer
 * discovery honors the repo's own statement, and the bash tool's routed
 * spawn still runs the classifier first — the boundary that must not move.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DevcontainerSpec } from "../src/features/containers/container.types.js";
import { readDevcontainer } from "../src/features/containers/devcontainer.repository.js";
import {
	containerName,
	containerUp,
	execRoute,
	type DockerExec,
} from "../src/features/containers/docker.repository.js";
import { bashTool } from "../src/features/tools/bash.repository.js";
import { createEventBus } from "../src/platform/events/events.js";
import type { ToolContext } from "../src/features/tools/tool.js";

function scripted(answers: Record<string, { status: number; stdout: string }>): {
	docker: DockerExec;
	calls: string[][];
} {
	const calls: string[][] = [];
	return {
		calls,
		docker: (args) => {
			calls.push(args);
			const key = args.find((a) => ["inspect", "run", "rm"].includes(a)) ?? args[0] ?? "";
			const a = answers[key] ?? { status: 1, stdout: "" };
			return { ...a, stderr: "" };
		},
	};
}

describe("docker repository", () => {
	it("up is idempotent and mounts the repo at its own path", () => {
		const repo = "/Users/someone/proj";
		const { docker, calls } = scripted({
			inspect: { status: 1, stdout: "" }, // not running yet
			rm: { status: 0, stdout: "" },
			run: { status: 0, stdout: "abc123\n" },
		});
		containerUp(repo, { image: "img" }, "node:22-bookworm", docker);
		const run = calls.find((c) => c.includes("run"));
		expect(run).toContain("-v");
		expect(run).toContain(`${repo}:${repo}`);
		expect(run).toContain("-w");
		expect(run).toContain(repo);
		expect(run).toContain("node:22-bookworm");
	});

	it("a context prefixes every verb — that is the whole cloud story", () => {
		const { docker, calls } = scripted({ inspect: { status: 0, stdout: "true\timg" } });
		containerUp("/r", { image: "i", context: "ssh-box" }, "i", docker);
		for (const call of calls) {
			expect(call.slice(0, 2)).toEqual(["--context", "ssh-box"]);
		}
	});

	it("exec routes through the container's own shell at the tool's cwd", () => {
		const route = execRoute("/r", { image: "i", context: "cloud" })("echo hi", "/r/sub");
		expect(route.argv0).toBe("docker");
		expect(route.argv).toEqual([
			"--context", "cloud", "exec", "-i", "-w", "/r/sub",
			containerName("/r"), "/bin/sh", "-c", "echo hi",
		]);
	});
});

describe("devcontainer discovery", () => {
	const repoWith = (rel: string, body: string): string => {
		const repo = mkdtempSync(join(tmpdir(), "flusk-devc-"));
		mkdirSync(join(repo, ".devcontainer"), { recursive: true });
		writeFileSync(join(repo, rel), body);
		return repo;
	};

	it("honors an image, tolerating JSONC comments", () => {
		const repo = repoWith(
			".devcontainer/devcontainer.json",
			'{\n// the dev image\n"image": "ghcr.io/x/y:1" /* pinned */\n}',
		);
		expect(readDevcontainer(repo)).toEqual({ image: "ghcr.io/x/y:1" } satisfies DevcontainerSpec);
	});

	it("reports a Dockerfile build as unsupported rather than half-building it", () => {
		const repo = repoWith(".devcontainer/devcontainer.json", '{"build": {"dockerfile": "Dockerfile"}}');
		expect(readDevcontainer(repo)?.unsupported).toContain("Dockerfile/compose");
	});

	it("absent file means no opinion", () => {
		expect(readDevcontainer(mkdtempSync(join(tmpdir(), "flusk-devc-")))).toBeNull();
	});
});

describe("bash tool routing", () => {
	const ctx = (route: ToolContext["commandRoute"], allow: boolean): ToolContext => ({
		repoRoot: "/tmp",
		cwd: "/tmp",
		signal: new AbortController().signal,
		policy: { decide: () => (allow ? { allow: true } : { allow: false, reason: "denied by test" }) },
		events: createEventBus(),
		...(route !== undefined ? { commandRoute: route } : {}),
	});

	it("the classifier rules BEFORE the route is consulted", async () => {
		let consulted = false;
		const route = (): { argv0: string; argv: string[] } => {
			consulted = true;
			return { argv0: "/bin/sh", argv: ["-c", "echo never"] };
		};
		await expect(
			bashTool.execute({ command: "rm -rf /" }, ctx(route, false)),
		).rejects.toThrow("denied by test");
		expect(consulted).toBe(false);
	});

	it("a routed command spawns the router's argv", async () => {
		// The route wraps the command so its output proves which path ran.
		const route = (command: string): { argv0: string; argv: string[] } => ({
			argv0: "/bin/sh",
			argv: ["-c", `echo routed && ${command}`],
		});
		const res = await bashTool.execute({ command: "echo direct" }, ctx(route, true));
		expect(res.output).toContain("routed");
		expect(res.output).toContain("direct");
	});
});
