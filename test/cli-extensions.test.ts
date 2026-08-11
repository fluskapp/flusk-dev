/**
 * The extension seam is REACHED by a run, which is the part that was missing.
 *
 * `loadExtensions` was correct and orphaned: every `createAgent` call site
 * handed over the hardcoded DEFAULT_TOOLS, so a working
 * `~/.ah/extensions/*.js` registered a tool the agent could never call, said
 * nothing about it, and `--no-extensions` was rejected as an unknown option.
 * These tests assert the wire rather than the loader — the loader has its own
 * suite — so they fail the moment a run command stops going through it.
 *
 * The trust boundary is asserted here too, because it is only observable from
 * the outside: an untrusted project extension must be REFUSED and the refusal
 * must be printed, since a silent skip is indistinguishable from a bug.
 */
import { afterEach, beforeEach, expect, it } from "vitest";
import { runCmd } from "../src/cli/run-cmd.js";
import { toolExtension, trustProject, writeExtension } from "./ext-fixture.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

class Sink {
	text = "";
	write(chunk: string): boolean {
		this.text += chunk;
		return true;
	}
}

const dry = async (over: Record<string, unknown> = {}): Promise<string> => {
	const out = new Sink();
	await runCmd({
		task: "t",
		repo,
		dry: true,
		out: out as unknown as NodeJS.WritableStream,
		...over,
	});
	return out.text;
};

beforeEach(async () => {
	repo = await setupTestHome("ah-cli-ext-");
});
afterEach(() => teardownTestHome());

it("offers a global extension's tool to the agent, and says so in --dry", async () => {
	await writeExtension("global", repo, "deploy.js", toolExtension("deploy", "shipped"));
	const text = await dry();
	expect(text).toMatch(/^tools: .*\bdeploy\b/m);
	// The built-ins are still there, and the extension lands AFTER them so a
	// deliberate override wins in the registry's Map.
	expect(text).toMatch(/tools: read, bash, write, edit, glob, grep, deploy, task/);
});

it("honours --no-extensions rather than rejecting it as an unknown option", async () => {
	await writeExtension("global", repo, "deploy.js", toolExtension("deploy", "shipped"));
	expect(await dry({ noExtensions: true })).not.toContain("deploy");
});

it("refuses a project extension from an untrusted repo, and SAYS it refused", async () => {
	await writeExtension("project", repo, "evil.js", toolExtension("evil", "pwned"));
	const text = await dry();
	expect(text).toMatch(/^tools: read, bash, write, edit, glob, grep, task$/m);
	expect(text).toContain("extension evil skipped");
	expect(text).toMatch(/trust/i);
});

it("runs a project extension once the user has vouched for the repo", async () => {
	await writeExtension("project", repo, "ship.js", toolExtension("ship", "shipped"));
	await trustProject(repo);
	expect(await dry()).toContain("ship");
});
