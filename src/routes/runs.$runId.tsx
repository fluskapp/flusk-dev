/** One run: header immediate, transcript deferred — stub awaiting its port; the legacy client module is the spec. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/runs/$runId")({
	ssr: true,
	component: Page,
});

function Page() {
	return <div id="run" className="view" />;
}
