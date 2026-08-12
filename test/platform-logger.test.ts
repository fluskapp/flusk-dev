/**
 * The logger's one hard rule: nothing unscrubbed reaches disk. And its one
 * operational promise: records land as JSON lines in the home's logs dir,
 * dated, levelled, and named for their feature.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createLogger } from "../src/platform/logger/logger.js";
import { fluskHome } from "../src/platform/paths/paths.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

beforeEach(async () => {
	await setupTestHome("flusk-logger-");
});
afterEach(() => teardownTestHome());

async function logged(): Promise<string> {
	// appendFile is fire-and-forget; give the write a tick to land.
	await new Promise((r) => setTimeout(r, 50));
	const dir = join(fluskHome(), "logs");
	const [file] = readdirSync(dir);
	return readFileSync(join(dir, file as string), "utf8");
}

it("writes dated JSON lines and scrubs secrets in message and data", async () => {
	const log = createLogger("provider");
	log.error("auth failed with key sk-ant-abcdefghijklmnop1234", {
		header: "token ghp_ABCDEFGHIJKLMNOP1234",
		turn: 3,
	});
	const body = await logged();
	expect(body).not.toContain("sk-ant-abcdefghijklmnop1234");
	expect(body).not.toContain("ghp_ABCDEFGHIJKLMNOP1234");
	const record = JSON.parse(body.trim());
	expect(record.level).toBe("error");
	expect(record.feature).toBe("provider");
	expect(record.data.turn).toBe(3);
	expect(record.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

it("FLUSK_LOG gates levels, and a child names its lineage", async () => {
	process.env.FLUSK_LOG = "warn";
	try {
		const log = createLogger("run").child("gate");
		log.info("below threshold — must not land");
		log.warn("this lands");
		const body = await logged();
		expect(body).not.toContain("below threshold");
		const record = JSON.parse(body.trim());
		expect(record.feature).toBe("run.gate");
	} finally {
		delete process.env.FLUSK_LOG;
	}
});
