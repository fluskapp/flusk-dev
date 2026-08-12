import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectVerifyCommands } from "../src/features/verify/detect.repository.js";

async function fixture(files: Record<string, string>): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "flusk-detect-"));
	for (const [name, content] of Object.entries(files)) {
		await writeFile(join(dir, name), content);
	}
	return dir;
}

const pkg = (scripts: Record<string, string>) => JSON.stringify({ name: "x", scripts });

describe("detectVerifyCommands", () => {
	it(".flusk/config.json verify[] wins outright over everything detectable", async () => {
		const dir = await fixture({ "package.json": pkg({ test: "vitest run" }) });
		expect(detectVerifyCommands(dir, { verify: ["./ci.sh --fast"] })).toEqual(["./ci.sh --fast"]);
		expect(detectVerifyCommands(dir, { verify: [] })).toEqual([]);
	});

	it("maps package.json scripts in [typecheck, lint, test, build] order", async () => {
		const dir = await fixture({
			"package.json": pkg({ build: "tsc -b", test: "vitest run", lint: "biome check" }),
		});
		expect(detectVerifyCommands(dir)).toEqual(["npm run lint", "npm test", "npm run build"]);
	});

	it("package.json without recognized scripts falls through to Cargo.toml", async () => {
		const dir = await fixture({
			"package.json": pkg({ start: "node ." }),
			"Cargo.toml": '[package]\nname = "x"\n',
		});
		expect(detectVerifyCommands(dir)).toEqual(["cargo check", "cargo test"]);
	});

	it("package.json without recognized scripts and nothing else yields []", async () => {
		const dir = await fixture({ "package.json": pkg({ start: "node ." }) });
		expect(detectVerifyCommands(dir)).toEqual([]);
	});

	it("Cargo.toml alone yields cargo check + cargo test", async () => {
		const dir = await fixture({ "Cargo.toml": '[package]\nname = "x"\n' });
		expect(detectVerifyCommands(dir)).toEqual(["cargo check", "cargo test"]);
	});

	it("Makefile with a test target yields make test; without one, []", async () => {
		const withTest = await fixture({ "Makefile": "build:\n\tcc main.c\ntest:\n\t./run-tests\n" });
		expect(detectVerifyCommands(withTest)).toEqual(["make test"]);
		const noTest = await fixture({ "Makefile": "build:\n\tcc main.c\ntest := unrelated\n" });
		expect(detectVerifyCommands(noTest)).toEqual([]);
	});

	it("a bare directory yields []", async () => {
		expect(detectVerifyCommands(await fixture({}))).toEqual([]);
	});
});
