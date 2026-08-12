import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, test } from "vitest";
import { runCmd } from "../src/cli/run-cmd.js";
import { zeroUsage } from "../src/core/types.js";
import { Session } from "../src/session/session.js";

const fixture = fileURLToPath(new URL("./fixtures/demo-script.json", import.meta.url));

let tmp: string;
let repo: string;

beforeAll(async () => {
	tmp = await mkdtemp(join(tmpdir(), "flusk-cli-"));
	process.env.FLUSK_HOME = join(tmp, "home");
	repo = join(tmp, "repo");
	await mkdir(repo, { recursive: true });
});

afterAll(() => {
	delete process.env.FLUSK_HOME;
});

function capture(): { out: PassThrough; text: () => string } {
	const out = new PassThrough();
	let text = "";
	out.on("data", (chunk: Buffer) => {
		text += chunk.toString("utf8");
	});
	return { out, text: () => text };
}

async function sessionFiles(): Promise<string[]> {
	const root = join(process.env.FLUSK_HOME as string, "sessions");
	const names = (await readdir(root, { recursive: true })) as string[];
	return names.filter((n) => n.endsWith(".jsonl")).map((n) => join(root, n));
}

test("fixture script completes; session persists and replays", async () => {
	const cap = capture();
	const reason = await runCmd({ task: "fixture task", repo, fake: fixture, out: cap.out });
	expect(reason).toBe("completed");

	const files = await sessionFiles();
	expect(files).toHaveLength(1);
	const session = Session.load(files[0] as string);
	// Deep-equal replay: any dropped or corrupted field (usage, args, isError)
	// on the CLI path fails here, not just the spot-checked messages.
	expect(session.buildContext()).toEqual([
		{ role: "user", content: "fixture task" },
		{
			role: "assistant",
			content: [
				{ type: "text", text: "Let me run a command.\n" },
				{ type: "toolCall", id: "fx-1", name: "bash", args: { command: "echo fixture works" } },
			],
			stopReason: "toolUse",
			usage: zeroUsage(),
		},
		{ role: "toolResult", callId: "fx-1", name: "bash", output: "fixture works\n", isError: false },
		{
			role: "assistant",
			content: [{ type: "text", text: "Fixture run finished." }],
			stopReason: "end",
			usage: { input: 5, output: 5, cacheRead: 0, costUsd: 0.002 },
		},
	]);
	session.close();

	expect(cap.text()).toContain("→ bash: echo fixture works");
	expect(cap.text()).toContain("done completed · 2 turns");
});

test("built-in demo script completes", async () => {
	const cap = capture();
	const reason = await runCmd({ task: "demo", repo, out: cap.out });
	expect(reason).toBe("completed");
	expect(cap.text()).toContain("→ bash: echo hello from flusk");
	expect(cap.text()).toContain("Demo complete");
	expect(cap.text()).toContain("done completed");
});

test("script whose only turn is stopReason error yields non-completed reason", async () => {
	const errScript = join(tmp, "error-script.json");
	await writeFile(
		errScript,
		JSON.stringify([
			{
				message: {
					role: "assistant",
					content: [],
					stopReason: "error",
					errorMessage: "scripted failure",
				},
			},
		]),
	);
	const cap = capture();
	const reason = await runCmd({ task: "will fail", repo, fake: errScript, out: cap.out });
	expect(reason).not.toBe("completed");
	expect(reason).toBe("error");
	expect(cap.text()).toContain("done error");
});

test("quiet mode suppresses the renderer but still prints the stats line", async () => {
	const cap = capture();
	const reason = await runCmd({ task: "quiet demo", repo, quiet: true, out: cap.out });
	expect(reason).toBe("completed");
	expect(cap.text()).not.toContain("→ bash:");
	expect(cap.text()).toMatch(/^completed · \d+ turns · \$/);
});
