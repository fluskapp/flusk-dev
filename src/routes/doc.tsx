/** LSP-backed documentation view — stub awaiting its port; the legacy client module is the spec. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/doc")({
	ssr: 'data-only',
	component: Page,
});

function Page() {
	return <div id="docwin-view" className="view" />;
}
