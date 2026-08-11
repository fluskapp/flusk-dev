/**
 * Project endpoints: the project list that is the dashboard's front page, one
 * project in full, the unified run feed, and the abagraph ingest trigger.
 *
 * Config is re-read per request on purpose — the same choice api-content.ts
 * makes — so editing ~/.ah/config.json shows up without restarting `ah ui`.
 */
import type { ServerResponse } from "node:http";
import { loadConfig } from "../config/config.js";
import type { AhConfig } from "../config/types.js";
import { createMemoryClient } from "../memory/client.js";
import type { MemoryClient } from "../memory/client-types.js";
import { ingestJournals } from "../memory/ingest.js";
import { HARNESS_NS } from "../memory/namespaces.js";
import { createGraphSource } from "./graph-source.js";
import { scanJournals } from "./journal-scan.js";
import { projectDetail } from "./project-detail.js";
import { scanProjects } from "./project-scan.js";
import { runFeed } from "./run-feed.js";

/**
 * Journals offered to the graph in ONE ingest, and how long that ingest may
 * take. Every fact goes over the same event loop that serves /api/projects
 * and any in-flight chat SSE, so an unbounded sweep of a real machine's 294
 * journals is a self-inflicted stall — better to ingest the newest slice on
 * each trigger than to freeze the dashboard covering all of them at once.
 */
const INGEST_LIMIT = 120;
const INGEST_DEADLINE_MS = 15_000;
const INGEST_LANES = 4;

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

const config = (): AhConfig => loadConfig(process.cwd());

/** A positive integer query param, or undefined when absent/garbage. */
function count(raw: string | null): number | undefined {
	if (raw === null || raw.trim() === "") return undefined;
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

/** Returns true when it handled the route. */
export function handleProjects(
	method: string,
	pathname: string,
	query: URLSearchParams,
	res: ServerResponse,
): boolean {
	if (method === "GET" && pathname === "/api/projects") {
		json(res, 200, scanProjects(config()));
		return true;
	}
	if (method === "GET" && pathname === "/api/project") {
		void detail(query.get("name") ?? "", res);
		return true;
	}
	if (method === "GET" && pathname === "/api/runs") {
		const project = query.get("project");
		const limit = count(query.get("limit"));
		json(
			res,
			200,
			runFeed(config(), {
				...(project !== null && project !== "" ? { project } : {}),
				...(limit !== undefined ? { limit } : {}),
			}),
		);
		return true;
	}
	if (method === "POST" && pathname === "/api/ingest") {
		void ingest(res);
		return true;
	}
	return false;
}

/**
 * A live client, or null. Memory is optional in ah, so "abagraph is down" is a
 * normal answer here (`connected: false`), never a 500.
 */
async function liveClient(cfg: AhConfig): Promise<MemoryClient | null> {
	if (!cfg.memory.enabled) return null;
	try {
		const client = createMemoryClient({ baseUrl: cfg.memory.baseUrl, apiKey: cfg.memory.apiKey });
		return (await client.health()) ? client : null;
	} catch {
		return null;
	}
}

/**
 * One project in full. For a harness the models come from the graph when it
 * has them — this is the read path /api/ingest writes for; without it the
 * ingest would be write-only and the dashboard would still be answering every
 * question off the filesystem. The scanned list is the fallback, so an absent
 * or empty graph changes nothing.
 */
async function detail(name: string, res: ServerResponse): Promise<void> {
	const cfg = config();
	const scanned = projectDetail(cfg, name);
	if (scanned === null) {
		json(res, 404, { error: `unknown project: ${name}` });
		return;
	}
	if (scanned.kind !== "harness") {
		json(res, 200, scanned);
		return;
	}
	const source = createGraphSource(await liveClient(cfg), { runs: [], models: scanned.models });
	json(res, 200, { ...scanned, models: await source.harnessModels(HARNESS_NS, name) });
}

/**
 * Journals → abagraph, in the `harness` namespace that graph-source.ts reads
 * harness facts back from. ingestJournals never throws and dedups
 * server-side, so re-triggering is cheap and safe.
 */
async function ingest(res: ServerResponse): Promise<void> {
	const abort = new AbortController();
	const deadline = setTimeout(() => abort.abort(), INGEST_DEADLINE_MS);
	// A client that hung up is not owed the rest of the sweep.
	res.on("close", () => abort.abort());
	try {
		const cfg = config();
		const journals = scanJournals(cfg.ui.harnessDirs).slice(0, INGEST_LIMIT);
		const client = await liveClient(cfg);
		const result = await ingestJournals(client, HARNESS_NS, journals, {
			concurrency: INGEST_LANES,
			signal: abort.signal,
		});
		json(res, 200, { ...result, connected: client !== null, journals: journals.length });
	} catch (e) {
		json(res, 500, { error: e instanceof Error ? e.message : String(e) });
	} finally {
		clearTimeout(deadline);
	}
}
