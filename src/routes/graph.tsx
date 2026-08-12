/** What am I about to break — stub awaiting its port; the legacy client module is the spec. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/graph")({
	ssr: true,
	component: Page,
});

function Page() {
	return <div id="graph" className="view" />;
}
