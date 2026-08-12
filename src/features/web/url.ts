/**
 * The admission test every URL passes before a socket is opened — the one the
 * initial request goes through AND the one each redirect target goes through,
 * because a chain that starts at https://docs.example and ends at
 * file:///etc/passwd is exactly the trick this exists to stop.
 *
 * It answers with a sentence, never an exception: a refusal is something the
 * panel prints next to the box the user typed in.
 */
import { blockedHost } from "./address.js";
import { ALLOWED_PROTOCOLS, MAX_URL_LENGTH } from "./limits.js";

export type UrlCheck = { ok: true; url: URL } | { ok: false; error: string };

/**
 * "docs.example.com/guide" is what people paste, and it is not a URL. Only a
 * string with NO scheme at all is given https — anything that already names
 * one keeps it and meets the allowlist below, so this can never upgrade
 * file: or javascript: into something fetchable.
 */
function withScheme(text: string): string {
	return /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
}

export function checkUrl(raw: string, base?: string): UrlCheck {
	const text = String(raw ?? "").trim();
	if (text === "") return { ok: false, error: "no URL given" };
	if (text.length > MAX_URL_LENGTH) {
		return { ok: false, error: `URL is longer than ${MAX_URL_LENGTH} characters` };
	}
	let url: URL;
	try {
		url = new URL(base === undefined ? withScheme(text) : text, base);
	} catch {
		return { ok: false, error: `not a URL: ${text}` };
	}
	if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
		return {
			ok: false,
			error: `refusing "${url.protocol}" — the web panel reads ${ALLOWED_PROTOCOLS.join(" and ")} only`,
		};
	}
	const blocked = blockedHost(url.hostname);
	if (blocked !== null) {
		return { ok: false, error: `refusing ${url.hostname || "(no host)"}: ${blocked}` };
	}
	return { ok: true, url };
}
