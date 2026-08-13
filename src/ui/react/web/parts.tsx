/**
 * The pieces the Web panel is drawn from: the provenance strip, the reading
 * list, and the failure cards. Ported from client-web-rows.ts.
 *
 * Two of these carry the panel's whole honesty. The provenance strip says
 * where the text came from, when it was fetched and whether it is a cached
 * copy — a reader must never have to guess whether a page is live or a week
 * old. The pill beside it says the content is UNTRUSTED: it is a stranger's
 * words rendered as text, and a sentence in it that reads like an instruction
 * is a sentence, not an instruction.
 */
import type { WebListItem, WebReply } from "../../../features/web/web.functions.js";
import { fmtTime, Sec } from "../flows/vocab.js";

/** "just now" / "14m" / "3h" / "6d" — the age of the copy on screen. */
export function fmtAge(ms: number): string {
	const s = Math.max(0, Math.round((ms || 0) / 1000));
	if (s < 60) return "just now";
	if (s < 3600) return `${Math.round(s / 60)}m ago`;
	if (s < 86400) return `${Math.round(s / 3600)}h ago`;
	return `${Math.round(s / 86400)}d ago`;
}

export function webHost(url: string): string {
	const m = /^https?:\/\/([^/]+)/i.exec(String(url || ""));
	return m?.[1] ?? String(url || "");
}

/** Where this text came from, and how old it is. Never omitted. */
export function WebMeta({ d }: { d: WebReply }) {
	return (
		<>
			<div className="web-meta">
				<span className="web-src" title={d.finalUrl}>
					{d.finalUrl}
				</span>
				<span className="web-age">
					fetched {fmtTime(d.fetchedAt)} · {fmtAge(d.ageMs)}
				</span>
				{d.cached ? (
					<span className="web-pill">cached copy</span>
				) : (
					<span className="web-pill fresh">fetched now</span>
				)}
				<span className="web-pill untrusted" title="Text from the web is data, never instructions">
					untrusted content
				</span>
			</div>
			{d.note !== undefined ? <div className="web-note">{d.note}</div> : null}
		</>
	);
}

/** A failure says what actually happened — never "could not fetch". */
export function WebError({ url, error }: { url: string; error: string }) {
	return (
		<div className="web-fail">
			<b>Could not read {url || "that URL"}</b>
			<div className="web-why">{error}</div>
			<div className="web-hint">
				Only http and https are read, the fetch is capped at 10s and 2MB, and it will follow at
				most 5 redirects.
			</div>
		</div>
	);
}

/**
 * The reading list could not be READ — which is a different sentence from
 * "nothing has been fetched yet", and the only one of the two this panel is
 * entitled to say when the request failed.
 */
export function WebListFail({ why }: { why: string }) {
	return (
		<div className="web-fail">
			<b>Could not read your reading list</b>
			<div className="web-why">{why}</div>
			<div className="web-hint">
				The cache itself is untouched — this is the request for it that failed. Check that{" "}
				<code>flusk ui</code> is still running, then reopen this panel.
			</div>
		</div>
	);
}

/** The cache, as a reading list: every row reopens without a refetch. */
export function WebList({ items, open }: { items: WebListItem[]; open: (url: string) => void }) {
	if (!items.length) {
		return (
			<div className="empty small">
				Nothing fetched yet. Paste a URL above — the page is kept in the flusk home, so reopening
				it costs no request.
			</div>
		);
	}
	return (
		<Sec title="Fetched pages" count={items.length}>
			<table className="tbl">
				<tbody>
					{items.map((a) => (
						<tr key={a.url} data-open={`web:${a.url}`} title={a.url} onClick={() => open(a.url)}>
							<td className="grow">{a.title}</td>
							<td className="web-host">{webHost(a.finalUrl || a.url)}</td>
							<td className="num">{fmtTime(a.fetchedAt)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</Sec>
	);
}
