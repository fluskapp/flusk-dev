/**
 * The stat tile — one component for every counter row (docs/design-system.md:
 * one control vocabulary). The Overview and the project page both speak it;
 * the look is the flat .stats-row separator grid in tile.css.
 */
import "./tile.css";

export function Tile({
	value,
	label,
	hint,
	open,
}: {
	value: string;
	label: string;
	hint?: string;
	open?: () => void;
}) {
	// The accent styling is the promise that a tile leads somewhere; a tile
	// with no "open" gets neither, so nothing looks clickable and inert.
	return (
		<div className="stat" {...(open !== undefined ? { "data-open": "1", onClick: open } : {})}>
			<div className={`stat-v${open !== undefined ? " ev" : ""}`}>{value}</div>
			<div className="stat-l">{label}</div>
			{hint !== undefined ? <div className="stat-h">{hint}</div> : null}
		</div>
	);
}
