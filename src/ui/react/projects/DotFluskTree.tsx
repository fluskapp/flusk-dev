/**
 * The `.flusk` tree in the Config window: what this repo commits about how it
 * is worked on, one row per file, each a link into the /files/$ viewer (the
 * splat route restores the leading slash, so rows carry the absolute path).
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	getConfigResolved,
	type ConfigResolvedReply,
	type DotFluskEntry,
} from "../../../features/projects/config-resolved.functions.js";
import { Line, Sec } from "../runs/widgets.js";

type Fn<D, R> = (a: { data: D }) => Promise<R>;
type Prev = Record<string, unknown>;

const call = getConfigResolved as Fn<{ name: string }, ConfigResolvedReply | null>;

function Row({ e }: { e: DotFluskEntry }) {
	return (
		<tr>
			<td className="mono grow">
				<Link className="ev" to="/files/$" params={{ _splat: e.abs }} search={(p: Prev) => p} title={e.abs}>
					{e.rel}
				</Link>
			</td>
			<td>
				<span className="chip">{e.kind}</span>
			</td>
			<td className="num">{e.size}</td>
		</tr>
	);
}

export function DotFluskTree({ name }: { name: string }) {
	const [tree, setTree] = useState<DotFluskEntry[] | null>(null);
	useEffect(() => {
		let alive = true;
		call({ data: { name } })
			.then((r) => {
				if (alive) setTree(r?.tree ?? []);
			})
			.catch(() => {
				if (alive) setTree([]);
			});
		return () => {
			alive = false;
		};
	}, [name]);
	if (tree === null) return null;
	if (tree.length === 0) {
		return (
			<Sec title=".flusk" count={null}>
				<Line>
					no .flusk directory — this repo runs on defaults
					<span className="dim cfg-hint">see docs/dot-flusk.md for the anatomy</span>
				</Line>
			</Sec>
		);
	}
	return (
		<Sec title=".flusk" count={tree.length}>
			<table className="tbl">
				<tbody>
					{tree.map((e) => (
						<Row key={e.rel} e={e} />
					))}
				</tbody>
			</table>
		</Sec>
	);
}
