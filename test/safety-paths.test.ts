import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { resolveWithin } from "../src/features/safety/paths.repository.js";

let repo: string;
let outside: string;

beforeAll(() => {
	const tmp = mkdtempSync(join(tmpdir(), "flusk-paths-"));
	repo = join(tmp, "repo");
	outside = join(tmp, "outside");
	mkdirSync(repo, { recursive: true });
	mkdirSync(outside, { recursive: true });
	writeFileSync(join(outside, "data.txt"), "secret");
	symlinkSync(outside, join(repo, "sneaky-link"));
});

describe("resolveWithin", () => {
	it("resolves a nested not-yet-existing path inside the root", () => {
		const p = resolveWithin([repo], "a/b/c.txt", repo);
		expect(p.endsWith(join("a", "b", "c.txt"))).toBe(true);
	});

	it("rejects ../ escapes", () => {
		expect(() => resolveWithin([repo], "../outside/x.txt", repo)).toThrow(
			/outside allowed roots/,
		);
	});

	it("rejects absolute paths outside all roots", () => {
		expect(() => resolveWithin([repo], "/etc/hosts", repo)).toThrow(/outside allowed roots/);
	});

	it("rejects a symlink inside the repo that points outside (new file)", () => {
		expect(() => resolveWithin([repo], "sneaky-link/pwned.txt", repo)).toThrow(
			/outside allowed roots/,
		);
	});

	it("rejects a symlink inside the repo that points outside (existing file)", () => {
		expect(() => resolveWithin([repo], "sneaky-link/data.txt", repo)).toThrow(
			/outside allowed roots/,
		);
	});

	it("error names both the resolved path and the roots", () => {
		try {
			resolveWithin([repo], "../outside/x.txt", repo);
			expect.unreachable("should have thrown");
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toContain("x.txt");
			expect(msg).toContain("repo");
		}
	});

	it("allows extra roots, including reached via symlink", () => {
		const p = resolveWithin([repo, outside], "sneaky-link/ok.txt", repo);
		expect(p.endsWith(join("outside", "ok.txt"))).toBe(true);
	});
});
