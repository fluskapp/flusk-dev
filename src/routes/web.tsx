/** Read a URL beside the code — stub awaiting its port; the legacy client module is the spec. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/web")({
	ssr: true,
	component: Page,
});

function Page() {
	return <div id="web" className="view" />;
}
