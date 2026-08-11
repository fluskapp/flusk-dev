/**
 * Turning asserts into log lines: the one place supersession, dedup and the
 * Candidate threshold are decided.
 *
 * Each of the three is load-bearing in a way that fails silently when it is
 * wrong. Miss the supersession and a functional predicate answers two values
 * at once; miss the dedup and a step that runs twice doubles its own history;
 * let a low-confidence guess supersede, and one unconfirmed extraction closes
 * a fact that was directly observed.
 */
import { randomUUID } from "node:crypto";
import type { Stored } from "./materialize.js";
import type { StoreRecord } from "./record.js";
import type { Fact, FactInput } from "./types.js";
import { visibleAt } from "./visibility.js";

/** Below this a fact is a Candidate: out of default reads, and it closes nothing. */
const CANDIDATE_BELOW = 0.75;

/** Confidences this close are the same number and must not defeat dedup. */
const CONFIDENCE_EPSILON = 1e-3;

export interface Plan {
	records: StoreRecord[];
	ids: string[];
}

export function planTransact(
	rows: Stored[],
	asserts: FactInput[],
	nowIso: string,
	tx: number,
): Plan {
	const at = Date.parse(nowIso);
	const live = rows.filter((r) => r.fact.status !== "superseded" && visibleAt(r.fact, at));
	const records: StoreRecord[] = [];
	const ids: string[] = [];
	for (const input of asserts) {
		const same = identical(live, input);
		if (same) {
			ids.push(same.id);
			continue;
		}
		const fact = build(input, nowIso);
		// Closes come FIRST. A batch is one append, so a process killed
		// mid-write leaves a byte prefix of it and whatever was emitted last is
		// what a tear drops. Dropping the new fact costs a value the caller can
		// simply assert again; dropping the close leaves two live values on a
		// functional predicate, and no expected value can ever satisfy a guard
		// against that pair again — the subject is wedged for good.
		if (fact.status === "active" && input.coexist !== true) {
			for (const r of live) {
				if (r.fact.status !== "active") continue;
				if (r.fact.subject !== fact.subject || r.fact.predicate !== fact.predicate) continue;
				records.push({ k: "close", tx, id: r.fact.id, validUntil: nowIso });
			}
		}
		records.push({ k: "fact", tx, transient: input.transient === true, fact });
		ids.push(fact.id);
	}
	return { records, ids };
}

/**
 * The live row this assert would merely restate. Re-running a step that
 * asserts what it asserted last time must be free, so the caller gets the
 * existing id back and the log grows by nothing.
 */
function identical(live: Stored[], input: FactInput): Fact | undefined {
	const confidence = input.confidence ?? 1;
	return live.find(
		(r) =>
			r.fact.subject === input.subject &&
			r.fact.predicate === input.predicate &&
			r.fact.object === input.object &&
			r.fact.source === input.source &&
			Math.abs(r.fact.confidence - confidence) <= CONFIDENCE_EPSILON,
	)?.fact;
}

function build(input: FactInput, nowIso: string): Fact {
	const confidence = input.confidence ?? 1;
	return {
		id: randomUUID(),
		subject: input.subject,
		predicate: input.predicate,
		object: input.object,
		confidence,
		source: input.source,
		status: confidence < CANDIDATE_BELOW ? "candidate" : "active",
		validFrom: nowIso,
		validUntil: input.validUntil ?? null,
		properties: input.properties,
	};
}
