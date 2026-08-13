/**
 * The Documentation window's state: the symbol on screen, the in-flight
 * lookup, and the sequence guarding both — a slow first lookup must never
 * repaint over the symbol you clicked second (client-doc.ts D.seq, ported).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
	lookupDoc,
	renderText,
	type DocReply,
	type SymbolDoc,
} from "../../../features/docs/lsp.functions.js";

export const base = (p: string): string => p.split("/").pop() ?? p;
export const ext = (p: string): string => {
	const b = base(p);
	const i = b.lastIndexOf(".");
	return i === -1 ? "" : b.slice(i + 1);
};

/** The panel's payload: the server's reply plus the file it was asked about. */
export type DocPayload = DocReply & { file: string };

export interface DocState {
	payload: DocPayload | null;
	/** The file a lookup is out for: the first symbol waits for the index. */
	busy: string;
}

export interface DocApi {
	state: DocState;
	lookup: (file: string, line: number, col: number) => void;
	show: (payload: DocPayload) => void;
	/** A lookup is out somewhere else (the /doc route drives lookupSymbol itself). */
	wait: (file: string) => void;
}

export function useDocLookup(): DocApi {
	const [state, setState] = useState<DocState>({ payload: null, busy: "" });
	const seq = useRef(0);
	const lookup = useCallback((file: string, line: number, col: number) => {
		const mine = ++seq.current;
		setState({ payload: null, busy: file });
		void lookupDoc({ data: { file, line, col } }).then(
			(reply) => {
				if (seq.current !== mine) return;
				setState({ payload: { ...reply, file }, busy: "" });
			},
			(e: unknown) => {
				if (seq.current !== mine) return;
				const note = `lookup failed: ${e instanceof Error ? e.message : String(e)}`;
				setState({ payload: { doc: null, related: null, note, file }, busy: "" });
			},
		);
	}, []);
	const show = useCallback((payload: DocPayload) => {
		++seq.current;
		setState({ payload, busy: "" });
	}, []);
	const wait = useCallback((file: string) => {
		++seq.current;
		setState({ payload: null, busy: file });
	}, []);
	return { state, lookup, show, wait };
}

/**
 * The two rendered blocks, from the server's one renderer. The signature
 * starts as escaped text (DocBody renders the plain fallback), so a failed
 * render degrades to plain source rather than to nothing.
 */
export function useDocRendered(
	doc: SymbolDoc | null,
	file: string,
): { sig: string; prose: string } | null {
	const [out, setOut] = useState<{ sig: string; prose: string } | null>(null);
	const seq = useRef(0);
	useEffect(() => {
		setOut(null);
		if (doc === null) return;
		const mine = ++seq.current;
		const lang = ext(file !== "" ? file : (doc.defined?.file ?? "")) || "ts";
		void (async () => {
			const sig = await renderText({ data: { text: doc.signature, lang } }).then(
				(r) => r.html,
				() => "",
			);
			const prose =
				doc.docs === ""
					? ""
					: await renderText({ data: { text: doc.docs, lang: "md" } }).then(
							(r) => r.html,
							() => "",
						);
			if (seq.current !== mine) return;
			setOut({ sig, prose });
		})();
	}, [doc, file]);
	return out;
}
