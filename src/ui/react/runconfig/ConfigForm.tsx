/**
 * The right column of the Run Configurations dialog: what the run IS —
 * name, scope, task or spec, repo, kind, model — with the budget and
 * isolation rows mounted below. Controlled by the dialog's one draft;
 * every field patches it, validation happens above.
 */
import { useEffect, useRef } from "react";
import { KIND_OPTIONS, type ConfigDraft } from "./form-model.js";
import { ConfigFormRows } from "./ConfigFormRows.js";
import { HarnessSelect } from "./HarnessSelect.js";

export interface RepoOption {
	name: string;
	path: string;
}

export function ConfigForm({
	draft,
	patch,
	specs,
	repos,
	focusSpec = false,
}: {
	draft: ConfigDraft;
	patch: (p: Partial<ConfigDraft>) => void;
	specs: string[];
	repos: RepoOption[];
	focusSpec?: boolean;
}) {
	const nameRef = useRef<HTMLInputElement>(null);
	const specRef = useRef<HTMLSelectElement>(null);
	/* "from spec…" opens with the spec dropdown focused; plain open, the name. */
	useEffect(() => {
		if (focusSpec) specRef.current?.focus();
		else nameRef.current?.focus();
	}, [focusSpec]);

	return (
		<div className="rc-form">
			<label className="rc-field">
				<span>Name:</span>
				<input
					ref={nameRef}
					className="rc-in mono"
					spellCheck={false}
					placeholder="the file stem — .flusk/runs/<name>.json"
					value={draft.name}
					onChange={(e) => patch({ name: e.target.value })}
				/>
			</label>
			<div className="rc-field" role="radiogroup" aria-label="Store as">
				<span>Store as:</span>
				<span className="rc-radios">
					{(["project", "global"] as const).map((s) => (
						<label key={s} className="rc-radio">
							<input
								type="radio"
								name="rc-scope"
								checked={draft.scope === s}
								onChange={() => patch({ scope: s })}
							/>
							{s === "project" ? "project (.flusk/runs)" : "global (~/.flusk/runs)"}
						</label>
					))}
				</span>
			</div>
			<label className="rc-field rc-task">
				<span>Task:</span>
				<textarea
					className="rc-in"
					rows={3}
					spellCheck={false}
					placeholder="What the run should do — or pick a spec below"
					value={draft.task}
					onChange={(e) => patch({ task: e.target.value })}
				/>
			</label>
			<label className="rc-field">
				<span>or Spec:</span>
				<select
					ref={specRef}
					className="rc-in"
					value={draft.spec}
					onChange={(e) => patch({ spec: e.target.value })}
				>
					<option value="">— none — the task above is the task</option>
					{specs.map((s) => (
						<option key={s} value={s}>{s}</option>
					))}
				</select>
			</label>
			<label className="rc-field">
				<span>Repo:</span>
				<select className="rc-in" value={draft.repo} onChange={(e) => patch({ repo: e.target.value })}>
					<option value="">default — the first repo project</option>
					{repos.map((r) => (
						<option key={r.path} value={r.path}>{r.name} — {r.path}</option>
					))}
				</select>
			</label>
			<label className="rc-field">
				<span>Kind:</span>
				<select className="rc-in" value={draft.kind} onChange={(e) => patch({ kind: e.target.value })}>
					<option value="">auto — spec mode, or the classifier</option>
					{KIND_OPTIONS.map((k) => (
						<option key={k} value={k}>{k}</option>
					))}
				</select>
			</label>
			<label className="rc-field">
				<span>Model:</span>
				<input
					className="rc-in mono"
					spellCheck={false}
					placeholder="auto (router) — or provider/id"
					value={draft.model}
					onChange={(e) => patch({ model: e.target.value })}
				/>
			</label>
			<HarnessSelect
				value={draft.harness}
				repo={draft.repo !== "" ? draft.repo : (repos[0]?.path ?? null)}
				onChange={(id) => patch({ harness: id })}
			/>
			<ConfigFormRows draft={draft} patch={patch} />
			<label className="rc-field">
				<span>Tags:</span>
				<input
					className="rc-in"
					spellCheck={false}
					placeholder="nightly, refactor"
					value={draft.tags}
					onChange={(e) => patch({ tags: e.target.value })}
				/>
			</label>
		</div>
	);
}
