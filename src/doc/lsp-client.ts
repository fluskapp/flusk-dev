/**
 * A minimal LSP client over a child's stdio. Framing lives in lsp-frame.ts;
 * this file is the process, the request/response correlation and the leash.
 *
 * Two rules the rest of this file exists to keep. It NEVER THROWS: a missing
 * binary, a crash mid-session or a garbage reply each resolves its request
 * with `null` and flips `available()` to false, so the registry stops handing
 * out a corpse. And the child LEADS ITS OWN PROCESS GROUP (like
 * src/find/rg-spawn.ts), so dispose reaches the workers a real server forks.
 */
import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { createFrameReader, encodeFrame } from "./lsp-frame.js";

/** Long enough for rust-analyzer's first hover, short enough to not feel hung. */
const REQUEST_TIMEOUT_MS = 5_000;

export interface LspServerSpec {
	command: string;
	args?: string[];
	cwd?: string;
	timeoutMs?: number;
}

type Json = Record<string, unknown>;
type Stream = { unref?: () => void } | undefined;

export interface LspClient {
	/** False once the process is gone; requests then answer null immediately. */
	available(): boolean;
	/** Resolves the result, or null for any failure. Never rejects. */
	request(method: string, params: Json): Promise<unknown>;
	notify(method: string, params: Json): void;
	/** initialize + initialized. Resolves the server's capabilities, or null. */
	initialize(rootUri: string): Promise<unknown>;
	didOpen(uri: string, languageId: string, text: string): void;
	/** shutdown + exit, then SIGKILL the group. Safe to call twice. */
	dispose(): Promise<void>;
}

export function startLsp(spec: LspServerSpec): LspClient {
	const timeoutMs = spec.timeoutMs ?? REQUEST_TIMEOUT_MS;
	const pending = new Map<number, (value: unknown) => void>();
	let alive = true;
	let nextId = 1;
	let proc: ChildProcessWithoutNullStreams | null = null;
	try {
		proc = spawn(spec.command, spec.args ?? [], {
			cwd: spec.cwd,
			detached: true,
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch {
		alive = false; // spawn throws only on bad options; ENOENT arrives as 'error'
	}
	const child = proc;

	/** The one death path: nothing stays pending, nothing is written again. */
	const die = (): void => {
		alive = false;
		for (const settle of [...pending.values()]) settle(null);
		pending.clear();
	};
	const send = (msg: Json): void => {
		if (child === null || !alive) return;
		child.stdin.write(encodeFrame({ jsonrpc: "2.0", ...msg }));
	};
	const deliver = (text: string): void => {
		let msg: Json;
		try {
			msg = JSON.parse(text) as Json;
		} catch {
			return; // an unreadable frame is not a reason to end the session
		}
		const id = msg["id"];
		if (typeof msg["method"] === "string") {
			// A server→client REQUEST must be answered or the server blocks its
			// own startup on it — a hang that looks exactly like a slow index.
			if (id !== undefined && id !== null) send({ id, result: null });
			return;
		}
		if (typeof id !== "number") return;
		const settle = pending.get(id);
		if (settle === undefined) return; // already timed out
		pending.delete(id);
		settle(msg["error"] !== undefined ? null : (msg["result"] ?? null));
	};

	child?.on("error", die);
	child?.on("exit", die);
	child?.stdin.on("error", () => {}); // EPIPE: the server died mid-write
	child?.stderr.resume(); // drain, so a chatty server never blocks on a full pipe
	// onOverflow ends the session on bytes that can never become a frame; unref
	// stops a wedged server's pipes from keeping `flusk ui` alive forever.
	child?.stdout.on("data", createFrameReader(deliver, { onOverflow: die }));
	child?.unref();
	for (const p of [child?.stdin, child?.stdout, child?.stderr]) (p as Stream)?.unref?.();

	const request = (method: string, params: Json): Promise<unknown> => {
		if (child === null || !alive) return Promise.resolve(null);
		const id = nextId++;
		return new Promise((done) => {
			const timer = setTimeout(() => {
				pending.delete(id);
				done(null);
			}, timeoutMs);
			timer.unref(); // a slow server must not hold the process open
			pending.set(id, (value) => {
				clearTimeout(timer);
				done(value);
			});
			send({ id, method, params });
		});
	};
	const notify = (method: string, params: Json): void => send({ method, params });

	return {
		available: () => alive,
		request,
		notify,
		async initialize(rootUri) {
			const caps = await request("initialize", {
				processId: process.pid,
				rootUri,
				capabilities: {},
				workspaceFolders: null,
			});
			if (caps === null) return null;
			notify("initialized", {});
			return caps;
		},
		didOpen(uri, languageId, text) {
			notify("textDocument/didOpen", { textDocument: { uri, languageId, version: 1, text } });
		},
		async dispose() {
			if (child === null) return;
			if (alive) {
				await request("shutdown", {});
				notify("exit", {});
			}
			const pid = child.pid;
			die();
			try {
				if (pid !== undefined) process.kill(-pid, "SIGKILL");
				else child.kill("SIGKILL");
			} catch {
				child.kill("SIGKILL"); // group already gone
			}
		},
	};
}
