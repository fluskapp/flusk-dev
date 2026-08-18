/**
 * The Harness row of the config form: native (the default loop) plus every
 * id `.flusk/harnesses` and the built-ins offer. Unavailable ids render
 * DISABLED with their note — an untrusted project harness or a missing
 * binary is visible, never hidden (the detect idiom). Fetches its own scan
 * through the feature's server fn, the use-runconfigs seam pattern.
 */
import { useEffect, useState } from "react";
import { listHarnessConfigs, type HarnessScan } from "../../../features/harnesses/harnesses.functions.js";

type ListFn = (a: { data: { repoRoot?: string } }) => Promise<HarnessScan>;

export interface HarnessRow {
	id: string;
	scope: string;
	available: boolean;
	note?: string;
}

export function HarnessSelect({
	value,
	repo,
	onChange,
}: {
	value: string;
	/** The target repo (draft.repo, else the primary project); null = none. */
	repo: string | null;
	onChange: (id: string) => void;
}) {
	const [rows, setRows] = useState<HarnessRow[]>([]);
	useEffect(() => {
		let on = true;
		void (listHarnessConfigs as ListFn)({ data: repo === null ? {} : { repoRoot: repo } })
			.then((s) => {
				if (!on) return;
				setRows(
					s.harnesses.map(({ id, scope, available, note }) => ({
						id, scope, available,
						...(note !== undefined ? { note } : {}),
					})),
				);
			})
			.catch(() => {
				if (on) setRows([]);
			});
		return () => {
			on = false;
		};
	}, [repo]);
	return (
		<label className="rc-field">
			<span>Harness:</span>
			<select className="rc-in" value={value} onChange={(e) => onChange(e.target.value)}>
				<option value="">native — flusk&rsquo;s own loop</option>
				{rows.map((h) => (
					<option key={h.id} value={h.id} disabled={!h.available} title={h.note}>
						{h.id} ({h.scope}){h.available ? "" : ` — ${h.note ?? "unavailable"}`}
					</option>
				))}
			</select>
		</label>
	);
}
