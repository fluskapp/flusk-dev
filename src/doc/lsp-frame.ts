/**
 * The LSP wire format, alone: `Content-Length: N\r\n\r\n` then N bytes of
 * JSON. Forty lines, which is why ah speaks LSP with no dependency.
 *
 * Split from lsp-client.ts because framing is decidable without a process —
 * the reader is a pure function of the bytes, so a torn frame, a header with
 * no length and a 3-chunk body are all testable without spawning anything.
 *
 * The three mistakes this file exists to not make: counting BYTES not
 * characters (a UTF-8 hover with an em dash is longer than its string length,
 * and slicing by character silently desynchronises every frame after it);
 * assuming one chunk is one message (a server may deliver a header and its
 * body in separate reads, or three replies in one); and TRUSTING the stream.
 * A wrapper script that echoes, or a server that logs to stdout instead of
 * stderr, writes bytes that will never become a frame — so the pending buffer
 * is capped and the chunks are concatenated once per parse rather than once
 * per chunk, which is the difference between linear and quadratic work.
 */

/** Past this with no complete frame, the stream is not LSP; stop buffering. */
export const MAX_PENDING_BYTES = 32 * 1024 * 1024;

export function encodeFrame(msg: unknown): string {
	const body = JSON.stringify(msg);
	return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

export interface FrameReaderOptions {
	/** Called once when the cap is hit; the session is then unusable. */
	onOverflow?: (bytes: number) => void;
	maxPending?: number;
}

/**
 * A stateful reader: feed it stdout chunks, it calls `onBody` once per
 * complete frame. Bytes for a partial frame are held until the rest arrives.
 */
export function createFrameReader(
	onBody: (text: string) => void,
	options: FrameReaderOptions = {},
): (chunk: Buffer) => void {
	const cap = options.maxPending ?? MAX_PENDING_BYTES;
	// Chunks accumulate in a list and are joined ONCE per call: `concat` per
	// chunk copies everything held so far every time, so a server writing a
	// megabyte at a time costs O(n^2) bytes moved before any frame appears.
	let pending: Buffer[] = [];
	let pendingBytes = 0;
	let dead = false;
	return (chunk: Buffer): void => {
		if (dead) return;
		pending.push(chunk);
		pendingBytes += chunk.length;
		let buf = pending.length === 1 ? (pending[0] as Buffer) : Buffer.concat(pending, pendingBytes);
		for (;;) {
			const head = buf.indexOf("\r\n\r\n");
			if (head === -1) break;
			const header = buf.subarray(0, head).toString("ascii");
			const len = Number(/content-length:\s*(\d+)/i.exec(header)?.[1] ?? Number.NaN);
			if (!Number.isFinite(len)) {
				buf = buf.subarray(head + 4); // header with no length: drop it, resync
				continue;
			}
			if (buf.length < head + 4 + len) break; // body still arriving
			onBody(buf.subarray(head + 4, head + 4 + len).toString("utf8"));
			buf = buf.subarray(head + 4 + len);
		}
		if (buf.length > cap) {
			// Not LSP. Holding more of it cannot help, and the bytes already held
			// are the whole cost of the mistake, so drop them and stop reading.
			dead = true;
			pending = [];
			pendingBytes = 0;
			options.onOverflow?.(buf.length);
			return;
		}
		pending = buf.length === 0 ? [] : [buf];
		pendingBytes = buf.length;
	};
}
