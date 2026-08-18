/**
 * Tool window 0: Harness — what runs your code: the loop, its tools, and
 * what it has learned. Read-only v1: the loop diagram on top, then the
 * sections, in the order the spec pins: Tools, Workspace, Routing, Verify,
 * Backends, Extensions, Goals, MCP, Memory. Goals ride a deferred promise
 * (the runs_.$runId idiom) so the store open never blocks the config half.
 */
import { Await } from "@tanstack/react-router";
import { Suspense } from "react";
import type { AnatomyReport } from "../../../features/anatomy/anatomy.types.js";
import type { GoalGraphReply } from "../../../features/goals/goals.functions.js";
import { Line, Sec } from "../runs/widgets.js";
import { AnatomySections } from "./AnatomySections.js";
import { BackendsSec, ExtensionsSec, McpSec, MemorySec } from "./AnatomyStatus.js";
import { GoalsSection } from "./GoalsSection.js";
import { LoopDiagram } from "./LoopDiagram.js";
import "../runs/table.css";
import "../runs/widgets.css";
import "./anatomy.css";

export function HarnessWindow({
	report,
	goals,
}: {
	report: AnatomyReport;
	goals: Promise<GoalGraphReply>;
}) {
	return (
		<>
			<div className="head-row">
				<h2>Harness</h2>
				<span className="dim">what runs your code: the loop, its tools, and what it has learned</span>
			</div>
			<LoopDiagram report={report} />
			<AnatomySections report={report} />
			<BackendsSec backends={report.backends} />
			<ExtensionsSec ext={report.extensions} />
			<Suspense
				fallback={
					<Sec title="Goals">
						<Line>reading the goal graph…</Line>
					</Sec>
				}
			>
				<Await promise={goals}>{(g: GoalGraphReply) => <GoalsSection data={g} />}</Await>
			</Suspense>
			<McpSec />
			<Suspense fallback={null}>
				<Await promise={goals}>
					{(g: GoalGraphReply) => <MemorySec enabled={g.enabled} ns={g.ns} />}
				</Await>
			</Suspense>
		</>
	);
}
