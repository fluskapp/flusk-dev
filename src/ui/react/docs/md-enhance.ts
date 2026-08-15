/**
 * Progressive enhancement of the server-rendered markdown island: heading
 * anchors and code-block copy buttons. DOM surgery, not React — the island
 * is dangerouslySetInnerHTML output React never re-renders into, which is
 * exactly why writing into it is safe (CodeViewer makes the same argument
 * for its selection marks). Both wires are idempotent: re-running over an
 * already-enhanced island adds nothing twice.
 */
import { type RefObject, useEffect } from "react";

/** GitHub's slug rule, near enough: lowercase, punctuation out, spaces to dashes. */
function slug(text: string, taken: Set<string>): string {
	const base =
		text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-") || "section";
	let id = base;
	for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
	taken.add(id);
	return id;
}

function wireAnchors(host: HTMLElement): void {
	const taken = new Set<string>();
	for (const h of host.querySelectorAll<HTMLElement>(".md h1, .md h2, .md h3, .md h4")) {
		if (h.querySelector(".h-anchor") !== null) continue;
		if (h.id === "") h.id = slug(h.textContent ?? "", taken);
		const a = document.createElement("a");
		a.className = "h-anchor";
		a.href = `#${h.id}`;
		a.textContent = "#";
		a.setAttribute("aria-label", `Link to "${h.textContent ?? ""}"`);
		h.append(a);
	}
}

function wireCopy(host: HTMLElement): void {
	for (const pre of host.querySelectorAll<HTMLElement>(".md pre.code")) {
		if (pre.querySelector(".code-copy") !== null) continue;
		// Captured BEFORE the button joins the tree: afterwards textContent
		// would copy the button's own label along with the code.
		const text = pre.textContent ?? "";
		const b = document.createElement("button");
		b.type = "button";
		b.className = "code-copy";
		b.textContent = "Copy";
		b.addEventListener("click", () => {
			void navigator.clipboard?.writeText(text).catch(() => {});
			b.textContent = "Copied";
			setTimeout(() => {
				b.textContent = "Copy";
			}, 1500);
		});
		pre.append(b);
	}
}

/** Re-runs whenever the island is replaced (mode switch, new document). */
export function useMdEnhance(ref: RefObject<HTMLElement | null>, deps: unknown[]): void {
	// eslint-disable-next-line react-hooks/exhaustive-deps -- keyed to the island's content
	useEffect(() => {
		if (ref.current !== null) {
			wireAnchors(ref.current);
			wireCopy(ref.current);
		}
	}, deps);
}
