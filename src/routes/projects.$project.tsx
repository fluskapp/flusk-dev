/** One project: config, models, toolbelt, verify chain — stub awaiting its port; the legacy client module is the spec. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$project")({
	ssr: true,
	component: Page,
});

function Page() {
	return <div id="project" className="view" />;
}
