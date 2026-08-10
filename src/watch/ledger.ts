/**
 * The attempt ledger: facts in the `hit` namespace that stop an unattended
 * loop from retrying the same item forever. Attempts are recorded BEFORE the
 * run, so a crash mid-run still leaves a cooldown behind.
 *
 * `cooldown_until` is transient with a TTL, so abagraph's sweeper eventually
 * deletes it — but expiry is decided by comparing the stored timestamp, never
 * by the fact's mere presence (the sweep is not instant).
 */
import type { MemoryClient } from "../memory/client-types.js";
import { watchFact } from "../memory/facts.js";
import { HIT_NS } from "../memory/namespaces.js";

const HOUR_MS = 3_600_000;

/** Cooldown end for an item: base hours after success, failures² after a failure. */
export function cooldownUntil(
	nowMs: number,
	baseHours: number,
	failCooldownHours: number,
	failures: number,
): string {
	const hours = failures > 0 ? failCooldownHours * failures * failures : baseHours;
	return new Date(nowMs + hours * HOUR_MS).toISOString();
}

/** True while the item is resting. Unparseable timestamps count as expired. */
export async function isCoolingDown(
	client: MemoryClient,
	key: string,
	nowMs: number,
): Promise<boolean> {
	// `as_of` is required, not an optimization: cooldown facts carry a
	// `valid_until`, and abagraph's DEFAULT read only returns facts with none
	// (core/match.rs), so a plain query finds nothing and every item would
	// look eligible on every tick — a retry storm.
	const facts = await client.query(HIT_NS, {
		subject: `Item:${key}`,
		predicate: "cooldown_until",
		asOf: nowMs,
	});
	return facts.some((f) => {
		const until = Date.parse(f.object);
		return Number.isFinite(until) && until > nowMs;
	});
}

/** Past attempts that did not finish cleanly — drives the backoff exponent. */
export async function failureCount(client: MemoryClient, key: string): Promise<number> {
	const facts = await client.query(HIT_NS, {
		subject: `Item:${key}`,
		predicate: "failure_count",
	});
	const n = Number(facts[0]?.object ?? "0");
	return Number.isFinite(n) ? n : 0;
}

/** Claim the item before working it: attempt + cooldown in one transact. */
export async function recordAttempt(
	client: MemoryClient,
	key: string,
	nowMs: number,
	untilIso: string,
): Promise<void> {
	await client.transact(HIT_NS, [
		watchFact.attemptedAt(key, new Date(nowMs).toISOString()),
		watchFact.cooldownUntil(key, untilIso),
	]);
}

/** Records the outcome and, on failure, advances the backoff counter. */
export async function recordOutcome(
	client: MemoryClient,
	key: string,
	outcome: string,
	priorFailures = 0,
): Promise<void> {
	await client.transact(HIT_NS, [watchFact.outcome(key, outcome)]);
	if (outcome !== "completed") {
		await client.transact(HIT_NS, [watchFact.failureCount(key, priorFailures + 1)]);
	}
}

/** Re-stamp the cooldown after a failure so the backoff reflects the new count. */
export async function extendCooldown(
	client: MemoryClient,
	key: string,
	untilIso: string,
): Promise<void> {
	await client.transact(HIT_NS, [watchFact.cooldownUntil(key, untilIso)]);
}

export function nightKey(nowMs: number): string {
	return new Date(nowMs).toISOString().slice(0, 10);
}

export async function nightCount(client: MemoryClient, date: string): Promise<number> {
	const facts = await client.query(HIT_NS, {
		subject: `Night:${date}`,
		predicate: "runs_count",
	});
	const n = Number(facts[0]?.object ?? "0");
	return Number.isFinite(n) ? n : 0;
}

export async function bumpNightCount(
	client: MemoryClient,
	date: string,
	current: number,
): Promise<void> {
	await client.transact(HIT_NS, [watchFact.runsCount(date, current + 1)]);
}
