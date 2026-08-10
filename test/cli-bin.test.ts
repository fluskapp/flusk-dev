import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { beforeAll, expect, test } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const bin = join(root, "dist", "cli", "main.js");
const fixture = join(root, "test", "fixtures", "demo-script.json");

let tmp: string;
let repo: string;

interface BinResult {
	code: number | null;
	stdout: string;
	stderr: string;
}

/** Executes the built dist binary in a child process with an isolated AH_HOME. */
function runBin(args: string[]): Promise<BinResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [bin, ...args], {
			env: { ...process.env, AH_HOME: join(tmp, "home") },
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d: Buffer) => {
			stdout += d.toString("utf8");
		});
		child.stderr.on("data", (d: Buffer) => {
			stderr += d.toString("utf8");
		});
		child.on("error", reject);
		child.on("close", (code) => resolve({ code, stdout, stderr }));
	});
}

beforeAll(async () => {
	tmp = await mkdtemp(join(tmpdir(), "ah-cli-bin-"));
	repo = join(tmp, "repo");
	await mkdir(repo, { recursive: true });
	await promisify(execFile)("npm", ["run", "build"], { cwd: root });
}, 120_000);

test("dist binary runs the fixture script and exits 0 with a stats line", async () => {
	const res = await runBin(["run", "bin task", "--repo", repo, "--fake", fixture, "--quiet"]);
	expect(res.stderr).toBe("");
	expect(res.code).toBe(0);
	expect(res.stdout).toMatch(/^completed · \d+ turns · \$\d/);
});

test("dist binary exits 1 when the script ends with stopReason error", async () => {
	const errScript = join(tmp, "error-script.json");
	await writeFile(
		errScript,
		JSON.stringify([
			{
				message: {
					role: "assistant",
					content: [],
					stopReason: "error",
					errorMessage: "scripted failure",
				},
			},
		]),
	);
	const res = await runBin(["run", "will fail", "--repo", repo, "--fake", errScript, "--quiet"]);
	expect(res.code).toBe(1);
	expect(res.stdout).toContain("error ·");
});

test("dist binary rejects --max-turns 0 with exit 1 and a message on stderr", async () => {
	const res = await runBin(["run", "t", "--repo", repo, "--max-turns", "0"]);
	expect(res.code).toBe(1);
	expect(res.stderr).toContain("--max-turns must be a positive integer");
});

test("dist binary prints usage on an unknown flag and exits 1", async () => {
	const res = await runBin(["run", "t", "--repo", repo, "--bogus-flag"]);
	expect(res.code).toBe(1);
	expect(res.stderr).toContain("Usage:");
});

test("dist binary prints usage and exits 1 when no command is given", async () => {
	const res = await runBin([]);
	expect(res.code).toBe(1);
	expect(res.stderr).toContain("Usage:");
});
