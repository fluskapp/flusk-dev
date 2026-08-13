/**
 * The shortcut sheet, rendered. The rows themselves live in help-groups.ts —
 * this file only turns them into the overlay. Every row is a literal, never
 * user data. Shaped like an IntelliJ popup — a header strip over one
 * scrolling body — so the title stays put while a long sheet scrolls under it.
 */
import { HELP_GROUPS, type HelpGroup } from "./help-groups.js";

function Group({ g }: { g: HelpGroup }) {
	return (
		<div className="help-group" id={g.id}>
			<h4>{g.title}</h4>
			<div className="keys">
				{g.rows.map(([k, v], i) => (
					<span key={i} style={{ display: "contents" }}>
						<kbd>{k}</kbd>
						<span>{v}</span>
					</span>
				))}
			</div>
		</div>
	);
}

export function HelpSheet({ onClose }: { onClose: () => void }) {
	return (
		<div id="help" className="overlay" onClick={onClose}>
			{/* "Esc or click to close": any click closes, as the sheet promises. */}
			<div className="help-card">
				<div className="popup-head">
					<h3>Shortcuts</h3>
					<span className="spacer" />
					<span className="dim small">Esc or click to close</span>
				</div>
				<div className="help-body">
					<div className="help-groups">
						{HELP_GROUPS.map((g) => (
							<Group key={g.id} g={g} />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
