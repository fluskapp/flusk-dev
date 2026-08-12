/**
 * The LSP transport, driven against a real spawned process (test/doc-lsp-fake.ts).
 * Nothing here needs a language server installed, which is the point: this is
 * the half of the doc feature that would otherwise be untestable on the
 * machine it ships to.
 */
import { execPath } from "node:process";
import { afterEach, describe, expect, it } from "vitest";
import { startLsp } from "../src/features/docs/lsp-client.repository.js";
import { fileToUri } from "../src/features/docs/lsp-convert.js";
import { createFrameReader, encodeFrame } from "../src/features/docs/lsp-frame.js";
import { type Fake, writeFakeServer } from "./doc-lsp-fake.js";

const clients: { dispose(): Promise<void> }[] = [];

function connect(fake: Fake, options = {}, timeoutMs = 4000) {
	const client = startLsp({
		command: execPath,
		args: fake.args(options),
		cwd: fake.dir,
		timeoutMs,
	});
	clients.push(client);
	return client;
}

afterEach(async () => {
	await Promise.all(clients.splice(0).map((c) => c.dispose()));
});

/**
 * Block until the child actually answers. Node's cold start is hundreds of
 * milliseconds, so without this a short per-request timeout measures the
 * interpreter booting rather than the behaviour under test.
 */
async function warm(client: ReturnType<typeof startLsp>, uri: string): Promise<void> {
	for (let attempt = 0; attempt < 40; attempt++) {
		const reply = await client.request("textDocument/documentSymbol", { textDocument: { uri } });
		if (reply !== null) return;
	}
	throw new Error("the fake server never answered");
}

describe("Content-Length framing", () => {
	it("reads a frame split across chunks and two frames in one chunk", () => {
		const seen: string[] = [];
		const read = createFrameReader((body) => seen.push(body));
		const frame = encodeFrame({ id: 1, result: "ok" });
		read(Buffer.from(frame.slice(0, 12)));
		expect(seen).toEqual([]); // header only: nothing complete yet
		read(Buffer.from(frame.slice(12) + encodeFrame({ id: 2, result: "two" })));
		expect(seen.map((s) => JSON.parse(s).id)).toEqual([1, 2]);
	});

	it("stops buffering a stream that will never become a frame", () => {
		// A wrapper script that echoes, or a server logging to the wrong stream,
		// writes bytes with no header. Measured before the cap: 300MB retained and
		// 38s of blocked CPU, from concat-per-chunk over a buffer that only grew.
		const seen: string[] = [];
		let overflowed = 0;
		const read = createFrameReader((body) => seen.push(body), {
			maxPending: 4096,
			onOverflow: (bytes) => {
				overflowed = bytes;
			},
		});
		for (let i = 0; i < 10; i++) read(Buffer.alloc(1024, 0x61));
		expect(overflowed).toBeGreaterThan(4096);
		expect(seen).toEqual([]);
		// And it stays stopped: the session is unusable, not merely trimmed.
		read(Buffer.from(encodeFrame({ id: 1, result: "ok" })));
		expect(seen).toEqual([]);
	});

	it("counts bytes, not characters, so a multi-byte body stays aligned", () => {
		const seen: string[] = [];
		const read = createFrameReader((body) => seen.push(body));
		// "…" is 3 bytes and 1 character; a length in characters desynchronises
		// every frame after this one.
		read(Buffer.from(encodeFrame({ v: "a…b" }) + encodeFrame({ v: "next" })));
		expect(seen.map((s) => JSON.parse(s).v)).toEqual(["a…b", "next"]);
	});
});

describe("startLsp", () => {
	it("completes the handshake and answers the server's own request", async () => {
		const fake = await writeFakeServer();
		const client = connect(fake);
		const caps = (await client.initialize(fileToUri(fake.dir))) as Record<string, unknown>;
		expect(caps).not.toBeNull();
		expect(caps["capabilities"]).toEqual({ hoverProvider: true });
		expect(client.available()).toBe(true);
		// The fake only reports answered=yes if the client replied to the
		// window/workDoneProgress/create it sent during initialize.
		const hover = (await client.request("textDocument/hover", {
			textDocument: { uri: fileToUri(fake.file) },
			position: { line: 2, character: 4 },
		})) as { contents: { value: string } };
		expect(hover.contents.value).toContain("answered=yes");
	});

	it("resolves null when a request is never answered, without throwing", async () => {
		const fake = await writeFakeServer();
		const client = connect(fake, { ignore: ["textDocument/hover"] }, 200);
		await warm(client, fileToUri(fake.file));
		const started = Date.now();
		expect(await client.request("textDocument/hover", {})).toBeNull();
		expect(Date.now() - started).toBeGreaterThanOrEqual(190);
		// A timed-out request is not a dead server: the next one still works.
		expect(await client.request("textDocument/definition", {})).not.toBeNull();
		expect(client.available()).toBe(true);
	});

	it("marks itself unavailable when the server dies mid-session", async () => {
		const fake = await writeFakeServer();
		const client = connect(fake, { dieAfter: 1 });
		await client.initialize(fileToUri(fake.dir));
		expect(await client.request("textDocument/hover", {})).not.toBeNull();
		// The second request kills the fake; it must resolve null, not hang or
		// reject, and every request after it is answered immediately.
		expect(await client.request("textDocument/hover", {})).toBeNull();
		await new Promise((r) => setTimeout(r, 50));
		expect(client.available()).toBe(false);
		expect(await client.request("textDocument/definition", {})).toBeNull();
	});

	it("yields null for a binary that does not exist rather than throwing", async () => {
		const client = startLsp({ command: "flusk-no-such-language-server", timeoutMs: 500 });
		clients.push(client);
		expect(await client.initialize("file:///tmp")).toBeNull();
		expect(client.available()).toBe(false);
	});

	it("reports a JSON-RPC error as null and stays usable", async () => {
		const fake = await writeFakeServer();
		const client = connect(fake);
		await client.initialize(fileToUri(fake.dir));
		expect(await client.request("textDocument/nonsense", {})).toBeNull();
		expect(client.available()).toBe(true);
		expect(await client.request("textDocument/definition", {})).not.toBeNull();
	});
});
