/**
 * The small HTML builders the legacy client-core.ts wrote every view in —
 * pill, section, empty line — as components, plus the shared toast.
 */
import { useCallback, useRef, useState } from "react";
import { statusClass } from "./format.js";
import "./widgets.css";

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
