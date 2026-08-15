/**
 * The status bar: what is indexed, what is running, which file the editor is
 * showing, and — right-aligned — background activity, home and version. The
 * counts live HERE, not in the toolbar, as the legacy renderStatus drew them;
 * hairline separators mark the widget groups the way the IDE's bar does.
 *
 * #status-path is the first .st-path on purpose: the views (WebWindow today)
 * address it as `#status .st-path` when the editor area changes what it shows.
 */
export function StatusBar({
	home,
	version,
	projects,
	live,
}: {
	home?: string;
	version?: string;
	projects?: number;
	live?: number;
}) {
	return (
		<footer id="status">
			<span id="status-cards" title="Projects flusk has indexed">
				{projects !== undefined ? `${projects} project${projects === 1 ? "" : "s"}` : ""}
			</span>
			<span aria-hidden className="st-sep" />
			<span id="status-live" className={live ? "st-live-on" : undefined} title="Runs in flight">
				{live ? `${live} live` : "idle"}
			</span>
			<span aria-hidden className="st-sep" />
			<span id="status-path" className="st-path" title="Current file" />
			<div className="spacer" />
			<span id="status-activity" />
			<span aria-hidden className="st-sep" />
			<span className="st-path" title="flusk home">{home ?? ""}</span>
			<span aria-hidden className="st-sep" />
			<span className="st-ver">flusk v{version ?? ""}</span>
		</footer>
	);
}
