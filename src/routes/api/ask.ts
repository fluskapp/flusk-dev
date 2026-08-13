/**
 * POST /api/ask — the answer, streamed, as a TanStack server route.
 *
 * One delegation: ask.functions.ts owns the prompt-first frame, cwd validation,
 * liveChats registration and abort-on-disconnect — the invariants the legacy
 * ask-stream.router.ts states, kept in exactly one place.
 */
import { createFileRoute } from "@tanstack/react-router";
import { askStreamResponse } from "../../features/orchestra/ask.functions.js";

export const Route = createFileRoute("/api/ask")({
	server: {
		handlers: {
			POST: ({ request }) => askStreamResponse(request),
		},
	},
});
