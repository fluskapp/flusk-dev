/**
 * The dialog footer: the action row plus the red-line/amber-line — the first
 * hard error disables Run and Save and says why; a warning blocks nothing.
 * A started run is offered as a /runs/$runId link, never an auto-navigation.
 */
import { Link } from "@tanstack/react-router";
import type { Issue } from "./form-model.js";
import type { StartedConfigRun } from "./use-runconfigs.js";

export function ConfigFooter({
	issue,
	saved,
	busy,
	started,
	onDry,
	onDelete,
	onRun,
	onSave,
	onCancel,
}: {
	issue: Issue | null;
	/** The current name exists on disk — Run and Dry read the saved file. */
	saved: boolean;
	busy: boolean;
	started: StartedConfigRun | null;
	onDry: () => void;
	onDelete: () => void;
	onRun: () => void;
	onSave: () => void;
	onCancel: () => void;
}) {
	const blocked = issue !== null && issue.level === "error";
	return (
		<footer className="rc-foot">
			<button
				type="button"
				className="sys-btn"
				disabled={!saved || busy}
				title={saved ? "Compose the plan — kind, model, tools, isolation — without starting anything" : "Save first — the preview reads the saved file"}
				onClick={onDry}
			>
				Dry preview
			</button>
			{saved ? (
				<button type="button" className="sys-btn" disabled={busy} title="Delete this configuration file" onClick={onDelete}>
					Delete
				</button>
			) : null}
			<span className="spacer" />
			{issue !== null ? (
				<span className={`rc-issue ${issue.level}`} role={blocked ? "alert" : "status"}>
					{blocked ? "✖" : "⚠"} {issue.message}
				</span>
			) : null}
			{started !== null ? (
				<Link
					className="rc-started"
					to="/runs/$runId"
					params={{ runId: encodeURIComponent(started.runId) }}
					search={(prev: Record<string, unknown>) => ({ ...prev, rc: undefined })}
				>
					started — {started.runId}
				</Link>
			) : null}
			<button
				type="button"
				className="sys-btn"
				disabled={blocked || !saved || busy}
				title={saved ? "Launch this configuration" : "Save first — a run launches the file on disk"}
				onClick={onRun}
			>
				Run
			</button>
			<button type="button" className="sys-btn primary" disabled={blocked || busy} onClick={onSave}>
				Save
			</button>
			<button type="button" className="sys-btn" onClick={onCancel}>
				Cancel
			</button>
		</footer>
	);
}
