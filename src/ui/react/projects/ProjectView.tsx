/**
 * The project view (client-project.ts): the harness at a glance — what it
 * needs a human for, the models it routes to, the tools it can call, the
 * commands it gates on, and the prompt it runs on.
 */
import { useNavigate } from "@tanstack/react-router";
import type { Attention, ProjectDetail } from "../../../features/projects/detail.functions.js";
import { base, fmtCost, refKind } from "../runs/format.js";
import { Line, Sec } from "../runs/widgets.js";
import { lowerHalf } from "./project-blocks.js";
import "../runs/table.css";
import "../runs/widgets.css";
import "./tree.css";

type Patch = Record<string, unknown>;
type Nav = ReturnType<typeof useNavigate>;

/** Where an attention ref leads: a run (session/journal) or a document. */
function openRef(navigate: Nav, ref: string): void {
	if (refKind(ref) === "doc") {
		navigate({
			to: "/read/$",
			params: { _splat: ref.replace(/^\//, "") },
			search: (prev: Patch) => prev,
		});
	} else {
		navigate({
			to: "/runs/$runId",
			params: { runId: encodeURIComponent(ref) },
			search: (prev: Patch) => prev,
		});
	}
}

function Tile({
	value,
	label,
	hint,
	open,
}: {
	value: string;
	label: string;
	hint?: string;
	open?: () => void;
}) {
	// The accent styling is the promise that a tile leads somewhere; a tile
	// with no "open" gets neither, so nothing looks clickable and inert.
	return (
		<div className="stat" {...(open !== undefined ? { "data-open": "1", onClick: open } : {})}>
			<div className={`stat-v${open !== undefined ? " ev" : ""}`}>{value}</div>
			<div className="stat-l">{label}</div>
			{hint !== undefined ? <div className="stat-h">{hint}</div> : null}
		</div>
	);
}

function AttentionRows({ d, navigate }: { d: ProjectDetail; navigate: Nav }) {
	if (d.attention.length === 0) return <Line>Nothing needs attention in this project.</Line>;
	const row = (a: Attention) => (
		<tr
			key={a.label}
			className="attn-row"
			{...(a.ref !== undefined ? { "data-open": `ref:${a.ref}`, onClick: () => openRef(navigate, a.ref as string) } : {})}
		>
			<td>
				<span className={`sev ${a.severity}`} />
			</td>
			<td className="grow">{a.label}</td>
			<td className="mono">
				{a.ref !== undefined ? <span className="ev">{base(a.ref)}</span> : <span className="off">—</span>}
			</td>
		</tr>
	);
	return (
		<table className="tbl">
			<tbody>{d.attention.map(row)}</tbody>
		</table>
	);
}

export function ProjectView({ d }: { d: ProjectDetail }) {
	const navigate = useNavigate();
	const toRuns = (patch: Patch) => () =>
		navigate({ to: "/runs", search: (prev: Patch) => ({ ...prev, ...patch }) });
	const toDocs = () =>
		navigate({ to: "/docs", search: (prev: Patch) => ({ ...prev, project: d.name }) });
	return (
		<>
			<div className="head-row">
				<h2>{d.name}</h2>
				<span className={`kind-chip ${d.kind}`}>{d.kind}</span>
				<span className="dim">{d.path}</span>
			</div>
			<div className="stats-row">
				<Tile value={String(d.runs)} label="runs" hint="sessions + journals" open={toRuns({ project: d.name })} />
				<Tile value={String(d.liveRuns)} label="live" hint="in flight" open={toRuns({ project: d.name })} />
				<Tile value={String(d.sessions)} label="flusk sessions" hint="recorded here" open={toRuns({ project: d.name })} />
				<Tile value={String(d.docs)} label="documents" hint="indexed markdown" open={toDocs} />
				{/* A journal only contributes cost when it declares one, so $0 means
				    "nothing recorded", never "this was free". Say which. */}
				<Tile
					value={fmtCost(d.costUsd)}
					label="spend"
					hint={d.costUsd > 0 ? "sessions + journals" : "no cost recorded"}
					open={toRuns({ sort: "cost", project: undefined })}
				/>
			</div>
			<Sec title="Needs attention" count={d.attention.length || null}>
				<AttentionRows d={d} navigate={navigate} />
			</Sec>
			{lowerHalf(d)}
		</>
	);
}
