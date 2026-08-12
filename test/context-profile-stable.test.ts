/**
 * The two properties of the profile source that only fail silently: it is
 * byte-stable, and it is scrubbed.
 *
 * Determinism is not a nicety here — a prompt cache is worthless if the prefix
 * moves, so a reordered package.json or a differently ordered docs directory
 * must produce the identical block (L5).
 *
 * Redaction is checked on REAL repo content, not only on a synthetic key,
 * because the recorded trap in this repo is the opposite failure: a scrubber
 * that ate file paths as high-entropy strings and gutted what it was meant to
 * protect. A block whose document pointers have been replaced by markers is a
 * block nobody can act on (L4).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { profileSource } from "../src/context/source-profile.js";
import type { ContextRequest } from "../src/context/types.js";

const dirs: string[] = [];

afterEach(() => {
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function repo(files: Record<string, string>): string {
	const dir = mkdtempSync(join(tmpdir(), "flusk-ctx-profile-"));
	dirs.push(dir);
	for (const [rel, body] of Object.entries(files)) {
		const path = join(dir, rel);
		mkdirSync(join(path, ".."), { recursive: true });
		writeFileSync(path, body);
	}
	return dir;
}

const req = (root: string, isResume = false): ContextRequest => ({
	task: "add a test",
	repoRoot: root,
	budgetTokens: 4000,
	isResume,
});

const render = (root: string, isResume = false): string =>
	profileSource
		.gather(req(root, isResume))
		.items.map((i) => `${i.id}\n${i.title}\n${i.why}\n${i.body}`)
		.join("\n---\n");

it("is byte-identical when the manifest says the same thing in a different order", () => {
	const a = repo({
		"package.json": JSON.stringify({
			devDependencies: { vitest: "^3", typescript: "^5", "@biomejs/biome": "^2" },
		}),
		"README.md": "# Product\n",
		"AGENTS.md": "# Rules\n",
	});
	const b = repo({
		"package.json": JSON.stringify({
			devDependencies: { "@biomejs/biome": "^2", typescript: "^5" },
			dependencies: { vitest: "^3" },
		}),
		"AGENTS.md": "# Rules\n",
		"README.md": "# Product\n",
	});
	expect(render(a)).toBe(render(b));
});

it("is byte-identical to itself on a resume of an unchanged repo", () => {
	const root = repo({
		"package.json": JSON.stringify({ dependencies: { pg: "^8" } }),
		"docs/design.md": "# Design\n",
	});
	expect(render(root, true)).toBe(render(root, true));
	expect(render(root, true)).toBe(render(root, false));
});

it("scores the same repo the same way twice", () => {
	const root = repo({ "package.json": JSON.stringify({ devDependencies: { vitest: "^3" } }) });
	const first = profileSource.gather(req(root)).items.map((i) => [i.id, i.score]);
	const second = profileSource.gather(req(root)).items.map((i) => [i.id, i.score]);
	expect(first).toEqual(second);
	for (const [, score] of first) expect(score as number).toBeLessThanOrEqual(0.44);
});

it("redacts a secret that reached a manifest without eating the paths around it", () => {
	const root = repo({
		"package.json": JSON.stringify({ dependencies: { pg: "^8" } }),
		"docker-compose.yml":
			"services:\n  db:\n    image: postgres:16\n    environment:\n      POSTGRES_PASSWORD: hunter2SuperSecret\n",
		"docs/api-gateway-and-webhooks.md": "# API gateway\n",
	});
	const res = profileSource.gather(req(root));
	const body = res.items.map((i) => i.body).join("\n");
	expect(body).not.toContain("hunter2SuperSecret");
	// The paths are the part a reader acts on; they must survive intact.
	expect(body).toContain("docs/api-gateway-and-webhooks.md");
	expect(body).toContain("docker-compose.yml");
	expect(body).toContain("package.json");
});

it("keeps orientation short enough that it cannot crowd out a house rule", () => {
	const deps: Record<string, string> = {};
	for (const name of ["typescript", "react", "vitest", "eslint", "prettier", "pg", "redis"]) {
		deps[name] = "^1";
	}
	const root = repo({ "package.json": JSON.stringify({ dependencies: deps }) });
	const total = profileSource.gather(req(root)).items.reduce((n, i) => n + i.tokens, 0);
	expect(total).toBeLessThan(400);
});
