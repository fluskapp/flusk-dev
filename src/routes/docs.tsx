/** Indexed markdown, filterable — stub awaiting its port; the legacy client module is the spec. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs")({
	ssr: true,
	component: Page,
});

function Page() {
	return <div id="docs" className="view" />;
}
