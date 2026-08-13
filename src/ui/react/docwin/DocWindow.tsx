/**
 * Tool window 6: Documentation — quick docs fused with your own history,
 * docked and PINNED: it follows the symbol instead of vanishing on the next
 * keystroke. Ported from client-doc.ts; sections in DocBody.tsx.
 *
 * The lookup arrives as a DOM CustomEvent "flusk:symbol" whose detail names
 * {file, line, col} — the hand-off the code viewer makes on every identifier
 * click, kept as an event so either half ships without the other.
 */
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { DocBody } from "./DocBody.js";
import { useDocLookup } from "./use-doc.js";
import "./doc.css";

interface SymbolDetail {
	file?: string;
	line?: number;
	col?: number;
}

export function DocWindow() {
	const navigate = useNavigate();
	const { state, lookup } = useDocLookup();

	useEffect(() => {
		const onSymbol = (e: Event): void => {
			const d = (e as CustomEvent<SymbolDetail | null>).detail;
			if (d === null || d === undefined || typeof d.file !== "string" || d.file === "") return;
			lookup(d.file, typeof d.line === "number" ? d.line : 1, typeof d.col === "number" ? d.col : 1);
		};
		document.addEventListener("flusk:symbol", onSymbol);
		return () => document.removeEventListener("flusk:symbol", onSymbol);
	}, [lookup]);

	const hide = (): void => {
		void navigate({
			to: ".",
			search: (prev: Record<string, unknown>) => ({ ...prev, doc: false }),
		});
	};

	const doc = state.payload?.doc ?? null;
	return (
		<section id="docwin">
			<div className="tw-head">
				<span className="tw-num">6</span>
				<span>Documentation</span>
				<span className="spacer" />
				{/* Which engine answered — the reason a thin panel is thin. */}
				<span id="doc-provider" className={doc !== null ? "dw-badge on" : "dw-badge"} title="Which engine answered">
					{doc !== null ? doc.provider : "none"}
				</span>
				<button id="doc-hide" type="button" title="Hide Documentation (F1 / ⌘7)" onClick={hide}>
					✕
				</button>
			</div>
			<div id="doc-sym" className="dw-sym">
				{doc !== null ? (
					<>
						<span className="dw-name">{doc.name}</span>
						<span className="dw-kind">{doc.kind}</span>
					</>
				) : null}
			</div>
			<div id="doc-body">
				<DocBody state={state} />
			</div>
		</section>
	);
}
