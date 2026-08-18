/**
 * The one theme toggle, shared by the rail button and the `t` shortcut.
 *
 * The `data-theme` attribute carries a CHOICE, not the current look: with no
 * stored preference it is unset while tokens.css is already painting the OS's
 * dark palette through prefers-color-scheme. Flipping off the attribute alone
 * therefore set data-theme="dark" on a dark screen — a visual no-op, and the
 * control read as broken until you pressed it twice. Resolve what is actually
 * on screen first, then flip from that.
 */

export type Theme = "light" | "dark";

/** What the viewer is looking at right now: the stored choice, else the OS. */
export function effectiveTheme(el: HTMLElement = document.documentElement): Theme {
	const chosen = el.getAttribute("data-theme");
	if (chosen === "dark" || chosen === "light") return chosen;
	const media =
		typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
	return media?.matches === true ? "dark" : "light";
}

/** Flip, paint, remember — the first press always changes something. */
export function toggleTheme(el: HTMLElement = document.documentElement): Theme {
	const next: Theme = effectiveTheme(el) === "dark" ? "light" : "dark";
	el.setAttribute("data-theme", next);
	try {
		localStorage.setItem("flusk-theme", next);
	} catch {
		/* private mode: themed for this session only (client-md.ts:25 precedent) */
	}
	return next;
}
