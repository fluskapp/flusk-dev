/** The status bar: index counts, live runs, current path, home, version. */
export function StatusBar({ home, version }: { home?: string; version?: string }) {
	return (
		<footer id="status">
			<span id="status-cards" title="Runs, sessions and documents flusk has indexed" />
			<span id="status-live" title="Runs in flight" />
			<span id="status-path" className="st-path" title="Current file" />
			<div className="spacer" />
			<span id="status-activity" />
			<span className="st-path">{home ?? ""}</span>
			<span>flusk v{version ?? ""}</span>
		</footer>
	);
}
