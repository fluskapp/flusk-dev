/**
 * Differential harness for the scan stage: the TypeScript scanner and the
 * Rust port walk the SAME temp sessions tree and must produce deeply equal
 * summaries — same order, same statuses, same mtime floats — including the
 * torn-tail, foreign-file and empty-root cases. Skips when the prebuilt is
 * absent (fresh checkout, foreign platform) rather than lie.
 */
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scanSessions } from "../src/features/projects/scan.repository.js";
import { nativeModule } from "../src/platform/native/native.repository.js";
import { createSessionScanner } from "../src/platform/native/session-scan.js";
import { session, tree } from "./project-fixture.js";

const native = nativeModule();
const describeNative = native === null ? describe.skip : describe;

const header = (id: string, createdAt: string, extra = ""): string =>
	`{"type":"header","version":1,"id":"${id}","task":"task ${id}","repoRoot":"/tmp/r","gitBranch":null,` +
	`"model":{"provider":"fake","id":"fake-1","contextWindow":200000},"createdAt":"${createdAt}"${extra}}`;
const ASSISTANT =
	'{"type":"message","id":2,"msg":{"role":"assistant","content":[],"stopReason":"end",' +
	'"usage":{"input":1,"output":1,"cacheRead":0,"costUsd":0.1}}}';
const stats = (reason: string): string =>
	'{"type":"stats","id":3,"stats":{"turns":2,"usage":{"input":1,"output":1,"cacheRead":0,"costUsd":0.5},' +
	`"startedAt":"2026-08-01T00:00:00.000Z"}${reason}}`;

let t: ReturnType<typeof tree>;

/** A hand-written transcript, so edge shapes stay under the test's control. */
function raw(name: string, body: string, atSec: number): void {
	const dir = join(t.home, "sessions", "raw-12345678");
	mkdirSync(dir, { recursive: true });
	const path = join(dir, name);
	writeFileSync(path, body);
	utimesSync(path, atSec, atSec);
}

beforeAll(() => {
	t = tree();
	const repo = join(t.work, "alpha");
	session({ repoRoot: repo, task: "ship it", costUsd: 0.25, atSec: 1_786_000_100 });
	session({ repoRoot: repo, task: "broke", reason: "error", atSec: 1_786_000_200 });
	session({ repoRoot: repo, task: "killed", reason: "aborted", atSec: 1_786_000_300 });
	session({ repoRoot: repo, task: "ran out", reason: "budget", atSec: 1_786_000_400 });
	session({ repoRoot: repo, task: "still going", open: true, atSec: 1_786_000_500 });
	raw("torn.jsonl", `${header("t1", "2026-08-02T00:00:00.000Z")}\n${ASSISTANT}\n{"type":"sta`, 1_786_001_100);
	raw("derived.jsonl", `${header("d1", "2026-08-03T00:00:00.000Z")}\n${ASSISTANT}\n${stats("")}\n`, 1_786_001_200);
	raw("silent.jsonl", `${header("s1", "2026-08-04T00:00:00.000Z")}\n${stats("")}\n`, 1_786_001_300);
	raw("nullreason.jsonl", `${header("n1", "2026-08-05T00:00:00.000Z")}\n${stats(',"reason":null')}\n`, 1_786_001_400);
	raw(
		"kinded.jsonl",
		`${header("k1", "2026-08-06T00:00:00.000Z", ',"taskKind":"review","parentSession":"p/x.jsonl"')}\n${stats(',"reason":"completed"')}\n`,
		1_786_001_500,
	);
	raw("broken.jsonl", `${header("b1", "2026-08-07T00:00:00.000Z")}\nnot json\n${ASSISTANT}\n`, 1_786_001_600);
	raw("headless.jsonl", `${ASSISTANT}\n`, 1_786_001_700);
	raw("notes.txt", "not a session\n", 1_786_001_800);
	// A directory that ends in .jsonl: stat succeeds, the read fails, skipped.
	mkdirSync(join(t.home, "sessions", "raw-12345678", "decoy.jsonl"), { recursive: true });
});

afterAll(() => t.cleanup());

describeNative("native session scan ≡ TypeScript reference", () => {
	it("is actually the native implementation under test", () => {
		expect(createSessionScanner().impl).toBe("native");
	});

	it("agrees with the TypeScript scanner, order and floats included", async () => {
		const rs = await createSessionScanner().scan();
		const ts = scanSessions();
		expect(rs).toEqual(ts);
		expect(rs).toHaveLength(10); // 5 real + 5 raw survivors
	});

	it("agrees on every derived status and the torn tail", async () => {
		const rs = await createSessionScanner().scan();
		const by = (s: string) => rs.find((x) => x.key.endsWith(s));
		expect(by("torn.jsonl")?.status).toBe("running"); // torn stats never counted
		expect(by("derived.jsonl")?.status).toBe("completed"); // from stopReason
		expect(by("silent.jsonl")?.status).toBe("stopped"); // stats, no assistant
		expect(by("nullreason.jsonl")?.status).toBe("stopped");
		expect(by("kinded.jsonl")?.taskKind).toBe("review");
		expect(by("kinded.jsonl")?.parentSession).toBe("p/x.jsonl");
		expect(by("broken.jsonl")).toBeUndefined(); // interior damage skips the file
		expect(by("headless.jsonl")).toBeUndefined();
		expect(by("decoy.jsonl")).toBeUndefined();
	});

	it("agrees on an empty or missing root", async () => {
		const empty = mkdtempSync(join(tmpdir(), "flusk-scan-empty-"));
		const prev = process.env.FLUSK_HOME;
		process.env.FLUSK_HOME = empty; // sessions/ does not even exist
		try {
			const scanner = createSessionScanner();
			expect(scanner.impl).toBe("native");
			expect(await scanner.scan()).toEqual([]);
			expect(scanSessions()).toEqual([]);
		} finally {
			process.env.FLUSK_HOME = prev;
			rmSync(empty, { recursive: true, force: true });
		}
	});

	it("FLUSK_NATIVE=0 forces the TypeScript path", async () => {
		process.env.FLUSK_NATIVE = "0";
		try {
			const scanner = createSessionScanner();
			expect(scanner.impl).toBe("ts");
			expect(await scanner.scan()).toEqual(scanSessions());
		} finally {
			delete process.env.FLUSK_NATIVE;
		}
	});
});
