/** Find in Files, interactive — stub awaiting its port; the legacy client module is the spec. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/find")({
	ssr: false,
	component: Page,
});

function Page() {
	return <div id="findview" className="view" />;
}
