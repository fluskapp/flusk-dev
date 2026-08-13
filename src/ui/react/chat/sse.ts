/**
 * Client-side SSE framing over a fetch body — the one parser both the chat
 * rail and the Ask panel use (the legacy rule: one framing bug is enough).
 * Ported from client-chat-stream.ts.
 */

/** Split an SSE buffer into complete frames; returns the unparsed remainder. */
export function sseFrames(buf: string, onChunk: (chunk: unknown) => void): string {
	let i: number;
	while ((i = buf.indexOf("\n\n")) !== -1) {
		const frame = buf.slice(0, i);
		buf = buf.slice(i + 2);
		for (const line of frame.split("\n")) {
			if (!line.startsWith("data:")) continue;
			let chunk: unknown = null;
			try {
				chunk = JSON.parse(line.slice(5));
			} catch {
				chunk = null;
			}
			if (chunk !== null) onChunk(chunk);
		}
	}
	return buf;
}

/**
 * Drain a streaming response body, handing each frame to `onChunk`. The
 * callback returns true to stop early — the "done" frame — so the browser sees
 * a clean end instead of a hung reader.
 */
export async function readSseStream(
	body: ReadableStream<Uint8Array>,
	onChunk: (chunk: unknown) => boolean,
): Promise<void> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buf = "";
	let ended = false;
	while (!ended) {
		const step = await reader.read();
		if (step.done) break;
		buf += decoder.decode(step.value, { stream: true });
		buf = sseFrames(buf, (chunk) => {
			if (onChunk(chunk)) ended = true;
		});
	}
	try {
		await reader.cancel();
	} catch {
		/* already closed */
	}
}
