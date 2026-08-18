/**
 * The goal frontier as a FLAT list — status chip per goal, tasks nested with
 * their dependencies as "after t-xxxx" chips and their attempts as dim run
 * ids. Not a node-edge painting: the frontier is small (the planner caps a
 * goal at ten tasks), and a graph drawing is speculative until someone has a
 * graph too big to read as a list.
 */
import type { GoalGraphReply, GoalNode, TaskNode } from "../../../features/goals/goals.functions.js";
import { Line, Sec } from "../runs/widgets.js";

/** Goal/task status → the pill vocabulary (system.css). */
const PILL: Record<string, string> = {
	done: "ok",
	active: "run",
	running: "run",
	failed: "err",
	abandoned: "err",
	blocked: "warn",
	pending: "dim",
	planned: "dim",
};

function StatusPill({ status }: { status: string }) {
	return <span className={`sys-pill ${PILL[status] ?? "dim"}`}>{status}</span>;
}

const short = (id: string): string => id.replace(/^(Task|Run|Goal):/, "");

function TaskRow({ t }: { t: TaskNode }) {
	return (
		<div className="anat-task">
			<StatusPill status={t.status} />
			<span className="chip">{short(t.id)}</span>
			<span>{t.description}</span>
			{t.dependsOn.map((d) => (
				<span key={d} className="chip dim">
					after {short(d)}
				</span>
			))}
			{t.attemptedBy.map((r) => (
				<span key={r} className="mono dim">
					{short(r)}
				</span>
			))}
		</div>
	);
}

function GoalRow({ g }: { g: GoalNode }) {
	return (
		<div className="anat-goal">
			<div className="anat-goal-head">
				<StatusPill status={g.status} />
				<span className="chip">{short(g.id)}</span>
				<span>{g.title}</span>
			</div>
			{g.tasks.map((t) => (
				<TaskRow key={t.id} t={t} />
			))}
		</div>
	);
}

export function GoalsSection({ data }: { data: GoalGraphReply }) {
	return (
		<Sec title="Goals" count={data.goals.length || null}>
			{!data.enabled ? (
				<Line>memory disabled — no goal graph is kept</Line>
			) : data.goals.length === 0 ? (
				<Line>no goals recorded</Line>
			) : (
				data.goals.map((g) => <GoalRow key={g.id} g={g} />)
			)}
		</Sec>
	);
}
