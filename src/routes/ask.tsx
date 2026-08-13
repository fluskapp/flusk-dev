/**
 * /ask — Ask AI about what is on screen (window 0). An editor tab, not a
 * rail: the attached context is source, and it needs the editor's width. The
 * panel itself lives in src/ui/react/ask; the snapshot state survives leaving
 * the tab (ask-store.ts), which is the semantics this route must not break.
 */
import { createFileRoute } from "@tanstack/react-router";
import { AskPanel } from "../ui/react/ask/AskPanel.js";

export const Route = createFileRoute("/ask")({
	ssr: true,
	component: Page,
});

function Page() {
	return (
		<div id="ask" className="view">
			<AskPanel />
		</div>
	);
}
