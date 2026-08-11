/**
 * The four questions the graph is worth building for, in one import. Callers
 * (the workbench, the agent's context builder) depend on this file and not on
 * the individual query modules, so splitting or renaming one of them stays an
 * internal move.
 *
 * All four consume the `GraphStore` port and nothing else — no store, no file
 * format, no builder is named anywhere below. Swapping the adapter therefore
 * cannot change an answer's shape, only its contents.
 */
export { type BlastOptions, blastRadius } from "./blast-radius.js";
export { type CoChangeOptions, coChange } from "./co-change.js";
export { type GraphClock, historyClock, type Stamp } from "./history-clock.js";
export { type NeighbourhoodOptions, neighbourhood } from "./neighbourhood.js";
export { type ProvenanceOptions, provenance } from "./provenance.js";
export type {
	BlastRadiusReport,
	CoChangePeer,
	CoChangeReport,
	ImpactedNode,
	Neighbourhood,
	NeighbourNode,
	ProvenanceRelation,
	ProvenanceReport,
	ProvenanceRow,
	Truncation,
	TruncationReason,
} from "./query-types.js";
