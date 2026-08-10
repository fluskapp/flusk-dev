/**
 * Memory bootstrap: turn config into a live MemoryPort, degrading gracefully.
 * Never throws — an unreachable abagraph means ONE warning line and a run
 * without memory (noopMemory + null client), never a failed run.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { AhConfig, RepoConfig } from "../config/types.js";
import { ahHome } from "../session/paths.js";
import { AbagraphMemoryPort } from "./abagraph-port.js";
import type { MemoryClient } from "./client-types.js";
import { createMemoryClient } from "./client.js";
import { resolveNamespace } from "./namespaces.js";
import { type MemoryPort, noopMemory } from "./port.js";

export interface MemorySetup {
	port: MemoryPort;
	/** null when memory is disabled or unreachable (gate/goals then skip it). */
	client: MemoryClient | null;
	/** Resolved repo namespace — the only tenant the CLI layer ever passes on. */
	ns: string;
}

const SPAWN_POLL_MS = 200;
const SPAWN_WAIT_MS = 5_000;

/** Detached abagraph server: --bind host:port from baseUrl, --data dir. */
function spawnServer(mem: AhConfig["memory"]): void {
	const url = new URL(mem.baseUrl);
	const bind = `${url.hostname}:${url.port === "" ? "80" : url.port}`;
	const data = mem.dataDir ?? join(ahHome(), "memory");
	const child = spawn(mem.serverBin as string, ["--bind", bind, "--data", data], {
		detached: true,
		stdio: "ignore",
	});
	child.unref();
}

async function pollHealth(client: MemoryClient): Promise<boolean> {
	const deadline = Date.now() + SPAWN_WAIT_MS;
	while (Date.now() < deadline) {
		if (await client.health()) return true;
		await delay(SPAWN_POLL_MS);
	}
	return false;
}

const defaultWarn = (line: string): void => {
	process.stderr.write(line);
};

/**
 * memory.enabled false → noopMemory outright. Otherwise health-check the
 * configured server, optionally auto-spawning it (detached, polled up to 5s),
 * and hand back an AbagraphMemoryPort bound to the resolved repo namespace.
 * `warn` (default: stderr) receives the single degradation line.
 */
export async function createMemory(
	cfg: AhConfig,
	repoRoot: string,
	repoConfig?: RepoConfig,
	warn: (line: string) => void = defaultWarn,
): Promise<MemorySetup> {
	const ns = resolveNamespace(repoRoot, repoConfig);
	if (!cfg.memory.enabled) return { port: noopMemory, client: null, ns };
	try {
		const client = createMemoryClient({ baseUrl: cfg.memory.baseUrl, apiKey: cfg.memory.apiKey });
		let up = await client.health();
		if (!up && cfg.memory.autoSpawn && cfg.memory.serverBin !== null) {
			spawnServer(cfg.memory);
			up = await pollHealth(client);
		}
		if (up) {
			const port = new AbagraphMemoryPort({ client, repoNs: ns, budgets: cfg.memory.budgets });
			return { port, client, ns };
		}
	} catch {
		// fall through to the degradation warning below — createMemory never throws
	}
	warn(`memory: abagraph unreachable at ${cfg.memory.baseUrl} — running without memory\n`);
	return { port: noopMemory, client: null, ns };
}
