/**
 * WHO answers, in the chat header: agents and raw backends in one list,
 * because the user is choosing who answers, not which subsystem it came from.
 * Migrated from Ask's WhoPicker when the two surfaces merged. The element
 * keeps the #chat-backend id — it is the combo the stylesheet dresses.
 */
import { AT, repaint, WHO_KEY } from "./attach-store.js";
import { whoEmptyLabel, whoOptionLabel } from "./attach-who.js";

export function ChatWho() {
	const of = (kind: "agent" | "backend") => AT.answerers.filter((a) => a.kind === kind);
	const group = (title: string, rows: typeof AT.answerers) =>
		rows.length === 0 ? null : (
			<optgroup label={title}>
				{rows.map((a) => (
					<option key={a.id} value={a.id} disabled={!a.available}>
						{whoOptionLabel(a)}
					</option>
				))}
			</optgroup>
		);
	return (
		<select
			id="chat-backend"
			title="Who answers"
			value={AT.who}
			onChange={(e) => {
				AT.who = e.target.value;
				try {
					localStorage.setItem(WHO_KEY, AT.who);
				} catch {
					/* private mode */
				}
				// A full repaint: the agent's own prompt is part of the strip.
				repaint();
			}}
		>
			{AT.answerers.length === 0 ? (
				// Not-yet-loaded is NOT "none exists" — the legacy rule ("A FAILED
				// REQUEST IS NOT AN EMPTY LIST") extended to the loading state.
				<option value="">{whoEmptyLabel(AT.whoLoaded, AT.whoErr)}</option>
			) : (
				<>
					{group("Agents", of("agent"))}
					{group("Backends", of("backend"))}
				</>
			)}
		</select>
	);
}
