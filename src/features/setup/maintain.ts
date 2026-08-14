/**
 * The maintenance tick: what a healthy installation does to itself nightly.
 * Doctor first (the record of state), then the index refresh and the store
 * sweeps — each step recorded, none allowed to stop the others: maintenance
 * that dies on its first sore spot maintains nothing.
 *
 * Designed to be BORING to schedule: `flusk maintain` from cron, launchd or
 * CI is the whole integration. Every outcome lands as facts and a report the
 * workbench shows, because a self-maintaining setup the user cannot inspect
 * is just a setup that changes behind their back.
 */
import { loadConfig } from "../../platform/config/config.js";
import type { FactStore } from "../facts/types.js";
import { FLUSK_NS } from "../facts/namespaces.js";
import { sweepTransient } from "../facts/sweep.js";
import { corpusSources } from "../history/corpus-sources.repository.js";
import { refreshIndex } from "../history/index-store.repository.js";
import { recordDoctor, runChecks } from "./doctor.js";
import { LESSONS_NS } from "../flows/facts.js";
import type { MaintainReport, MaintainStep } from "./setup.types.js";

async function step(name: string, work: () => Promise<string>): Promise<MaintainStep> {
	try {
		return { name, ok: true, detail: await work() };
	} catch (e) {
		return { name, ok: false, detail: e instanceof Error ? e.message : String(e) };
	}
}

export async function maintainTick(
	store: FactStore | null,
	now: number = Date.now(),
): Promise<MaintainReport> {
	const steps: MaintainStep[] = [];
	steps.push(
		await step("doctor", async () => {
			const report = runChecks(now);
			if (store !== null) await recordDoctor(store, FLUSK_NS, report);
			const sore = report.checks.filter((c) => c.status !== "ok");
			return sore.length === 0
				? `all ${report.checks.length} checks ok`
				: `${report.verdict}: ${sore.map((c) => c.name).join(", ")}`;
		}),
	);
	steps.push(
		await step("index", async () => {
			const cfg = loadConfig(process.cwd());
			const index = refreshIndex(corpusSources(cfg), new Date(now));
			return `${index.cards.length} cards`;
		}),
	);
	if (store !== null) {
		steps.push(
			await step("sweep", async () => {
				const ops = await sweepTransient(FLUSK_NS, now);
				const lessons = await sweepTransient(LESSONS_NS, now);
				return `${ops + lessons} transient rows swept`;
			}),
		);
	}
	return { at: new Date(now).toISOString(), steps, ok: steps.every((s) => s.ok) };
}
