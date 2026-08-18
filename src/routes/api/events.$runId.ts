/**
 * The live event stream: SSE over the run's ring buffer.
 *
 * The response NEVER touches the event bus — it polls the bounded feed at its
 * own pace, so a stalled or dead consumer costs the agent loop nothing (the
 * buffer drops oldest and the next read confesses the gap as a `dropped`
 * frame). Closing the tab cancels the stream; the run does not notice.
 */
import { createFileRoute } from "@tanstack/react-router";
import { getLiveRun } from "../../features/run/run.router.js";

const POLL_MS = 150;
/** 15 s of silence gets a comment heartbeat, so idle proxies keep the pipe. */
const HEARTBEAT_MS = 15_000;

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
				let heartbeat: ReturnType<typeof setInterval> | undefined;
				const stopTimers = (): void => {
					if (timer !== undefined) clearInterval(timer);
					if (heartbeat !== undefined) clearInterval(heartbeat);
				};
				const stream = new ReadableStream<Uint8Array>({
					start(controller) {
						let lastWrite = Date.now();
						const send = (frame: string): void => {
							controller.enqueue(encoder.encode(frame));
							lastWrite = Date.now();
						};
						// Reconnect fast on drops rather than the browser's default backoff.
						send("retry: 3000\n\n");
						const pump = (): void => {
							const read = run.feed.readSince(cursor);
							cursor = read.cursor;
							if (read.dropped > 0) {
								send(`event: dropped\ndata: ${read.dropped}\n\n`);
							}
							for (const e of read.events) {
								send(`data: ${JSON.stringify(e.event)}\n\n`);
								if (e.event.type === "run:end") {
									stopTimers();
									controller.close();
									return;
								}
							}
						};
						pump();
						timer = setInterval(pump, POLL_MS);
						heartbeat = setInterval(() => {
							if (Date.now() - lastWrite >= HEARTBEAT_MS) send(": hb\n\n");
						}, HEARTBEAT_MS);
					},
					cancel() {
						stopTimers();
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
