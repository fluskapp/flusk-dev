/**
 * The doctor: run every check, worst status wins, and — when a store is
 * available — write the verdicts down as Setup: facts so the workbench's
 * Attention panel surfaces a regression the way it surfaces a failed run.
 * Pure orchestration; the checks own the machine access.
 */
import { fact } from "../facts/facts.js";
import type { FactStore } from "../facts/types.js";
import {
	checkConfig,
	checkDocker,
	checkGit,
	checkIndex,
	checkNative,
	checkNode,
	checkStoreLocks,
} from "./checks.repository.js";
import type { DoctorReport, SetupCheck } from "./setup.types.js";

export function runChecks(now: number = Date.now()): DoctorReport {
	const checks: SetupCheck[] = [
		checkNode(),
		checkGit(),
		checkDocker(),
		checkNative(),
		checkConfig(),
		checkIndex(now),
		checkStoreLocks(now),
	];
	const verdict = checks.some((c) => c.status === "fail")
		? "fail"
		: checks.some((c) => c.status === "warn")
			? "warn"
			: "ok";
	return { at: new Date(now).toISOString(), checks, verdict };
}

/** One functional row per check: the CURRENT state, history kept by the store. */
export async function recordDoctor(store: FactStore, ns: string, report: DoctorReport): Promise<void> {
	for (const c of report.checks) {
		await store.transact(ns, [fact(`Setup:${c.name}`, "status", `${c.status}: ${c.detail}`)]);
	}
}
