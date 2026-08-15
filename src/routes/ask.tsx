/**
 * /ask — gone as a window (docs/experience.md): talking with your code is
 * what Chat (5) is for, and Ask's visible context card became Chat's
 * attachment strip. The route stays only to carry old links and muscle
 * memory to /chat.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ask")({
	beforeLoad: () => {
		throw redirect({ to: "/chat" });
	},
});
