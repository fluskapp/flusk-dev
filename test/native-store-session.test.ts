/**
 * The session seam: TS-default like the fact store, and — because the entry
 * is stringified on the JS side whichever implementation answers — the file
 * bytes must be identical by construction. What Rust owns is durability:
 * append+fsync, and the torn-tail-tolerant read with the reference's exact
 * failure wording for interior damage.
 */
import { appendFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SessionEntry } from "../src/features/session/entries.js";
import { SessionStore } from "../src/features/session/session.repository.js";
import { nativeModule } from "../src/platform/native/native.repository.js";
import { openSessionFile, readSessionFile } from "../src/platform/native/session-file.js";

const describeNative = nativeModule() === null ? describe.skip : describe;

const entries = [
	{ type: "header", version: 1, id: "ab12cd34", task: "port the store" },
	{ type: "message", id: 1, msg: { role: "user", content: "quoted \"text\" and λ\n" } },
	{ type: "stats", id: 2, stats: { tokens: 12_345 } },
] as unknown as SessionEntry[];

let dir: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "flusk-session-"));
});

afterEach(async () => {
	delete process.env.FLUSK_NATIVE;
	await rm(dir, { recursive: true, force: true });
});

describe("the session seam ships TypeScript-default", () => {
	it("serves the TS reference unless FLUSK_NATIVE=1", () => {
		const handle = openSessionFile(join(dir, "a.jsonl"));
		expect(handle.impl).toBe("ts");
		handle.close();
	});
});

describeNative("native session file ≡ TypeScript reference", () => {
	it("is the native implementation under FLUSK_NATIVE=1", () => {
		process.env.FLUSK_NATIVE = "1";
		const handle = openSessionFile(join(dir, "a.jsonl"));
		expect(handle.impl).toBe("native");
		handle.close();
	});

	it("writes byte-identical files for the same appends", async () => {
		process.env.FLUSK_NATIVE = "1";
		const native = openSessionFile(join(dir, "native.jsonl"));
		delete process.env.FLUSK_NATIVE;
		const ts = SessionStore.open(join(dir, "ts.jsonl"));
		for (const entry of entries) {
			native.appendEntry(entry);
			ts.appendEntry(entry);
		}
		native.close();
		ts.close();
		const [a, b] = await Promise.all([
			readFile(join(dir, "native.jsonl")),
			readFile(join(dir, "ts.jsonl")),
		]);
		expect(a.equals(b)).toBe(true);
	});

	it("both readers drop the same torn tail and keep the same entries", async () => {
		const path = join(dir, "s.jsonl");
		process.env.FLUSK_NATIVE = "1";
		const handle = openSessionFile(path);
		for (const entry of entries) handle.appendEntry(entry);
		handle.close();
		await appendFile(path, '{"type":"message","id":3,"msg":{"role":"assis');
		const nativeRead = readSessionFile(path);
		delete process.env.FLUSK_NATIVE;
		const tsRead = SessionStore.read(path);
		expect(nativeRead).toEqual(entries);
		expect(nativeRead).toEqual(tsRead);
	});

	it("interior damage is loud, with the reference's exact wording", async () => {
		const path = join(dir, "bad.jsonl");
		await appendFile(path, '{"type":"header"}\nnot json at all\n{"type":"stats","id":2}\n');
		const wanted = `Malformed session entry at line 2 in ${path}`;
		const tsErr = (() => {
			try {
				SessionStore.read(path);
				return null;
			} catch (e) {
				return e as Error;
			}
		})();
		process.env.FLUSK_NATIVE = "1";
		expect(() => readSessionFile(path)).toThrow(wanted);
		expect(tsErr?.message).toBe(wanted);
	});
});
