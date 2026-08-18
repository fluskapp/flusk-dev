/**
 * The palette's two run-configuration entries: typed characters that match
 * "Run configuration…" or "Edit configurations…" surface a Commands section
 * above the history hits; both navigate to the `rc` dialog on the widget's
 * stored selection. The matching is pure (widget-model.ts) and tested there.
 */
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Ic } from "../system/Icon.js";
import { matchCommands, SELECTION_KEY } from "./widget-model.js";

export function CommandRows({ q, onClose }: { q: string; onClose: () => void }) {
	const navigate = useNavigate();
	const [stored, setStored] = useState<string | null>(null);
	useEffect(() => setStored(localStorage.getItem(SELECTION_KEY)), []);
	const cmds = matchCommands(q);
	if (cmds.length === 0) return null;
	return (
		<>
			<div className="pal-group">Commands</div>
			{cmds.map((c) => (
				<div
					key={c.label}
					className="pal-row"
					onClick={() => {
						onClose();
						void navigate({ to: ".", search: (p: Record<string, unknown>) => ({ ...p, rc: c.rc(stored) }) });
					}}
				>
					<Ic name="run" size={14} />
					<span className="pal-title">{c.label}</span>
				</div>
			))}
		</>
	);
}
