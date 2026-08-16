/**
 * The main toolbar, WebStorm's anatomy: identity on the left (logo, the
 * project chip, the live-work widget), actions on the right (search /
 * palette). Window switching lives in the RAIL now — this bar is context,
 * not navigation.
 */
import { Link } from "@tanstack/react-router";
import { Ic } from "../system/Icon.js";

export function MainToolbar({
	projects,
	live,
	home,
}: {
	projects?: number;
	live?: number;
	home?: string;
}) {
	return (
		<header id="toolbar">
			<div className="logo" title={home}>
				<Ic name="bot" size={14} /> flusk
			</div>
			<Link to="/" search={(prev: Record<string, unknown>) => prev} className="tb-chip" title="Attention — what needs me (o)">
				<Ic name="project" size={14} />
				{projects !== undefined ? `${projects} projects` : "projects"}
				<span className="tb-caret">▾</span>
			</Link>
			{live !== undefined && live > 0 ? (
				<Link to="/runs" search={(prev: Record<string, unknown>) => prev} className="tb-chip live" title="Runs in flight">
					<span className="sys-live" /> {live} live
				</Link>
			) : null}
			<div className="spacer" />
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
