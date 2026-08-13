/**
 * The live event stream: SSE over the run's ring buffer.
 *
 * The response NEVER touches the event bus — it polls the bounded feed at its
 * own pace, so a stalled or dead consumer costs the agent loop nothing (the
 * buffer drops oldest and the next read confesses the gap as a `dropped`
 * frame). Closing the tab cancels the stream; the run does not notice.
 */
import { createFileRoute } from "@tanstack/react-router";
import { getLiveRun } from "../../features/run/run.functions.js";

const POLL_MS = 150;

export const Route = createFileRoute("/api/events/$runId")({
	server: {
		handlers: {
			GET: ({ params }) => {
				const run = getLiveRun(params.runId);
				if (run === undefined) {
					return new Response(JSON.stringify({ error: "no such live run" }), {
						status: 404,
						headers: { "content-type": "application/json" },
					});
				}
				const encoder = new TextEncoder();
				let cursor = 0;
				let timer: ReturnType<typeof setInterval> | undefined;
				const stream = new ReadableStream<Uint8Array>({
					start(controller) {
						const pump = (): void => {
							const read = run.feed.readSince(cursor);
							cursor = read.cursor;
							if (read.dropped > 0) {
								controller.enqueue(
									encoder.encode(`event: dropped\ndata: ${read.dropped}\n\n`),
								);
							}
							for (const e of read.events) {
								controller.enqueue(encoder.encode(`data: ${JSON.stringify(e.event)}\n\n`));
								if (e.event.type === "run:end") {
									if (timer !== undefined) clearInterval(timer);
									controller.close();
									return;
								}
							}
						};
						pump();
						timer = setInterval(pump, POLL_MS);
					},
					cancel() {
						if (timer !== undefined) clearInterval(timer);
					},
				});
				return new Response(stream, {
					headers: {
						"content-type": "text/event-stream",
						"cache-control": "no-cache",
						connection: "keep-alive",
					},
				});
			},
		},
	},
});
