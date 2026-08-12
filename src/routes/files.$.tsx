/** The code viewer with outline gutter — stub awaiting its port; the legacy client module is the spec. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/files/$")({
	ssr: 'data-only',
	component: Page,
});

function Page() {
	return <div id="file" className="view" />;
}
