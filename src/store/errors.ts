/**
 * The rejection a lost race produces.
 *
 * Task claiming distinguishes "someone else got there first" from "the store
 * is broken" by this `code` alone (src/goals/scheduler.ts). If a failing guard
 * threw a plain Error, every claimer would treat a normal race as a fault and
 * abort the run; if it resolved instead of rejecting, two sessions would work
 * the same task.
 */
import type { Compare, CompareFailedError } from "./types.js";

export function compareFailed(failures: Compare[]): CompareFailedError {
	const list = failures.map((c) => `${c.subject} ${c.predicate} = ${c.object}`).join("; ");
	const err = new Error(`transact rejected: compare failed (${list})`) as CompareFailedError;
	err.code = "CompareFailed";
	err.failures = failures;
	return err;
}
