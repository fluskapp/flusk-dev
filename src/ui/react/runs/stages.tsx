/**
 * Harness stages, shown as a pipeline instead of the packed text they are
 * stored in ("status|duration|detail"). Ported from client-stages.ts: the
 * encoding is decoded once, here, and every surface uses it. Status becomes a
 * GLYPH as well as a colour — colour alone fails anyone who cannot separate
 * the greens from the reds, and disappears on an inverted selected row.
 */
import "./stages.css";

export interface StageView {
	name: string;
	status: string;
	duration: string;
	detail: string;
}

const STAGE_ICON: Record<string, string> = {
	done: "✓", ok: "✓", pass: "✓", passed: "✓", completed: "✓",
	failed: "✗", error: "✗", blocked: "✗",
	running: "●", active: "●",
	skipped: "⊘", skip: "⊘",
	pending: "○", queued: "○",
};

const STAGE_CLASS: Record<string, string> = {
	done: "completed", ok: "completed", pass: "completed", passed: "completed",
	running: "running", failed: "error", error: "error",
	skipped: "stopped", skip: "stopped", pending: "",
};

/** The packed value "status|duration|detail". Every field may be empty. */
export function parseStage(name: string, value: unknown): StageView {
	const parts = String(value ?? "").split("|");
	return {
		name,
		status: (parts[0] ?? "").trim(),
		duration: (parts[1] ?? "").trim(),
		detail: parts.slice(2).join("|").trim(),
	};
}

export function stageIcon(status: string): string {
	return STAGE_ICON[status.toLowerCase()] ?? "○";
}

export function stageClass(status: string): string {
	return STAGE_CLASS[status.toLowerCase()] ?? "";
}

const isFailed = (s: StageView): boolean => {
	const k = s.status.toLowerCase();
	return k === "failed" || k === "error";
};

/** 0.0s is what the harness writes for a stage that has not started: printing
 * it implies work that took no time, so it is dropped. */
function StageTime({ s }: { s: StageView }) {
	if (s.duration === "" || s.duration === "0.0s") return null;
	return <span className="stg-t">{s.duration}</span>;
}

export interface PickStage {
	selected: string | null;
	onPick: (name: string) => void;
}

/** One chip. With `pick`, a FAILED stage is a real control — a handle onto
 * the place in the journal that explains it — focusable and openable. */
export function StageChip({ s, pick }: { s: StageView; pick?: PickStage }) {
	const title = `${s.name} · ${s.status || "unknown"}${s.duration ? ` · ${s.duration}` : ""}${s.detail ? ` · ${s.detail}` : ""}`;
	const jump = pick !== undefined && stageClass(s.status) === "error";
	return (
		<span
			className={`stage ${stageClass(s.status)}${jump && pick.selected === s.name ? " on" : ""}`}
			title={title}
			{...(jump
				? {
						"data-stage": s.name,
						tabIndex: 0,
						role: "button",
						onClick: () => pick.onPick(s.name),
						onKeyDown: (e: React.KeyboardEvent) => {
							if (e.key !== "Enter" && e.key !== " ") return;
							e.preventDefault();
							pick.onPick(s.name);
						},
					}
				: {})}
		>
			<span className="stg-i">{stageIcon(s.status)}</span>
			{s.name}
			<StageTime s={s} />
		</span>
	);
}

/** The flattened "stages.<name>" keys of a frontmatter object, or null so a
 * document that is not a run journal keeps its property table untouched. */
export function stagesOfFm(fm: Record<string, string>): StageView[] | null {
	const names = Object.keys(fm).filter((k) => k.startsWith("stages."));
	if (names.length === 0) return null;
	return names.map((k) => parseStage(k.slice(7), fm[k]));
}

export function StagePipeline({ rows }: { rows: StageView[] }) {
	return (
		<div className="stg-row">
			{rows.map((s) => (
				<StageChip key={s.name} s={s} />
			))}
		</div>
	);
}

/** The failing stage's detail, rendered where it can be read: it is the whole
 * evidence behind a "stage gate failed" attention item, and a title= tooltip
 * stopped the symptom-to-evidence path one click short. */
export function StageErrors({ stages, pick }: { stages: StageView[]; pick: PickStage }) {
	return (
		<>
			{stages.filter(isFailed).map((s) => (
				<div
					key={s.name}
					className={`error-line${pick.selected === s.name ? " on" : ""}`}
					data-stage={s.name}
					tabIndex={0}
					role="button"
					onClick={() => pick.onPick(s.name)}
					onKeyDown={(e) => {
						if (e.key !== "Enter" && e.key !== " ") return;
						e.preventDefault();
						pick.onPick(s.name);
					}}
				>
					<b>{s.name}</b> {s.status}
					{s.duration ? ` · ${s.duration}` : ""}
					{s.detail ? ` — ${s.detail}` : ""} <span className="dim">(open in journal)</span>
				</div>
			))}
		</>
	);
}
