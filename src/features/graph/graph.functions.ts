/**
 * The Graph tool window's typed server functions — the same one read and one
 * remedy /api/graph serves (graph.router.ts), for the React route. Bodies
 * delegate to the modules the router calls, in the router's order: containment
 * first (exact membership, never a prefix test), then derivation, then the
 * store — so the two surfaces cannot drift while both exist.
 *
 * A refusal travels as data rather than a thrown error, because the panel's
 * whole empty-state vocabulary hangs off WHICH failure this was: a refusal, a
 * server-side crash and an unreachable server have three different remedies
 * (client-graph.ts, graphFail), and a bare throw collapses them into one.
 */
import { basename } from "node:path";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { loadConfig } from "../../platform/config/config.js";
import { indexedFile } from "../docs/doc-util.js";
import { buildOnce, buildRoot, isBuilding } from "./graph-build.js";
import { graphReport } from "./graph-report.js";
import { rootFor, storeFor, targetFor } from "./graph-target.repository.js";
import type { GraphReply } from "./graph.types.js";

export type { GraphReply, GraphState } from "./graph.types.js";
export type { GraphEdge, GraphNode } from "./types.js";
export type {
	BlastRadiusReport,
	CoChangePeer,
	CoChangeReport,
	ImpactedNode,
	Neighbourhood,
	NeighbourNode,
	ProvenanceReport,
	ProvenanceRow,
	Truncation,
} from "./query-types.js";

/** Long enough for any identifier, short enough not to be a payload. */
const MAX_SYMBOL = 256;

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));

/** `status` keeps the router's split: 400 is a refusal about the file, 500 a
 * failure inside the dashboard. The client adds the third case (unreachable)
 * when the call itself throws. */
export type GraphAnswer =
	| { ok: true; reply: GraphReply }
	| { ok: false; status: number; reason: string };

const refuse = (reason: string): GraphAnswer => ({ ok: false, status: 400, reason });

/** The four answers about a node — GET /api/graph, as a server function. */
export const getGraphReport = createServerFn()
	.inputValidator((data: { file: string; symbol?: string | null }) => data)
	.handler(async ({ data }): Promise<GraphAnswer> => {
		try {
			const config = cfg();
			const file = await indexedFile(config, data.file);
			if (file === null) return refuse("not an indexed file");
			const root = rootFor(config, file);
			if (root === null) return refuse("no configured project holds that file");
			const symbol = (data.symbol ?? "").slice(0, MAX_SYMBOL).trim();
			const target = targetFor(root, file, symbol === "" ? null : symbol);
			// Unreachable through the membership test above, and cheap to be sure
			// of: an id that cannot be derived would otherwise be answered about as
			// "not indexed", which is a different and untrue sentence.
			if (target === null) return refuse("no node id derivable from that file");
			return { ok: true, reply: await graphReport(target, storeFor(root.path)) };
		} catch (e) {
			return { ok: false, status: 500, reason: e instanceof Error ? e.message : String(e) };
		}
	});

/** One flat shape: a refusal or a crash fills `error`, an incomplete pass
 * fills `reason` and never `error` (src/features/graph/build.ts) — the client
 * must read both, or the button can be pressed forever while the one sentence
 * saying why is thrown away. */
export interface GraphBuildReply {
	joined: boolean;
	filesIndexed: number;
	filesRemaining: number;
	error?: string;
	reason?: string;
}

/** Index (or continue indexing) — POST /api/graph/build, as a server function.
 * One pass is bounded and resumable, so calling again continues. */
export const buildGraphIndex = createServerFn({ method: "POST" })
	.inputValidator((data: { root: string }) => data)
	.handler(async ({ data }): Promise<GraphBuildReply> => {
		const none = { joined: false, filesIndexed: 0, filesRemaining: 0 };
		try {
			const root = buildRoot(cfg(), data.root);
			if (root === null) return { ...none, error: "not a configured project root" };
			// Read before awaiting, so the reply can say whether this call did the
			// work or merely joined a pass that was already running.
			const joined = isBuilding(root);
			const report = await buildOnce(root, basename(root) || root);
			return {
				joined,
				filesIndexed: report.filesIndexed,
				filesRemaining: report.filesRemaining,
				...(report.reason === undefined ? {} : { reason: report.reason }),
			};
		} catch (e) {
			return { ...none, error: e instanceof Error ? e.message : String(e) };
		}
	});
