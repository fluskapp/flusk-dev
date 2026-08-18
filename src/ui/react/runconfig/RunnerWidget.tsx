/**
 * WebStorm's top-right runner cluster in the main toolbar: the config
 * dropdown (selection is per-machine, the flusk-theme localStorage
 * precedent — not URL litter), Run, and a red Stop square while the
 * launched run is live. The last dropdown row opens the dialog. A started
 * run is offered as a link, never an automatic navigation.
 */
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { abortRun } from "../../../features/run/run.functions.js";
import { getUiPrefs, type UiPrefs } from "../../../features/workbench/workbench.functions.js";
import { openRunStream } from "../live/live-stream.js";
import { useServerCall } from "../live/use-server-call.js";
import { Ic } from "../system/Icon.js";
import { callLaunch, useRunConfigs, type StartedConfigRun } from "./use-runconfigs.js";
import { EMPTY_LABEL, SELECTION_KEY as KEY, optionLabel, resolveSelection } from "./widget-model.js";
import "./runconfig.css";

const EDIT = "__edit__";
const ARM_MS = 3000; // a forgotten armed Stop disarms itself, the RunControls idiom
type Prev = Record<string, unknown>;

export function RunnerWidget() {
	const navigate = useNavigate();
	const rcs = useRunConfigs();
	const search = useSearch({ strict: false }) as Record<string, unknown>;
	const [stored, setStored] = useState<string | null>(null);
	const [team, setTeam] = useState<string | null>(null);
	const [live, setLive] = useState<StartedConfigRun | null>(null);
	const [armed, setArmed] = useState(false);
	const closer = useRef<(() => void) | null>(null);
	const disarm = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const launch = useServerCall(callLaunch);
	const stop = useServerCall(abortRun as (a: { data: { runId: string } }) => Promise<{ ok: boolean }>);
	useEffect(() => setStored(localStorage.getItem(KEY)), []);
	useEffect(() => {
		let alive = true;
		void (getUiPrefs() as Promise<UiPrefs>)
			.then((p) => {
				if (alive) setTeam(p.defaultRunConfig);
			})
			.catch(() => undefined); // no team default is a fine answer
		return () => {
			alive = false;
		};
	}, []);
	useEffect(() => () => {
		closer.current?.();
		clearTimeout(disarm.current);
	}, []);

	const names = rcs.configs.map((c) => c.name);
	/* Selection precedence (H0 D6): ?rc → localStorage → the committed team
	 * default — each only when it names a real config, never a ghost. */
	const urlRc = typeof search.rc === "string" && names.includes(search.rc) ? search.rc : null;
	const localRc = stored !== null && names.includes(stored) ? stored : null;
	const teamRc = team !== null && names.includes(team) ? team : null;
	const sel = urlRc ?? localRc ?? teamRc ?? resolveSelection(null, names);
	const openDialog = (rc: string) => void navigate({ to: ".", search: (p: Prev) => ({ ...p, rc }) });

	const pick = (v: string) => {
		if (v === EDIT) { openDialog(sel ?? "new"); return; }
		setStored(v);
		localStorage.setItem(KEY, v);
	};
	const doRun = async () => {
		if (sel === null || rcs.primary === null) return;
		const r = await launch.call({ repo: rcs.primary, name: sel });
		if (r === null) return;
		setLive(r);
		closer.current?.();
		/* One SSE just to know when Stop should disappear again. */
		closer.current = openRunStream(r.runId, (s) => {
			if (s.status === "ended") setLive(null);
		});
	};
	const doStop = async () => {
		if (live === null) return;
		if (!armed) {
			setArmed(true);
			disarm.current = setTimeout(() => setArmed(false), ARM_MS);
			return;
		}
		clearTimeout(disarm.current);
		setArmed(false);
		const r = await stop.call({ data: { runId: live.runId } });
		if (r !== null) setLive(null);
	};

	// In-flight scan (SSR + first paint): a fixed-width disabled chip — a
	// density-matched skeleton — so the toolbar's right cluster never reflows.
	if (rcs.loading)
		return (
			<span className="rc-runner">
				<button type="button" className="tb-chip rc-ghost" disabled aria-hidden="true">
					<Ic name="run" size={14} />
				</button>
			</span>
		);
	if (names.length === 0) {
		return (
			<button type="button" className="tb-chip rc-runner" title="No run configurations yet — Add Configuration… opens the dialog" onClick={() => openDialog("new")}>
				<Ic name="run" size={14} /> {EMPTY_LABEL}
			</button>
		);
	}
	return (
		<span className="rc-runner">
			<select
				className="rc-widget-sel mono"
				aria-label="Run configuration"
				title="Run configuration"
				value={sel ?? ""}
				onChange={(e) => pick(e.target.value)}
			>
				{rcs.configs.map((c) => (
					<option key={c.name} value={c.name}>{optionLabel(c)}</option>
				))}
				<option value={EDIT}>Edit Configurations…</option>
			</select>
			<button
				type="button"
				className="sys-btn icon bare rc-go"
				disabled={launch.loading || sel === null}
				title={launch.error ?? `Run ${sel ?? ""}`}
				onClick={() => void doRun()}
			>
				<Ic name="run" size={14} />
			</button>
			{live !== null ? (
				<>
					<button
						type="button"
						className={`sys-btn icon bare rc-stop${armed ? " armed" : ""}`}
						title={armed ? "Press again to stop" : `Stop ${live.runId}`}
						onKeyDown={(e) => { if (e.key === "Escape" && armed) setArmed(false); }}
						onBlur={() => setArmed(false)}
						onClick={() => void doStop()}
					>
						<Ic name="stop" size={14} />
					</button>
					<Link className="tb-chip live rc-live" to="/runs/$runId" params={{ runId: encodeURIComponent(live.runId) }} search={(p: Prev) => p} title={`Live: ${live.task}`}>
						<span className="sys-live" /> {live.runId}
					</Link>
				</>
			) : null}
			{launch.error !== null ? <span className="rc-werr" title={launch.error}>!</span> : null}
		</span>
	);
}
