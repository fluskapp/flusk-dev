/**
 * The resolved-config view: the LAYERED effective config with per-key
 * provenance — which file won each key, what was refused from the untrusted
 * repo layer, and where the layers themselves stand (absent/malformed). The
 * "--dump-config" answer, replacing the raw JSON blob.
 */
import { useEffect, useState } from "react";
import {
	type ConfigResolvedReply,
	getConfigResolved,
	type ResolvedConfig,
	type ResolvedKey,
} from "../../../features/projects/config-resolved.functions.js";
import { SkelOutline } from "../runs/skeleton.js";
import { Line, Sec } from "../runs/widgets.js";

type Fn<D, R> = (a: { data: D }) => Promise<R>;

const call = getConfigResolved as Fn<{ name: string }, ConfigResolvedReply | null>;

const VALUE_MAX = 120;

const STRIPPED_TITLE =
	"the repo layer supplied a value and the trust rule refused it — showing the surviving value";

/** Never silently drop: the ellipsized cell keeps the full value in title=. */
const shown = (v: unknown): { text: string; full: string } => {
	const full = JSON.stringify(v) ?? "undefined";
	return { text: full.length > VALUE_MAX ? `${full.slice(0, VALUE_MAX)}…` : full, full };
};

function KeyRow({ k }: { k: ResolvedKey }) {
	const v = shown(k.value);
	return (
		<tr {...(k.origin === "stripped" ? { title: STRIPPED_TITLE } : {})}>
			<td className="mono">{k.path.split(".")[1] ?? k.path}</td>
			<td className="mono grow" title={v.full}>
				{v.text}
			</td>
			<td>
				<span className={`chip prov ${k.origin}`}>{k.origin}</span>
			</td>
		</tr>
	);
}

function LayerStrip({ r, workbenchNotes }: { r: ResolvedConfig; workbenchNotes: string[] }) {
	const notes = [...r.notes, ...workbenchNotes];
	return (
		<div className="cfg-layers">
			{r.layers.map((l) => (
				<div key={l.scope} className={`cfg-layer${l.state === "read" ? "" : " warn"}`}>
					<span className="chip">{l.scope}</span>
					<span className="mono cfg-path" title={l.path}>
						{l.path}
					</span>
					<span className="dim">
						{l.state === "malformed" ? (l.error ?? "malformed") : l.state}
					</span>
				</div>
			))}
			{r.envHome !== null ? (
				<div className="cfg-layer">
					<span className="chip">env</span>
					<span className="mono cfg-path">FLUSK_HOME={r.envHome}</span>
					<span className="dim">relocates the home layer</span>
				</div>
			) : null}
			{notes.map((n) => (
				<div key={n} className="cfg-layer warn mono">
					{n}
				</div>
			))}
		</div>
	);
}

/** Two-level paths group under their section, the Sec-header idiom. */
function sections(keys: ResolvedKey[]): Array<[string, ResolvedKey[]]> {
	const bySec = new Map<string, ResolvedKey[]>();
	for (const k of keys) {
		const sec = k.path.split(".")[0] ?? k.path;
		bySec.set(sec, [...(bySec.get(sec) ?? []), k]);
	}
	return [...bySec.entries()];
}

export function ConfigResolved({ name }: { name: string }) {
	const [reply, setReply] = useState<ConfigResolvedReply | null | undefined>(undefined);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		let alive = true;
		call({ data: { name } })
			.then((r) => {
				if (alive) setReply(r);
			})
			.catch((e: unknown) => {
				if (alive) setError(e instanceof Error ? e.message : String(e));
			});
		return () => {
			alive = false;
		};
	}, [name]);
	if (error !== null) return <Line>Config could not be resolved: {error}</Line>;
	// Loading is a density-matched skeleton (design-system.md), not prose: a
	// bare "resolving config…" under the tables reads as a stall, not as work.
	if (reply === undefined) return <SkelOutline rows={6} />;
	if (reply === null) return <Line>Not a configured project root — nothing to resolve.</Line>;
	return (
		<>
			<LayerStrip r={reply.resolved} workbenchNotes={reply.workbenchNotes} />
			{sections(reply.resolved.keys).map(([sec, keys]) => (
				<Sec key={sec} title={sec} count={null}>
					<table className="tbl">
						<tbody>
							{keys.map((k) => (
								<KeyRow key={k.path} k={k} />
							))}
						</tbody>
					</table>
				</Sec>
			))}
		</>
	);
}
