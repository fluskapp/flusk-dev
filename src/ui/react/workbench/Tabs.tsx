/**
 * Editor tabs — a real (small) tab model, because an IDE without a tab strip
 * reads as a website. Visiting a detail route registers it; tabs persist for
 * the session; closing the active tab returns to its list. The strip renders
 * only when something is open, so list-only browsing stays clean.
 */
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useSyncExternalStore } from "react";
import { decodeRef, refKind } from "../runs/format.js";
import { Ic } from "../system/Icon.js";

/** A pathname may arrive with layered encoding (a stale pre-fix link was
 * encoded by the caller AND the router): decode until stable so refKind and
 * the leaf work on the real path, not %2F-joined text. */
function decodeFully(s: string): string {
	let cur = s;
	for (let i = 0; i < 4; i += 1) {
		const next = decodeRef(cur);
		if (next === cur) return cur;
		cur = next;
	}
	return cur;
}

export interface EditorTab {
	href: string;
	icon: string;
	title: string;
	/** Where its ✕ returns to. */
	backTo: string;
}

const KEY = "flusk-tabs";
let listeners: Array<() => void> = [];
const read = (): EditorTab[] => {
	try {
		return JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as EditorTab[];
	} catch {
		return [];
	}
};
// useSyncExternalStore compares snapshots by REFERENCE: returning a fresh
// parse every call is an infinite re-render (it was, minified React #185).
let cacheRaw = "";
let cacheVal: EditorTab[] = [];
const EMPTY: EditorTab[] = [];
const snapshot = (): EditorTab[] => {
	const raw = sessionStorage.getItem(KEY) ?? "[]";
	if (raw !== cacheRaw) {
		cacheRaw = raw;
		try {
			cacheVal = JSON.parse(raw) as EditorTab[];
		} catch {
			cacheVal = EMPTY;
		}
	}
	return cacheVal;
};
function write(tabs: EditorTab[]): void {
	sessionStorage.setItem(KEY, JSON.stringify(tabs.slice(-8)));
	for (const l of listeners) l();
}

/** Route → tab shape; null for list routes (they are windows, not documents). */
export function tabOf(path: string): EditorTab | null {
	const p = decodeFully(path);
	if (/^\/runs\/./.test(path)) {
		const ref = p.slice("/runs/".length);
		const leaf = ref.split("/").pop() ?? ref;
		// A journal keeps its file identity: the name minus the timestamp
		// prefix and .md — a tab must carry which run it holds, not "base.md".
		if (refKind(ref) === "journal" && leaf.endsWith(".md")) {
			const title = leaf.replace(/\.md$/, "").replace(/^\d{4}(-\d{2}){5}-/, "");
			return { href: path, icon: "run", title, backTo: "/runs" };
		}
		// A session file is "<iso-timestamp>-<shortid>.jsonl"; the id is the
		// only part a human recognizes, so the tab says "run <id>".
		const id =
			leaf
				.replace(/\.jsonl$/, "")
				.split("-")
				.pop() ?? leaf;
		return { href: path, icon: "run", title: `run ${id}`, backTo: "/runs" };
	}
	if (/^\/read\/./.test(path)) {
		return { href: path, icon: "book", title: p.split("/").pop() ?? p, backTo: "/docs" };
	}
	if (/^\/files\/./.test(path)) {
		return { href: path, icon: "file", title: p.split("/").pop() ?? p, backTo: "/find" };
	}
	if (/^\/projects\/./.test(path)) {
		return { href: path, icon: "project", title: p.split("/").pop() ?? p, backTo: "/" };
	}
	return null;
}

export function EditorTabs() {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const tabs = useSyncExternalStore(
		(cb) => {
			listeners.push(cb);
			return () => {
				listeners = listeners.filter((l) => l !== cb);
			};
		},
		snapshot,
		() => EMPTY,
	);
	useEffect(() => {
		const tab = tabOf(pathname);
		if (tab === null) return;
		const cur = read();
		if (cur.some((t) => t.href === tab.href)) return;
		write([...cur, tab]);
	}, [pathname]);
	if (tabs.length === 0) return null;
	return (
		<div id="tabs" role="tablist">
			{tabs.map((t) => {
				const active = t.href === pathname;
				return (
					<span
						key={t.href}
						className={`tab${active ? " on" : ""}`}
						role="tab"
						aria-selected={active}
					>
						<Link to={t.href} className="tab-link" title={decodeFully(t.href)}>
							<Ic name={t.icon} size={13} />
							<span className="sys-ellipsis">{t.title}</span>
						</Link>
						<button
							type="button"
							className="tab-x"
							title="Close"
							onClick={() => {
								write(read().filter((x) => x.href !== t.href));
								if (active)
									void navigate({ to: t.backTo, search: (prev: Record<string, unknown>) => prev });
							}}
						>
							<Ic name="close" size={12} />
						</button>
					</span>
				);
			})}
		</div>
	);
}
