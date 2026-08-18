/**
 * The main toolbar, WebStorm's anatomy: identity on the left (logo, the
 * Attention chip, the live-work widget), actions on the right (search /
 * palette). Window switching lives in the RAIL now — this bar is context,
 * not navigation.
 *
 * It states no counts: "N projects / N live" is the STATUS BAR's job and it
 * draws them twenty-two pixels below. A bar that repeats the other bar's
 * facts reads as a website header, and a chip labelled "13 projects" that
 * opens a dashboard promises a picker it does not have.
 */
import { Link } from "@tanstack/react-router";
import { RunnerWidget } from "../runconfig/RunnerWidget.js";
import { Ic } from "../system/Icon.js";

export function MainToolbar({ home }: { home?: string }) {
	return (
		<header id="toolbar">
			<div className="logo" title={home}>
				<Ic name="bot" size={14} /> flusk
			</div>
			{/* No ▾: the chip is a link to Attention, not a picker — a caret
			    would promise a popup it does not have. */}
			<Link
				to="/"
				search={(prev: Record<string, unknown>) => prev}
				className="tb-chip"
				title="Attention — what needs me (o)"
				activeProps={{ className: "on" }}
				activeOptions={{ exact: true }}
			>
				<Ic name="warn" size={14} />
				Attention
			</Link>
			<div className="spacer" />
			<RunnerWidget />
			<button
				type="button"
				className="sys-btn icon bare"
				title="Go to file (⌘⇧O)"
				onClick={() =>
					document.dispatchEvent(
						new KeyboardEvent("keydown", { key: "o", metaKey: true, shiftKey: true }),
					)
				}
			>
				<Ic name="find" size={14} />
			</button>
		</header>
	);
}
