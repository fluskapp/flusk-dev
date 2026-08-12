/**
 * The one-shot `.ah` -> `.flusk` migration. The scenario that matters most is
 * the plan's adoption path: FLUSK_HOME pointed at a copy of a real pre-rename
 * home, where the fact log still carries the namespace hash of "ah" in its
 * filename and must be renamed by the same function that names logs normally.
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { describeMigration, didMigrate, migrateHome } from "../src/platform/paths/migrate.js";
import { FLUSK_NS } from "../src/store/namespaces.js";
import { nsPath } from "../src/store/paths.js";

const FACT = `${JSON.stringify({ subject: "s", predicate: "p" })}\n`;

describe("migrateHome", () => {
	let home: string;

	beforeEach(() => {
		home = mkdtempSync(join(tmpdir(), "flusk-migrate-"));
		process.env.FLUSK_HOME = home;
	});
	afterEach(() => {
		delete process.env.FLUSK_HOME;
	});

	function legacyLog(): string {
		const dir = join(home, "store");
		mkdirSync(dir, { recursive: true });
		const path = nsPath(dir, "ah");
		writeFileSync(path, FACT);
		return path;
	}

	it("renames the namespace-hashed fact log and reports it", () => {
		const from = legacyLog();
		const m = migrateHome();
		expect(didMigrate(m)).toBe(true);
		expect(existsSync(from)).toBe(false);
		const to = nsPath(join(home, "store"), FLUSK_NS);
		expect(readFileSync(to, "utf8")).toBe(FACT);
		expect(describeMigration(m).join("\n")).toContain("fact log");
	});

	it("is idempotent: the second run is a reported no-op", () => {
		legacyLog();
		expect(didMigrate(migrateHome())).toBe(true);
		const again = migrateHome();
		expect(didMigrate(again)).toBe(false);
		expect(describeMigration(again)).toEqual([]);
	});

	it("never overwrites an existing flusk log with the legacy one", () => {
		const dir = join(home, "store");
		mkdirSync(dir, { recursive: true });
		const current = nsPath(dir, FLUSK_NS);
		writeFileSync(current, "current\n");
		const legacy = legacyLog();
		const m = migrateHome();
		expect(didMigrate(m)).toBe(false);
		expect(readFileSync(current, "utf8")).toBe("current\n");
		expect(existsSync(legacy)).toBe(true);
	});

	it("does not move the home root out from under an explicit FLUSK_HOME", () => {
		// An explicit root is the caller naming where state lives; only the
		// fact log inside it is eligible, never the directory itself.
		expect(migrateHome().movedHome).toBeUndefined();
	});
});
