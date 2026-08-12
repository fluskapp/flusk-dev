/**
 * The OUTCOME half of a commit card: what "failed" is allowed to mean.
 *
 * It is the one field that changes what a prompt SAYS about a commit ("a
 * previous run did this and it had to be reverted"), so a false positive here
 * is a fabricated, citation-backed warning — worse than no warning at all.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";
import { gitCards } from "../src/features/history/source-git.repository.js";

const dirs: string[] = [];
afterAll(async () => {
	while (dirs.length > 0) await rm(dirs.pop() as string, { recursive: true, force: true });
});

/** A scratch repo per shell process: under vitest each spawnSync costs ~300ms. */
async function build(script: string): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "flusk-hist-out-"));
	dirs.push(dir);
	const setup = `set -e\ncd "${dir}"\ngit init -q -b main\ngit config user.email t@example.com\ngit config user.name T\ngit config commit.gpgsign false\n`;
	const res = spawnSync("sh", ["-c", setup + script], { encoding: "utf8" });
	if (res.status !== 0) throw new Error(`fixture failed: ${res.stderr}`);
	return dir;
}

const add = (msg: string, file: string): string =>
	`echo x > ${file}\ngit add -A\ngit commit -q -m '${msg}'\n`;

/**
 * Regression: a keyword ANYWHERE in the subject used to mean "failed", so an
 * ordinary fix that shipped was demoted 0.8x AND became eligible to be cited
 * in a composed prompt as work that "had to be reverted or hot-fixed". On the
 * real corpus 3 of the 8 failed-marked commits were this false positive.
 */
it("does not call an ordinary fix failed for saying fix broken / hotfix / rollback", async () => {
	const dir = await build(
		add("fix broken sessions in agents view from missing directories (#287)", "a.ts") +
			add("fix(prod): guard the spend rollback path", "b.ts") +
			add("hotfix the flaky watch test", "c.ts") +
			add("chore: undo the temporary logging", "d.ts") +
			add("feat: add undo button", "e.ts"),
	);
	const cards = gitCards(dir);
	expect(cards.map((c) => c.outcome)).toEqual([
		"shipped",
		"shipped",
		"shipped",
		"shipped",
		"shipped",
	]);
}, 60_000);

it("marks a revert failed, and the commit it names, by sha or by quoted subject", async () => {
	const bySha = await build(
		add("add cache layer", "c.ts") +
			"W=$(git rev-parse HEAD)\n" +
			"echo y > c.ts\ngit add -A\ngit commit -q -m 'revert: cache layer' -m \"This reverts commit $W.\"\n",
	);
	expect(gitCards(bySha).map((c) => c.outcome)).toEqual(["failed", "failed"]);

	const bySubject = await build(
		add("add cache layer", "c.ts") +
			"echo y > c.ts\ngit add -A\ngit commit -q -m 'Revert \"add cache layer\"'\n",
	);
	expect(gitCards(bySubject).map((c) => c.outcome)).toEqual(["failed", "failed"]);
}, 60_000);

/** A commit that is not itself a revert can still say what it undid. */
it("marks the target named in a body, even when the subject is an ordinary fix", async () => {
	const dir = await build(
		add("add cache layer", "c.ts") +
			"W=$(git rev-parse HEAD)\n" +
			"echo y > c.ts\ngit add -A\ngit commit -q -m 'fix: drop the cache layer' -m \"This reverts commit $W.\"\n",
	);
	const cards = gitCards(dir);
	expect(cards[0]?.outcome).toBe("shipped"); // the fix itself shipped
	expect(cards[1]?.outcome).toBe("failed"); // …what it undid did not
}, 60_000);
