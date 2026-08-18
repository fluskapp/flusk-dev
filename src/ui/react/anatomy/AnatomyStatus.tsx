/**
 * The report's machine-and-state sections: which agent CLIs this machine
 * offers (unavailable rows stay visible with their reason — never hidden),
 * what the extension scan found, the honest MCP stub (H0 D5: no runtime
 * exists), and whether the fact store is on.
 */
import type { AnatomyReport } from "../../../features/anatomy/anatomy.types.js";
import { Line, Sec } from "../runs/widgets.js";

export function BackendsSec({ backends }: { backends: AnatomyReport["backends"] }) {
	return (
		<Sec title="Backends detected" count={backends.length}>
			<table className="tbl">
				<tbody>
					{backends.map((b) => (
						<tr key={b.id}>
							<td>{b.label}</td>
							<td className="mono">{b.id}</td>
							<td>
								<span className={`sys-pill ${b.available ? "ok" : "dim"}`}>
									{b.available ? "available" : "unavailable"}
								</span>
							</td>
							<td className="grow dim">{b.note ?? ""}</td>
						</tr>
					))}
				</tbody>
			</table>
		</Sec>
	);
}

export function ExtensionsSec({ ext }: { ext: AnatomyReport["extensions"] }) {
	return (
		<Sec title="Extensions" count={ext?.count ?? null}>
			{ext === null ? (
				<Line>none loaded — no extension files in ~/.flusk/extensions or .flusk/extensions</Line>
			) : (
				<Line>
					{ext.count} extension file{ext.count === 1 ? "" : "s"} discovered
					<span className="dim">
						{" "}
						— not executed by this window; what they register appears on a run
					</span>
				</Line>
			)}
		</Sec>
	);
}

export function McpSec() {
	return (
		<Sec title="MCP">
			<Line>
				No MCP runtime — the profile advisor can write config blocks for external harnesses
				(<span className="mono">src/features/profile/catalog.ts</span>), flusk does not speak MCP
				yet.
			</Line>
		</Sec>
	);
}

export function MemorySec({ enabled, ns }: { enabled: boolean; ns: string }) {
	return (
		<Sec title="Memory">
			{enabled ? (
				<Line>
					fact store on — namespace <span className="mono">{ns}</span>
				</Line>
			) : (
				<Line>fact store off — runs record nothing</Line>
			)}
		</Sec>
	);
}
