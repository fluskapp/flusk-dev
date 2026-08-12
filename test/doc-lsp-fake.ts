/**
 * A fake language server, written to a temp .mjs and spawned like a real one.
 *
 * This is the only way to prove the LSP half works on a machine with no
 * language server installed — which is every machine flusk currently runs on. It
 * speaks the real framing, so the test exercises the real bytes rather than a
 * mocked client, and it ECHOES the position it was sent back into the hover
 * text: that is how the 1-based → 0-based conversion is asserted exactly
 * rather than assumed.
 *
 * `dieAfter` and `ignore` make the two failure modes reproducible: a server
 * that crashes mid-session and one that never answers. It also COUNTS
 * `textDocument/didChange`, which is how "the provider is answering about text
 * the server no longer has" is asserted rather than assumed.
 *
 * The markdown fence is spelled as three ` escapes: a literal backtick
 * would end the String.raw template the script is embedded in. String.raw
 * keeps the escape as text, and node reads it when it runs the file, so the
 * fake still emits a real fence.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface FakeOptions {
	/** Methods to receive and never answer — the request-timeout path. */
	ignore?: string[];
	/** Exit(1) after this many requests — the dies-mid-session path. */
	dieAfter?: number;
}

/** The fixture the fake answers about; line 3, col 5 sits inside `greet`. */
export const FIXTURE = [
	"// demo",
	"//",
	"fn greet(who: &str) -> String {",
	"\tString::new()",
	"}",
	"",
].join("\n");

const SERVER = String.raw`
const F = "\u0060\u0060\u0060";
const opts = JSON.parse(process.argv[2] ?? "{}");
const ignore = new Set(opts.ignore ?? []);
let buf = Buffer.alloc(0);
let requests = 0;
let changes = 0;
let answered = "no";

function send(msg) {
	const body = JSON.stringify({ jsonrpc: "2.0", ...msg });
	process.stdout.write("Content-Length: " + Buffer.byteLength(body) + "\r\n\r\n" + body);
}
const range = (l, c, el, ec) => ({ start: { line: l, character: c }, end: { line: el, character: ec } });

function handle(msg) {
	if (msg.id === 900) { answered = "yes"; return; }
	if (msg.method === undefined) return;
	if (ignore.has(msg.method)) return;
	if (msg.method === "exit") process.exit(0);
	if (msg.method === "initialize") {
		send({ id: 900, method: "window/workDoneProgress/create", params: {} });
		send({ id: msg.id, result: { capabilities: { hoverProvider: true }, serverInfo: { name: "fake" } } });
		return;
	}
	// didChange is the notification this fake COUNTS: a provider that opens a
	// document once and never syncs it keeps answering about the first bytes.
	if (msg.method === "textDocument/didChange") { changes += 1; return; }
	if (msg.id === undefined) return; // a notification we do not answer
	requests += 1;
	if (opts.dieAfter !== undefined && requests > opts.dieAfter) process.exit(1);
	const doc = msg.params?.textDocument?.uri;
	const p = msg.params?.position ?? { line: -1, character: -1 };
	if (msg.method === "textDocument/hover") {
		const value = [
			F + "rust", "fn greet(who: &str) -> String", F,
			"Greets who warmly. seen=" + p.line + ":" + p.character + " answered=" + answered +
				" changes=" + changes,
			"@param who the name to greet",
			"@returns the greeting",
		].join("\n");
		send({ id: msg.id, result: { contents: { kind: "markdown", value } } });
	} else if (msg.method === "textDocument/definition") {
		send({ id: msg.id, result: { uri: doc, range: range(9, 3, 9, 8) } });
	} else if (msg.method === "textDocument/references") {
		send({ id: msg.id, result: [
			{ uri: doc, range: range(20, 4, 20, 9) },
			{ uri: doc, range: range(30, 0, 30, 5) },
		] });
	} else if (msg.method === "textDocument/documentSymbol") {
		send({ id: msg.id, result: [{
			name: "greet", kind: 12, range: range(2, 0, 4, 1), selectionRange: range(2, 3, 2, 8),
			children: [{ name: "who", kind: 13, range: range(2, 9, 2, 12), selectionRange: range(2, 9, 2, 12) }],
		}] });
	} else if (msg.method === "shutdown") {
		send({ id: msg.id, result: null });
	} else {
		send({ id: msg.id, error: { code: -32601, message: "unknown method" } });
	}
}

process.stdin.on("data", (chunk) => {
	buf = Buffer.concat([buf, chunk]);
	for (;;) {
		const head = buf.indexOf("\r\n\r\n");
		if (head === -1) return;
		const found = /content-length:\s*(\d+)/i.exec(buf.subarray(0, head).toString("ascii"));
		if (found === null) { buf = buf.subarray(head + 4); continue; }
		const len = Number(found[1]);
		if (buf.length < head + 4 + len) return;
		const msg = JSON.parse(buf.subarray(head + 4, head + 4 + len).toString("utf8"));
		buf = buf.subarray(head + 4 + len);
		handle(msg);
	}
});
`;

export interface Fake {
	dir: string;
	/** The .mjs entry point; spawn as `node <script> <json>`. */
	script: string;
	/** The fixture source file the fake answers about. */
	file: string;
	args(options?: FakeOptions): string[];
}

export async function writeFakeServer(): Promise<Fake> {
	const dir = await mkdtemp(join(tmpdir(), "flusk-lsp-"));
	const script = join(dir, "fake-server.mjs");
	const file = join(dir, "demo.rs");
	await writeFile(script, SERVER);
	await writeFile(file, FIXTURE);
	return { dir, script, file, args: (options = {}) => [script, JSON.stringify(options)] };
}
