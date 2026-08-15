/**
 * The New-spec affordance: a name, a template, one Create — the same
 * scaffold `flusk spec new <name> --template <t>` writes; the server
 * function is the only author, so the window and the CLI cannot drift.
 * A refusal is data ({ ok: false, why }), shown in the banner, never thrown.
 */
import { useState } from "react";
import { createSpec, type SpecWriteReply } from "../../../features/specs/specs.functions.js";
import { SPEC_TEMPLATES, type SpecTemplate } from "../../../features/specs/spec.types.js";
import { ErrorBanner } from "../live/ErrorBanner.js";
import { useServerCall } from "../live/use-server-call.js";
import "../live/live.css";
import "./specs.css";

export function NewSpec({ repo, onCreated }: { repo: string; onCreated: (name: string) => void }) {
	const [name, setName] = useState("");
	const [template, setTemplate] = useState<SpecTemplate>("feature");
	const [refused, setRefused] = useState<string | null>(null);
	const create = useServerCall(
		createSpec as (a: { data: { repo: string; name: string; template: SpecTemplate } }) => Promise<SpecWriteReply>,
	);
	const doCreate = async () => {
		const n = name.trim();
		if (n === "") return;
		const r = await create.call({ data: { repo, name: n, template } });
		if (r === null) return;
		if (!r.ok) {
			setRefused(r.why);
			return;
		}
		setName("");
		setRefused(null);
		onCreated(n);
	};
	return (
		/* The strip lives inside the list's .knav: keys stop here, or a name
		 * being typed would feed the speed search underneath. */
		<div className="live-strip spec-new" onKeyDown={(e) => e.stopPropagation()}>
			<div className="live-row">
				<input
					className="live-input"
					placeholder="Spec name — the handle flusk run --spec takes"
					spellCheck={false}
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") void doCreate();
						else if (e.key === "Escape") setName("");
					}}
				/>
				{SPEC_TEMPLATES.map((t) => (
					<button
						key={t}
						type="button"
						className={`live-btn${t === template ? " on" : ""}`}
						aria-pressed={t === template}
						onClick={() => setTemplate(t)}
					>
						{t}
					</button>
				))}
				<button
					type="button"
					className="live-btn primary"
					disabled={create.loading || name.trim() === ""}
					onClick={() => void doCreate()}
				>
					{create.loading ? "Creating…" : "Create"}
				</button>
			</div>
			<ErrorBanner message={create.error} onRetry={create.retry} onClose={create.clear} />
			<ErrorBanner message={refused} onClose={() => setRefused(null)} />
		</div>
	);
}
