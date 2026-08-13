/**
 * Differential harness for the git half of the scan stage: TS gitCards and
 * the Rust parse read the same scripted repo — fixed authors and dates — and
 * must produce deeply equal cards: same drops, same outcomes, same redaction,
 * same caps. Skips when the prebuilt is absent rather than lie.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gitCards } from "../src/features/history/source-git.repository.js";
import { createGitLog } from "../src/platform/native/git-log.js";
import { nativeModule } from "../src/platform/native/native.repository.js";

const native = nativeModule();
const describeNative = native === null ? describe.skip : describe;

const dirs: string[] = [];
afterAll(async () => {
	while (dirs.length > 0) await rm(dirs.pop() as string, { recursive: true, force: true });
});

/** A scratch repo per shell process, with pinned identity and dates. */
async function build(script: string): Promise<{ dir: string; out: string }> {
	const dir = await mkdtemp(join(tmpdir(), "flusk-native-git-"));
	dirs.push(dir);
	const setup =
		`set -e\ncd "${dir}"\n` +
		'export GIT_AUTHOR_DATE="2026-01-01T12:00:00Z" GIT_COMMITTER_DATE="2026-01-01T12:00:00Z"\n' +
		"git init -q -b main\ngit config user.email t@example.com\ngit config user.name T\n" +
		"git config commit.gpgsign false\n";
	const res = spawnSync("sh", ["-c", setup + script], { encoding: "utf8" });
	if (res.status !== 0) throw new Error(`fixture failed: ${res.stderr}`);
	return { dir, out: res.stdout.trim() };
}

const add = (msg: string, files: string, body = ""): string =>
	`${files}\ngit add -A\ngit commit -q --allow-empty -m '${msg}'${body ? ` -m '${body}'` : ""}\n`;

const LONG_BODY = "word ".repeat(340).trim(); // 1699 chars: forces the cap
const SECRETS = [
	"token ghp_ABCDEFGHIJKLMNOP1234",
	"sha 0123456789abcdef0123456789abcdef01234567 stays",
	"hash 0123456789ABCDEF0123456789ABCDEF goes",
	"db postgres://user:hunter2@db.example.com/x",
	"aws AKIAABCDEFGHIJKLMNOP",
	"integrity sha512-Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv",
	"blob Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv",
	"api_key: supersecretvalue123",
	"Bearer abcdef123456789",
].join(" | ");

/** feat → lockfile-only → noisy+secrets → reverts by sha AND by subject. */
function fixture(): Promise<{ dir: string; out: string }> {
	return build(
		add("feat: add widget", "echo w > widget.ts") +
			"W=$(git rev-parse HEAD)\n" +
			add("chore: bump deps", "echo l > package-lock.json") +
			add("feat: styles", "echo a > a.css\necho m > app.min.js", "leaked password=hunter2 here") +
			add("docs: long body", "echo d > doc.md", LONG_BODY) +
			add("chore: secrets", "echo s > s.ts", SECRETS) +
			add("feat: add undo button", "echo u > undo.ts") +
			"echo w2 > widget.ts\ngit add -A\n" +
			"git commit -q -m 'Revert \"feat: add widget\"' -m \"This reverts commit $W.\"\n" +
			"git commit -q --allow-empty -m 'revert: styles rollback' -m 'Reverts \"feat: styles\"'\n" +
			"git checkout -q -b side\n" +
			add("side work", "echo s2 > side.ts") +
			"git checkout -q main\ngit merge -q --no-ff --no-edit -m \"Merge branch 'side'\" side\n" +
			'echo "$W"\n',
	);
}

describeNative("native git cards ≡ TypeScript reference", () => {
	let repo = "";
	let widget = "";
	beforeAll(async () => {
		const { dir, out } = await fixture();
		repo = dir;
		widget = out;
	}, 60_000);

	it("is actually the native implementation under test", () => {
		expect(createGitLog().impl).toBe("native");
	});

	it("agrees over the scripted repo, drops, outcomes and caps included", async () => {
		const ts = gitCards(repo);
		const rs = await createGitLog().cards(repo);
		expect(rs).toEqual(ts);
		const titles = rs.map((c) => c.title);
		expect(titles).not.toContain("chore: bump deps"); // lockfile-only commit
		expect(titles).not.toContain("Merge branch 'side'"); // bodiless merge
		expect(titles).toContain("side work");
		// The revert pair: the revert itself, its sha target, its quoted target.
		expect(rs[0]?.outcome).toBe("failed");
		expect(rs.find((c) => c.ref === widget)?.outcome).toBe("failed");
		expect(rs.find((c) => c.title === "feat: styles")?.outcome).toBe("failed");
		expect(rs.find((c) => c.title === "feat: add undo button")?.outcome).toBe("shipped");
	});

	it("agrees on redaction, byte for byte", async () => {
		const rs = await createGitLog().cards(repo);
		const text = rs.find((c) => c.title === "chore: secrets")?.text ?? "";
		expect(text).toContain("[redacted: github token]");
		expect(text).toContain("[redacted: hash]");
		expect(text).toContain("0123456789abcdef0123456789abcdef01234567"); // sha stays
		expect(text).toContain("sha512-Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv"); // integrity stays
		expect(text).toContain("blob [redacted: secret]");
		expect(text).toContain("api_key=[redacted: api key]");
		expect(text).toContain("Bearer [redacted: bearer token]");
		expect(text).toContain("postgres://[redacted: url credentials]@db.example.com/x");
		expect(rs.find((c) => c.title === "docs: long body")?.text.length).toBeLessThanOrEqual(1500);
	});

	it("agrees on limit and since options", async () => {
		const log = createGitLog();
		expect(await log.cards(repo, { limit: 2 })).toEqual(gitCards(repo, { limit: 2 }));
		expect(await log.cards(repo, { limit: 0 })).toEqual([]);
		expect(gitCards(repo, { limit: 0 })).toEqual([]);
		const since = { since: "2020-01-01" };
		expect(await log.cards(repo, since)).toEqual(gitCards(repo, since));
	});

	it("agrees that a non-repo yields nothing", async () => {
		const empty = await mkdtemp(join(tmpdir(), "flusk-native-git-empty-"));
		dirs.push(empty);
		expect(await createGitLog().cards(empty)).toEqual([]);
		expect(gitCards(empty)).toEqual([]);
		expect(await createGitLog().cards("/definitely/not/here")).toEqual([]);
	});

	it("FLUSK_NATIVE=0 forces the TypeScript path", async () => {
		process.env.FLUSK_NATIVE = "0";
		try {
			const log = createGitLog();
			expect(log.impl).toBe("ts");
			expect(await log.cards(repo)).toEqual(gitCards(repo));
		} finally {
			delete process.env.FLUSK_NATIVE;
		}
	});
});
