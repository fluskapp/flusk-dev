/**
 * The small HTML builders the legacy client-core.ts wrote every view in —
 * pill, section, empty line — as components, plus the shared toast.
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { statusClass } from "./format.js";
import "./widgets.css";

type Patch = Record<string, unknown>;

/** Patch the /runs search params in place — the feed's filter and sort
 * live in the URL, so every narrowed view is a link. */
export function useOpenSearch() {
	const navigate = useNavigate();
	return (patch: Patch) => navigate({ to: "/runs", search: (prev: Patch) => ({ ...prev, ...patch }) });
}

/** A project name that narrows to that project, without opening the row
 * it sits in — the stopPropagation is the point. */
export function ProjectCell({ name }: { name: string }) {
	const navigate = useNavigate();
	return (
		<span
			className="ev"
			onClick={(e) => {
				e.stopPropagation();
				navigate({ to: "/projects/$project", params: { project: name }, search: (prev: Patch) => prev });
			}}
		>
			{name}
		</span>
	);
}

/** The feed's masthead: which slice of the feed this is, the one action
 * that widens it again (client-runs.ts runFilterBar), and — as children —
 * the kind segment, kept at the row's far edge by .head-seg. */
export function FilterBar({
	project,
	sort,
	children,
}: {
	project?: string;
	sort?: string;
	children?: React.ReactNode;
}) {
	const open = useOpenSearch();
	const [title, action] =
		sort !== undefined
			? [
					`Runs by ${sort.split(".")[0]}`,
					<span className="ev" onClick={() => open({ sort: undefined })}>
						show newest first
					</span>,
				]
			: project === undefined
				? ["All runs", <span className="dim">every project · newest first</span>]
				: [
						`${project} runs`,
						<span className="ev" onClick={() => open({ project: undefined })}>
							show all projects
						</span>,
					];
	return (
		<div className="head-row">
			<h2>{title}</h2>
			{action}
			{children}
		</div>
	);
}

/** Badge.*: a filled plate in the status colour (styles-transcript.ts). */
export function Pill({ status }: { status?: string }) {
	return <span className={`pill ${statusClass(status)}`}>{status ?? "unknown"}</span>;
}

/** IntelliJ's group header: a small uppercase label on a separator. */
export function Sec({
	title,
	count,
	children,
}: {
	title: string;
	count?: number | null;
	children: React.ReactNode;
}) {
	return (
		<section className="sec">
			<h3>
				{title}
				{count === undefined || count === null ? null : <span className="count">{count}</span>}
			</h3>
			{children}
		</section>
	);
}

/** An empty state exactly one row tall — what a table with no rows takes. */
export function Line({ children }: { children: React.ReactNode }) {
	return <div className="line">{children}</div>;
}

/**
 * The notification balloon. Component-local rather than a global #toast node:
 * the React chrome owns <body>, so each window that toasts renders its own.
 */
export function useToast(): [React.ReactNode, (msg: string) => void] {
	const [msg, setMsg] = useState<string | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const show = useCallback((m: string) => {
		setMsg(m);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setMsg(null), 1800);
	}, []);
	return [msg === null ? null : <div id="toast">{msg}</div>, show];
}

export async function copyText(text: string, toast: (m: string) => void, label?: string) {
	try {
		await navigator.clipboard.writeText(text);
		toast(label ?? "Copied");
	} catch {
		toast("Copy failed");
	}
}
