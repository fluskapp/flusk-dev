/** Chat: shell SSR, stream via server route — stub awaiting its port; the legacy client module is the spec. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/chat")({
	ssr: true,
	component: Page,
});

function Page() {
	return <div id="chatview" className="view" />;
}
