/**
 * Flow endpoints: the flow library, recent flow runs, and a dry plan.
 *
 * All three are read-only and none of them calls a model — `/api/flow/dry`
 * composes the prompts a run WOULD use (flow-plan.ts) and hands them back, so
 * the dashboard can show what would be sent before anything is spent. Running a
 * flow stays a CLI act; a loopback page must not be able to spend money.
 *
 * The loopback/Origin guard in api-guard.ts covers every route here, and the
 * one POST is capped by readBody plus a task length of its own.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadConfig } from "../../platform/config/config.js";
import { loadFlows } from "./flow-files.repository.js";
import { BUILT_IN, flowResolver } from "./library.js";
import type { FlowSpec } from "./types.js";
import { readBody, TOO_LARGE } from "../chat/chat-body.js";
import { dryPlan } from "./flow-plan.js";
import { flowRun, flowRuns } from "./flow-runs.repository.js";
import { shapeOf } from "./flow-shape.js";
import { withSources } from "./flow-sources.js";

/** A task is a sentence. Anything longer is not a task. */
const TASK_MAX = 1000;

export interface FlowView {
	name: string;
	description: string;
	/** The one-line arrow chain: `plan -> code -> verify`. */
	shape: string;
	nodes: number;
}

export interface FlowLibrary {
	library: FlowView[];
	user: FlowView[];
	/** User flow files that were skipped, each naming the field that is wrong. */
	errors: string[];
}

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

const fail = (res: ServerResponse, e: unknown): void =>
	json(res, 500, { error: e instanceof Error ? e.message : String(e) });

/** Built-in flows first, then whatever the project or home directory added. */
export async function flowLibrary(
	repoRoot: string,
	builtIn: FlowSpec[] = BUILT_IN,
): Promise<FlowLibrary> {
	const { flows, errors } = await loadFlows(repoRoot);
	const resolve = flowResolver(flows);
	const view = (f: FlowSpec): FlowView => ({
		name: f.name,
		description: f.description ?? "",
		shape: shapeOf(f, resolve),
		nodes: f.nodes.length,
	});
	// Identity, not name: a project flow that overrides a built-in is the user's.
	const mine = (f: FlowSpec): boolean => builtIn.includes(f);
	return {
		library: flows.filter(mine).map(view),
		user: flows.filter((f) => !mine(f)).map(view),
		errors,
	};
}

function count(raw: string | null): number | undefined {
	const n = Number(raw ?? "");
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

async function runsRoute(query: URLSearchParams, res: ServerResponse): Promise<void> {
	const runId = query.get("run");
	if (runId !== null && runId !== "") {
		const row = await flowRun(runId);
		if (row === null) json(res, 404, { error: `no checkpoint for run "${runId}"` });
		else json(res, 200, await withSources(row, process.cwd()));
		return;
	}
	const project = query.get("project");
	const limit = count(query.get("limit"));
	json(
		res,
		200,
		await flowRuns(loadConfig(process.cwd()), {
			...(project !== null && project !== "" ? { project } : {}),
			...(limit === undefined ? {} : { limit }),
		}),
	);
}

async function dryRoute(req: IncomingMessage, res: ServerResponse): Promise<void> {
	let raw: unknown;
	try {
		raw = JSON.parse(await readBody(req));
	} catch (e) {
		const why = e instanceof Error ? e.message : String(e);
		json(res, why === TOO_LARGE ? 413 : 400, { error: why });
		return;
	}
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		json(res, 400, { error: "body must be a JSON object" });
		return;
	}
	const { task, flow } = raw as Record<string, unknown>;
	if (typeof task !== "string" || task.trim() === "" || task.length > TASK_MAX) {
		json(res, 400, { error: `task must be a non-empty string of at most ${TASK_MAX} characters` });
		return;
	}
	if (flow !== undefined && typeof flow !== "string") {
		json(res, 400, { error: "flow must name a flow" });
		return;
	}
	const repoRoot = process.cwd();
	json(res, 200, await dryPlan(task, { repoRoot, ...(flow === undefined ? {} : { flow }) }));
}

/** Returns true when it handled the route. */
export function handleFlows(
	method: string,
	pathname: string,
	query: URLSearchParams,
	req: IncomingMessage,
	res: ServerResponse,
): boolean {
	if (method === "GET" && pathname === "/api/flows") {
		void flowLibrary(process.cwd()).then(
			(body) => json(res, 200, body),
			(e: unknown) => fail(res, e),
		);
		return true;
	}
	if (method === "GET" && pathname === "/api/flow-runs") {
		void runsRoute(query, res).catch((e: unknown) => fail(res, e));
		return true;
	}
	if (method === "POST" && pathname === "/api/flow/dry") {
		void dryRoute(req, res).catch((e: unknown) => fail(res, e));
		return true;
	}
	return false;
}
