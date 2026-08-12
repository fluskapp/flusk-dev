/** Flow runs and their prompts — stub awaiting its port; the legacy client module is the spec. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/flows")({
	ssr: true,
	component: Page,
});

function Page() {
	return <div id="flows" className="view" />;
}
