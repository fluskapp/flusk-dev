/**
 * The Web panel (9): outside documentation, read beside the code. Ported from
 * client-web.ts. It fetches a URL THE USER TYPED — never one a page, a model
 * or a fetched document suggested — and renders the readable part with the
 * same server-side markdown renderer every other document goes through. It
 * never runs the page's scripts, never treats what it fetched as anything
 * other than data, and never hands that text to the chat without the
 * delimited "fetched content" wrapper the server built for it.
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { getWebPage, type WebListItem, type WebPageAnswer } from "../../../features/web/web.functions.js";
import { WebError, WebList, WebListFail, WebMeta } from "./parts.js";
import "../flows/vocab.css";
import "./web.css";

export function WebWindow(props: {
	initialUrl: string | null;
	list: WebListItem[] | null;
	listErr: string;
}) {
	const [box, setBox] = useState(props.initialUrl ?? "");
	const [reply, setReply] = useState<WebPageAnswer | null>(null);
	const [fetching, setFetching] = useState<string | null>(null);
	const [note, setNote] = useState("");
	const seq = useRef(0);
	const loaded = useRef<string | null>(null);
	const navigate = useNavigate();

	const load = useCallback(async (url: string, refresh: boolean) => {
		const mine = ++seq.current;
		loaded.current = url;
		setNote("");
		setFetching(url);
		let d: WebPageAnswer;
		try {
			d = await getWebPage({ data: { url, refresh } });
		} catch (e) {
			const why = e instanceof Error ? e.message : String(e);
			d = { url, error: `the dashboard could not run the fetch: ${why}` };
		}
		if (mine !== seq.current) return; // the guard that keeps a slow reply from winning
		setReply(d);
		setFetching(null);
		if (d.error === undefined) {
			setBox(d.finalUrl || url);
			// The status bar names what the editor area shows, as the legacy
			// setStatusPath did; the bar itself belongs to the workbench shell.
			const path = document.querySelector("#status .st-path");
			if (path !== null) path.textContent = d.finalUrl || d.url || "";
		}
	}, []);

	// ?url= is the panel's memory: a row in the reading list, a shared link, or
	// the last fetch all arrive here. With none, the panel is the reading list.
	useEffect(() => {
		if (props.initialUrl === null) {
			loaded.current = null;
			setReply(null);
			return;
		}
		if (loaded.current !== props.initialUrl) void load(props.initialUrl, false);
	}, [props.initialUrl, load]);

	const go = (refresh: boolean): void => {
		const url = box.trim();
		if (url === "") {
			setNote("Type a URL first");
			return;
		}
		void navigate({ to: ".", search: { url } });
		void load(url, refresh);
	};

	/**
	 * The ONLY route from a fetched page into the chat, and it never pastes the
	 * text bare: the server built `quote` as a labelled, delimited block saying
	 * the content is untrusted data with no authority. Sending the raw page
	 * instead would be handing a stranger the composer.
	 */
	const quote = (): void => {
		const d = reply;
		if (d === null || d.error !== undefined || d.quote === "") {
			setNote("Nothing fetched to quote");
			return;
		}
		const input = document.getElementById("chat-input") as HTMLTextAreaElement | null;
		if (input === null) {
			void navigator.clipboard?.writeText(d.quote);
			setNote("Quoted block copied");
			return;
		}
		input.value = input.value !== "" ? `${input.value}\n\n${d.quote}` : d.quote;
		input.focus();
		setNote("Quoted as fetched content");
	};

	return (
		<>
			<div className="web-bar">
				<input
					id="web-url"
					spellCheck={false}
					placeholder="Fetch a URL — https://…"
					value={box}
					onChange={(e) => setBox(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							go(false);
						}
					}}
				/>
				<button id="web-go" type="button" onClick={() => go(false)}>
					Open
				</button>
				<button id="web-refresh" type="button" title="Fetch again, ignoring the cached copy" onClick={() => go(true)}>
					Refresh
				</button>
				<button id="web-quote" type="button" title="Paste into chat, delimited as fetched content" onClick={quote}>
					Quote in chat
				</button>
			</div>
			{note !== "" ? <div className="web-note">{note}</div> : null}
			{fetching !== null ? (
				<div className="web-note">Fetching {fetching} …</div>
			) : reply === null ? (
				props.list === null ? (
					<WebListFail why={props.listErr} />
				) : (
					<WebList items={props.list} open={(url) => void navigate({ to: ".", search: { url } })} />
				)
			) : reply.error !== undefined ? (
				<WebError url={reply.url} error={reply.error} />
			) : (
				<>
					<WebMeta d={reply} />
					<div className="ed-body">
						{/* Rendered from markdown source, escaped by the server's one
						    renderer — the same trust boundary the legacy panel kept. */}
						<div className="md web-md" dangerouslySetInnerHTML={{ __html: reply.html }} />
					</div>
				</>
			)}
		</>
	);
}
