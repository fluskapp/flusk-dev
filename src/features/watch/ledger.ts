/**
 * The attempt ledger: facts in the `flusk` namespace that stop an unattended
 * loop from retrying the same item forever. Attempts are recorded BEFORE the
 * run, so a crash mid-run still leaves a cooldown behind.
 *
 * `cooldown_until` is transient with a TTL, so a sweeper may eventually delete
 * the row — but expiry is decided by comparing the stored timestamp, never by
 * the fact's mere presence (the sweep is not instant).
 */

import { watchFact } from "../facts/facts.js";
import { FLUSK_NS } from "../facts/namespaces.js";
import type { FactStore } from "../facts/types.js";
import { NO_LIMIT } from "../facts/visibility.js";

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
	store: FactStore,
	key: string,
	nowMs: number,
): Promise<boolean> {
	// `asOf` is the tick's own clock, not an optimization: a cooldown fact
	// carries a `validUntil`, and the store stops returning it the instant that
	// passes. Reading at `nowMs` is what makes "still resting" and "still
	// visible" the same question on a tick whose clock is not wall time.
	const facts = await store.query(FLUSK_NS, {
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
export async function failureCount(store: FactStore, key: string): Promise<number> {
	const facts = await store.query(FLUSK_NS, {
		subject: `Item:${key}`,
		predicate: "failure_count",
	});
	const n = Number(facts[0]?.object ?? "0");
	return Number.isFinite(n) ? n : 0;
}

/** Claim the item before working it: attempt + cooldown in one transact. */
export async function recordAttempt(
	store: FactStore,
	key: string,
	nowMs: number,
	untilIso: string,
): Promise<void> {
	await store.transact(FLUSK_NS, [
		watchFact.attemptedAt(key, new Date(nowMs).toISOString()),
		watchFact.cooldownUntil(key, untilIso),
	]);
}

/** Records the outcome and, on failure, advances the backoff counter. */
export async function recordOutcome(
	store: FactStore,
	key: string,
	outcome: string,
	priorFailures = 0,
): Promise<void> {
	await store.transact(FLUSK_NS, [watchFact.outcome(key, outcome)]);
	if (outcome !== "completed") {
		await store.transact(FLUSK_NS, [watchFact.failureCount(key, priorFailures + 1)]);
	}
}

/** Re-stamp the cooldown after a failure so the backoff reflects the new count. */
export async function extendCooldown(
	store: FactStore,
	key: string,
	untilIso: string,
): Promise<void> {
	await store.transact(FLUSK_NS, [watchFact.cooldownUntil(key, untilIso)]);
}

/**
 * The key a night's runs are counted under. Shifted back 12 hours and read in
 * LOCAL time: a UTC date flips mid-session in most timezones, which would let
 * an overnight run spend the nightly cap twice.
 */
export function nightKey(nowMs: number): string {
	const d = new Date(nowMs - 12 * HOUR_MS);
	const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 10);
}

/**
 * How many runs the night has spent: one coexisting row per run, counted.
 * Uncapped, because a night whose rows fell off the end of a page would read
 * as a fresh night and spend the cap again.
 */
export async function nightCount(store: FactStore, date: string): Promise<number> {
	const facts = await store.query(FLUSK_NS, {
		subject: `Night:${date}`,
		predicate: "run",
		limit: NO_LIMIT,
	});
	return facts.length;
}

/**
 * Take a slot in the night's budget. Two watchers racing here both write their
 * own row and both are counted; an increment of a shared counter would have
 * lost one of them, and no compare could have guarded the first write of a
 * night because there is no prior value to compare against.
 */
export async function recordNightRun(
	store: FactStore,
	date: string,
	itemKey: string,
	nowMs: number,
): Promise<void> {
	await store.transact(FLUSK_NS, [
		watchFact.nightRun(date, `${itemKey}@${new Date(nowMs).toISOString()}`),
	]);
}
