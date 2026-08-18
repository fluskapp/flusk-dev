/**
 * The loop's anatomy as one static token-clean SVG: task → context → turn →
 * tools → compaction → verify gate → facts, values interpolated from the
 * report. Deliberately NOT the /graph machinery — GraphStar draws file/symbol
 * neighbourhoods around a target; this is seven boxes and six arrows, no
 * layout library, no interactivity.
 */
import type { AnatomyReport } from "../../../features/anatomy/anatomy.types.js";

const BOX_W = 118;
const BOX_H = 44;
const GAP = 26;
const PAD = 4;

interface Box {
	label: string;
	value: string;
}

function boxes(r: AnatomyReport): Box[] {
	const loop = r.loop;
	return [
		{ label: "task", value: "what you intend" },
		{ label: "context", value: `budget ${loop.contextBudgetTokens} tokens` },
		{ label: "turn", value: `≤ ${loop.budgets.maxTurns} turns` },
		{ label: "tools", value: `${r.tools.length} tools` },
		{ label: "compaction", value: `@ ${loop.compaction.reserveTokens} reserve` },
		{
			label: "verify gate",
			value: r.verify.commands.length === 0 ? "no commands" : `${r.verify.commands.length} commands`,
		},
		{ label: "facts", value: loop.memoryEnabled ? "memory on" : "memory off" },
	];
}

export function LoopDiagram({ report }: { report: AnatomyReport }) {
	const row = boxes(report);
	const width = PAD * 2 + row.length * BOX_W + (row.length - 1) * GAP;
	return (
		<div className="anat-loop">
			<svg width={width} height={64} viewBox={`0 0 ${width} 64`} role="img" aria-label="The agent loop">
				{row.map((b, i) => {
					const x = PAD + i * (BOX_W + GAP);
					const mid = x + BOX_W / 2;
					return (
						<g key={b.label}>
							<rect className="anat-box" x={x} y={10} width={BOX_W} height={BOX_H} rx={4} />
							<text className="anat-label" x={mid} y={29}>{b.label}</text>
							<text className="anat-value" x={mid} y={44}>{b.value}</text>
							{i < row.length - 1 ? (
								<>
									<line className="anat-arrow" x1={x + BOX_W} y1={32} x2={x + BOX_W + GAP - 6} y2={32} />
									<path
										className="anat-arrow"
										d={`M ${x + BOX_W + GAP - 11} 28 L ${x + BOX_W + GAP - 5} 32 L ${x + BOX_W + GAP - 11} 36`}
									/>
								</>
							) : null}
						</g>
					);
				})}
			</svg>
		</div>
	);
}
