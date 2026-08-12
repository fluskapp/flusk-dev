/** Ask AI about what is on screen — stub awaiting its port; the legacy client module is the spec. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/ask")({
	ssr: true,
	component: Page,
});

function Page() {
	return <div id="ask" className="view" />;
}
