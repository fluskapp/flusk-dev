/**
 * The form's HOW rows: budgets ($ / for / turns — the CLI's flag grammar),
 * the verify gate, the isolation toggles, and the scripted-provider path.
 * All optional; blank means the machinery's own defaults.
 */
import type { ConfigDraft } from "./form-model.js";

export function ConfigFormRows({
	draft,
	patch,
}: {
	draft: ConfigDraft;
	patch: (p: Partial<ConfigDraft>) => void;
}) {
	const check = (
		key: "verify" | "isoNone" | "allowDirty" | "container",
		label: string,
		title: string,
	) => (
		<label className="rc-check" title={title}>
			<input type="checkbox" checked={draft[key]} onChange={(e) => patch({ [key]: e.target.checked })} />
			{label}
		</label>
	);
	return (
		<>
			<div className="rc-field">
				<span>Budgets:</span>
				<span className="rc-budgets">
					<label title="--max-cost, dollars">
						$
						<input
							className="rc-in mono rc-num"
							inputMode="decimal"
							spellCheck={false}
							placeholder="2.00"
							value={draft.maxCostUsd}
							onChange={(e) => patch({ maxCostUsd: e.target.value })}
						/>
					</label>
					<label title="--for: 2h, 30m, 45s or 1h30m">
						for
						<input
							className="rc-in mono rc-num"
							spellCheck={false}
							placeholder="45m"
							value={draft.forDur}
							onChange={(e) => patch({ forDur: e.target.value })}
						/>
					</label>
					<label title="--max-turns, a positive integer">
						turns
						<input
							className="rc-in mono rc-num"
							inputMode="numeric"
							spellCheck={false}
							placeholder="30"
							value={draft.maxTurns}
							onChange={(e) => patch({ maxTurns: e.target.value })}
						/>
					</label>
				</span>
			</div>
			<div className="rc-field">
				<span>Toggles:</span>
				<span className="rc-checks">
					{check("verify", "verify gate", "Run the verification gate after the run (--no-verify when off)")}
					{check("container", "container", "Execute bash inside the repo's container")}
					{check("isoNone", "no isolation", "--no-isolation: work directly on the tree")}
					{check("allowDirty", "allow dirty tree", "--allow-dirty: start even with uncommitted changes")}
				</span>
			</div>
			<label className="rc-field">
				<span>Fake:</span>
				<input
					className="rc-in mono"
					spellCheck={false}
					placeholder="scripted-provider JSON — demo/test configs only"
					value={draft.fake}
					onChange={(e) => patch({ fake: e.target.value })}
				/>
			</label>
		</>
	);
}
