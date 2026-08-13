/**
 * The /doc route's presentation: the same docked window vocabulary, filling
 * the editor area instead of the rail. The lookup itself runs from an effect
 * — the LSP warms for seconds and holds hundreds of MB, so it must NEVER run
 * on the SSR path (the route is ssr:'data-only' for the same reason).
 */
import { useEffect } from "react";
import { lookupSymbol } from "../../../features/docs/lsp.functions.js";
import { DocBody } from "./DocBody.js";
import { useDocLookup } from "./use-doc.js";
import "./doc.css";

export function DocLookupView({ path, sym }: { path?: string; sym?: string }) {
	const { state, show, wait } = useDocLookup();

	useEffect(() => {
		if (path === undefined || path === "") {
			show({
				doc: null,
				related: null,
				note: "name a file: /doc?path=<indexed file>&sym=<line>:<col> (or sym=<name>)",
				file: "",
			});
			return;
		}
		let alive = true;
		wait(path);
		void lookupSymbol({ data: { path, sym } }).then(
			(reply) => {
				if (alive) show({ ...reply, file: path });
			},
			(e: unknown) => {
				if (!alive) return;
				const note = `lookup failed: ${e instanceof Error ? e.message : String(e)}`;
				show({ doc: null, related: null, note, file: path });
			},
		);
		return () => {
			alive = false;
		};
	}, [path, sym, show]);

	const doc = state.payload?.doc ?? null;
	return (
		<section className="docwin-page">
			<div className="tw-head">
				<span className="tw-num">6</span>
				<span>Documentation</span>
				<span className="spacer" />
				<span className={doc !== null ? "dw-badge on" : "dw-badge"} title="Which engine answered">
					{doc !== null ? doc.provider : "none"}
				</span>
			</div>
			<div className="dw-sym">
				{doc !== null ? (
					<>
						<span className="dw-name">{doc.name}</span>
						<span className="dw-kind">{doc.kind}</span>
					</>
				) : null}
			</div>
			<div className="docwin-page-body">
				<DocBody state={state} />
			</div>
		</section>
	);
}
