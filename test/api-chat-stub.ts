/**
 * A local OpenAI-shaped SSE endpoint for the chat-endpoint tests. No network,
 * no keys, no model: just the framing `streamHttp` parses.
 *
 * `/fast/...` completes; `/slow/...` sends one delta and then holds the stream
 * open forever, which is how the disconnect test gets something to abort.
 */
import { createServer } from "node:http";

export interface ChatStub {
	url: string;
	/** True once a held stream was cut off before the stub finished it. */
	aborted: boolean;
	close(): Promise<void>;
}

const delta = (text: string): string =>
	`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;

export async function startChatStub(): Promise<ChatStub> {
	const stub: ChatStub = { url: "", aborted: false, close: async () => {} };
	const server = createServer((req, res) => {
		res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8" });
		res.write(delta("hello "));
		if ((req.url ?? "").startsWith("/slow")) {
			res.on("close", () => {
				if (!res.writableEnded) stub.aborted = true;
			});
			return; // held open on purpose
		}
		res.write(delta("world"));
		res.write("data: [DONE]\n\n");
		res.end();
	});
	await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
	const addr = server.address();
	const port = typeof addr === "object" && addr !== null ? addr.port : 0;
	stub.url = `http://127.0.0.1:${port}`;
	stub.close = () =>
		new Promise((done) => {
			server.close(() => done());
			server.closeAllConnections();
		});
	return stub;
}
