/**
 * Transcript rendering for the run view — client-detail.ts as components:
 * the meta strip (sticky: the run's status stays while the log scrolls),
 * the items (TranscriptItem.tsx), and the stats line ("session in
 * progress…" until a stats entry exists).
 */
import { useEffect, useRef } from "react";
import type { SessionRun } from "../../../features/projects/runs.functions.js";
import { base, fmtCost, fmtTime } from "./format.js";
import { Item } from "./TranscriptItem.js";
import { Pill } from "./widgets.js";
import "./transcript.css";

export function Meta({ d, actions }: { d: SessionRun; actions: React.ReactNode }) {
	const h = d.header;
	return (
		<div id="meta">
			<span className="meta-item">
				<Pill status={d.status} />
			</span>
			<span className="meta-item">
				<b>{base(h.repoRoot)}</b>
				{h.gitBranch ? (
					<>
						{" "}
						<span className="dim">on</span> {h.gitBranch}
					</>
				) : null}
			</span>
			<span className="meta-item dim">{`${h.model.provider}/${h.model.id}`}</span>
			<span className="meta-item dim">#{h.id}</span>
			<span className="meta-item dim">{fmtTime(h.createdAt)}</span>
			<span className="meta-actions">{actions}</span>
		</div>
	);
}

/** One row of slack still counts as "at the end"; the row is the token's. */
function rowH(el: HTMLElement): number {
	return Number.parseFloat(getComputedStyle(el).getPropertyValue("--ij-row-h")) || 24;
}

/**
 * The legacy client-run rule: follow the log ONLY when the reader is already
 * at the end of it. A scrolled-up reader is reading — yanking the view to
 * the newest turn on a refresh would take the log out of their hands.
 */
function usePinnedToBottom(dep: number) {
	const ref = useRef<HTMLDivElement>(null);
	const pinned = useRef(false);
	useEffect(() => {
		const scroller = ref.current?.closest("#main");
		if (!(scroller instanceof HTMLElement)) return;
		const onScroll = () => {
			const slack = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
			pinned.current = slack < rowH(scroller);
		};
		onScroll();
		scroller.addEventListener("scroll", onScroll, { passive: true });
		return () => scroller.removeEventListener("scroll", onScroll);
	}, []);
	useEffect(() => {
		const scroller = ref.current?.closest("#main");
		if (pinned.current && scroller instanceof HTMLElement) {
			scroller.scrollTop = scroller.scrollHeight;
		}
	}, [dep]);
	return ref;
}

function Stats({ s }: { s: SessionRun["stats"] }) {
	if (s === null) return <div className="running-note">session in progress…</div>;
	return (
		<div className="stats">
			{s.turns} turns · {fmtCost(s.usage.costUsd)} · {s.usage.input} in / {s.usage.output} out
			tokens
		</div>
	);
}

export function Transcript({ d }: { d: SessionRun }) {
	const ref = usePinnedToBottom(d.items.length);
	return (
		<div id="transcript" ref={ref}>
			{d.items.map((it, i) => (
				// Transcript items are append-only, so the index is a stable key.
				<Item key={i} it={it} />
			))}
			<Stats s={d.stats} />
		</div>
	);
}
