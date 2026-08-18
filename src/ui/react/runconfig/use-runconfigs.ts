/**
 * The one seam onto the runconfig feature: every value import from
 * src/features/runconfig lives HERE, so a signature drift while the feature
 * and this window land in parallel is a one-file fix. Components consume the
 * normalized shapes from widget-model.ts and call the wrapped calls through
 * use-server-call.ts, the RunStrip idiom.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getProjects, type ProjectSummary } from "../../../features/projects/projects.functions.js";
import {
	deleteRunConfig,
	dryConfig,
	getRunConfigs,
	getVerifyStatus,
	launchConfig,
	saveRunConfig,
} from "../../../features/runconfig/runconfig.functions.js";
import type { RunConfigScan } from "../../../features/runconfig/runconfig.types.js";
import type { RunConfigShape, Scope } from "./form-model.js";
import { normalizeScan, type ConfigMetaShape, type SkippedShape } from "./widget-model.js";

type Fn<D, R> = (a: { data: D }) => Promise<R>;

export interface StartedConfigRun {
	runId: string;
	task: string;
}

/** A write's answer, the SpecWriteReply grammar: ok, or a stated why. */
export interface WriteReply {
	ok: boolean;
	path?: string;
	why?: string;
}

export const callScan = (repo: string): Promise<RunConfigScan> =>
	(getRunConfigs as Fn<{ repo: string }, RunConfigScan>)({ data: { repo } });

export const callSave = (d: { repo: string; name: string; scope: Scope; config: RunConfigShape }) =>
	(saveRunConfig as Fn<typeof d, WriteReply>)({ data: d });

export const callDelete = (d: { repo: string; name: string; scope: Scope }) =>
	(deleteRunConfig as Fn<typeof d, WriteReply>)({ data: d });

export const callLaunch = (d: { repo: string; name: string }) =>
	(launchConfig as Fn<typeof d, StartedConfigRun>)({ data: d });

export const callDry = (d: { repo: string; name: string }) =>
	(dryConfig as Fn<typeof d, unknown>)({ data: d });

export const callVerify = (repo: string) =>
	(getVerifyStatus as Fn<{ repo: string }, unknown>)({ data: { repo } });

export interface RunConfigsState {
	/** Repo-kind projects lead; the first one is the default scan target. */
	repos: ProjectSummary[];
	primary: string | null;
	configs: ConfigMetaShape[];
	skipped: SkippedShape[];
	loading: boolean;
	error: string | null;
	reload(): void;
}

/** One fetch of projects → one scan of `.flusk/runs` (project + global). */
export function useRunConfigs(): RunConfigsState {
	const [repos, setRepos] = useState<ProjectSummary[]>([]);
	const [primary, setPrimary] = useState<string | null>(null);
	const [configs, setConfigs] = useState<ConfigMetaShape[]>([]);
	const [skipped, setSkipped] = useState<SkippedShape[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const alive = useRef(true);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const all = (await getProjects()) as ProjectSummary[];
			const ordered = [...all.filter((p) => p.kind === "repo"), ...all.filter((p) => p.kind !== "repo")];
			const first = ordered[0]?.path ?? null;
			if (!alive.current) return;
			setRepos(ordered);
			setPrimary(first);
			if (first === null) {
				setConfigs([]);
				setSkipped([]);
				return;
			}
			const scan = normalizeScan(await callScan(first));
			if (!alive.current) return;
			setConfigs(scan.configs);
			setSkipped(scan.skipped);
		} catch (e) {
			if (alive.current) setError(e instanceof Error ? e.message : String(e));
		} finally {
			if (alive.current) setLoading(false);
		}
	}, []);

	useEffect(() => {
		alive.current = true;
		void load();
		return () => {
			alive.current = false;
		};
	}, [load]);

	return { repos, primary, configs, skipped, loading, error, reload: () => void load() };
}
