import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { resolveSessionPath, resumeCmd } from "../src/cli/resume-cmd.js";
import { assistantText, assistantToolCalls } from "../src/features/provider/fake.js";
import { Session } from "../src/features/session/session-file.repository.js";
import { scanSessions } from "../src/features/projects/scan.repository.js";
import { capture, git, initGitRepo, SLOW } from "./cli2-helpers.js";
import { fakeModel, setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("flusk-cli-resume-");
}, SLOW);
afterEach(() => teardownTestHome(), SLOW);

test("resume by bare id repairs the session in place through the fake provider", async () => {
	const dead = Session.create({ task: "fix bug", repoRoot: repo, model: fakeModel });
	dead.appendMessage({ role: "user", content: "fix bug" });
	dead.appendMessage(assistantToolCalls([{ id: "d1", name: "bash", args: { command: "echo x" } }]));
	const id = dead.id;
	const path = dead.path;
	dead.close();

	expect(resolveSessionPath(id)).toBe(path);
	expect(() => resolveSessionPath("ffffffff")).toThrow(/no session matching/);

	const script = join(repo, "..", "resume-script.json");
	await writeFile(script, JSON.stringify([{ message: assistantText("resumed fine") }]));
	const cap = capture();
	const reason = await resumeCmd({
		ref: id,
		fake: script,
		steer: "skip the command",
		quiet: true,
		out: cap.out,
	});
	expect(reason).toBe("completed");
	expect(cap.text()).toContain(`completed · 1 turns · $`);
	expect(cap.text()).toContain(path); // same file, no new session

	const resumed = Session.load(path);
	const context = resumed.buildContext();
	expect(context[2]).toMatchObject({ role: "toolResult", callId: "d1", isError: true });
	expect(context[3]).toEqual({ role: "user", content: "skip the command" });
	expect(context[4]).toMatchObject({ role: "assistant" });
	resumed.close();
	expect(scanSessions()).toHaveLength(1);
}, SLOW);

test("resume warns when the working tree is on a different branch than the session", async () => {
	await initGitRepo(repo);
	const s = Session.create({ task: "t", repoRoot: repo, model: fakeModel });
	s.appendMessage({ role: "user", content: "t" });
	const id = s.id;
	s.close();
	git(repo, "checkout", "-q", "-b", "elsewhere");

	const script = join(repo, "..", "warn-script.json");
	await writeFile(script, JSON.stringify([{ message: assistantText("ok") }]));
	const cap = capture();
	const reason = await resumeCmd({ ref: id, fake: script, quiet: true, out: cap.out });
	expect(reason).toBe("completed");
	expect(cap.text()).toMatch(/warning: .* is on elsewhere but the session ran on /);
}, SLOW);
