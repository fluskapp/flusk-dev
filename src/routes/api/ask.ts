/** POST /api/ask — probe. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ask")({
	server: {
		handlers: {
			POST: async () => new Response("ok"),
		},
	},
});
