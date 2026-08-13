/**
 * POST /api/chat — the streamed conversation, as a TanStack server route.
 *
 * The body is one delegation: chat.functions.ts owns cwd validation, the
 * liveChats registration and the abort-on-disconnect wiring, because those are
 * the invariants the legacy chat.router.ts states and a route file must not
 * re-implement them a second time.
 */
import { createFileRoute } from "@tanstack/react-router";
import { chatStreamResponse } from "../../features/chat/chat.functions.js";

export const Route = createFileRoute("/api/chat")({
	server: {
		handlers: {
			POST: ({ request }) => chatStreamResponse(request),
		},
	},
});
