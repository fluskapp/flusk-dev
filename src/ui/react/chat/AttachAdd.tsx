/**
 * The strip's three sources, one row: Code (re-read what is on screen — an
 * explicit act, exactly the old "Use what is on screen"), a Spec by name, and
 * a Run by its key. Unreadable specs stay listed disabled with their reason —
 * an unreadable spec must not vanish (spec.types.ts).
 */
import { useState } from "react";
import { getSpecs } from "../../../features/specs/specs.functions.js";
import type { SpecScan } from "../../../features/specs/spec.types.js";
import { captureCode } from "./attach-logic.js";
import { attachRun, attachSpec, specRepo } from "./attach-sources.js";

function SpecPicker() {
	// null = never asked; the list is read when the picker is first touched.
	const [scan, setScan] = useState<SpecScan | null>(null);
	const [note, setNote] = useState("");
	const load = (): void => {
		if (scan !== null) return;
		getSpecs({ data: { repo: specRepo() } }).then(
			(s) => setScan(s),
			(e: unknown) => setNote(e instanceof Error ? e.message : String(e)),
		);
	};
	return (
		<select
			title="Attach a spec — its title and body ride as a quoted block"
			value=""
			onFocus={load}
			onChange={(e) => {
				const name = e.target.value;
				if (name !== "") void attachSpec(name);
			}}
		>
			<option value="">+ Spec…</option>
			{note !== "" ? <option disabled>{note}</option> : null}
			{scan !== null && scan.specs.length === 0 && scan.skipped.length === 0 ? (
				<option disabled>no specs in this repo (.flusk/specs)</option>
			) : null}
			{(scan?.specs ?? []).map((s) => (
				<option key={s.name} value={s.name}>
					{s.name} — {s.status}
				</option>
			))}
			{(scan?.skipped ?? []).map((s) => (
				<option key={s.path} disabled>
					{s.path} — {s.why}
				</option>
			))}
		</select>
	);
}

function RunInput() {
	const [key, setKey] = useState("");
	const add = (): void => {
		const k = key.trim();
		if (k === "") return;
		setKey("");
		void attachRun(k);
	};
	return (
		<input
			type="text"
			placeholder="+ run key"
			title="Attach a run's head by its key (see Runs, window 3)"
			spellCheck={false}
			value={key}
			onChange={(e) => setKey(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					add();
				}
			}}
		/>
	);
}

export function AttachAdd() {
	return (
		<div className="att-add">
			<button type="button" title="Attach the file and symbol on screen" onClick={() => void captureCode()}>
				+ Code
			</button>
			<SpecPicker />
			<RunInput />
		</div>
	);
}
