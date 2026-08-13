/**
 * Scaffolding for the store durability harness: a seeded PRNG, a generated
 * operation corpus (interleaved asserts, coexist writes, TTL ephemera, CAS
 * conflicts, sweeps, clock advances and mid-write tears), and the paired
 * stores — TypeScript reference and Rust — driven over separate dirs with
 * ONE logical clock. Ids are the only permitted byte difference (both sides
 * mint random UUIDs), so logs are compared after mapping each side's ids to
 * ordinals of first appearance; everything else must match byte for byte.
 */
import type { Compare, FactInput } from "../src/features/facts/types.js";

export const T0 = Date.parse("2026-01-01T00:00:00.000Z");
export const HOUR = 3_600_000;
export const NS = "repo:demo-1a2b3c4d";
export const OTHER_NS = "repo:other-0badf00d";
export const NO_LIMIT = Number.MAX_SAFE_INTEGER;
export const iso = (ms: number): string => new Date(ms).toISOString();

export function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

/** Each id → a same-width placeholder, numbered by first appearance. */
export function idMap(text: string): Map<string, string> {
	const map = new Map<string, string>();
	for (const m of text.match(UUID) ?? []) {
		if (!map.has(m)) map.set(m, `00000000-0000-4000-8000-${String(map.size).padStart(12, "0")}`);
	}
	return map;
}

const isJson = (line: string): boolean => {
	try {
		JSON.parse(line);
		return true;
	} catch {
		return false;
	}
};

export function canonicalIds(text: string): string {
	const map = idMap(text);
	const replaced = text.replace(UUID, (m) => map.get(m) ?? m);
	// A tear can cut a line mid-id, leaving a partial uuid no map can number.
	// On a torn (non-JSON) line only, mask the trailing hex-dash run with
	// same-width filler: a torn random id carries no information beyond its
	// width, and everything before the run is still compared byte for byte.
	return replaced
		.split("\n")
		.map((line) =>
			line === "" || isJson(line)
				? line
				: line.replace(/[0-9a-f-]{1,36}$/, (m) => "#".repeat(m.length)),
		)
		.join("\n");
}

export type Op =
	| { kind: "assert"; ns: string; input: FactInput }
	| { kind: "cas"; ns: string; input: FactInput; compare: Compare }
	| { kind: "ttl"; subject: string; hours: number }
	| { kind: "advance"; ms: number }
	| { kind: "sweep" }
	| { kind: "tear"; frac: number };

const pick = <T,>(rand: () => number, arr: readonly T[]): T =>
	arr[Math.floor(rand() * arr.length)] as T;

/** undefined means "directly observed"; 0.749/0.751 straddle the threshold. */
const CONFS = [undefined, 1, 0.9, 0.8, 0.751, 0.749, 0.5] as const;

function genInput(rand: () => number): FactInput {
	const predicate = pick(rand, ["p0", "p1", "c0", "c1"]);
	const input: FactInput = {
		subject: `S${Math.floor(rand() * 3)}`,
		predicate,
		object: `o${Math.floor(rand() * 3)}`,
	};
	const confidence = pick(rand, CONFS);
	if (confidence !== undefined) input.confidence = confidence;
	// Fixed vocabulary: c* predicates coexist, p* are functional — a flag that
	// flipped per call would be the caller bug the vocabulary table prevents.
	if (predicate.startsWith("c")) input.coexist = true;
	if (rand() < 0.3) input.source = pick(rand, ["run:1", 'verify "quoted"', "λ-unicode\n"]);
	if (rand() < 0.25) {
		// Non-alphabetical keys on purpose: a sorted-map serializer would pass
		// every test that forgot to exercise insertion order.
		input.properties = { zeta: Math.floor(rand() * 5), alpha: { b: 2, a: "x" }, n: 0.5 };
	}
	return input;
}

export function genOps(rand: () => number, count: number): Op[] {
	const ops: Op[] = [];
	for (let i = 0; i < count; i++) {
		const roll = rand();
		if (roll < 0.45) ops.push({ kind: "assert", ns: rand() < 0.85 ? NS : OTHER_NS, input: genInput(rand) });
		else if (roll < 0.6) {
			const input = genInput(rand);
			const compare: Compare = {
				subject: input.subject,
				predicate: pick(rand, ["p0", "p1"]),
				object: `o${Math.floor(rand() * 3)}`,
			};
			ops.push({ kind: "cas", ns: NS, input, compare });
		} else if (roll < 0.7)
			ops.push({ kind: "ttl", subject: `Item:${Math.floor(rand() * 2)}`, hours: 1 + Math.floor(rand() * 3) });
		else if (roll < 0.85) ops.push({ kind: "advance", ms: Math.floor(rand() * 2 * HOUR) + 1 });
		else if (roll < 0.93) ops.push({ kind: "sweep" });
		else ops.push({ kind: "tear", frac: rand() });
	}
	return ops;
}
