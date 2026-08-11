/**
 * Reading a response body under a byte cap.
 *
 * The cap is enforced WHILE STREAMING, never after: Content-Length is a claim
 * by the remote and a chunked response makes no claim at all, so trusting
 * either would mean the size limit is enforced by the sender. The moment the
 * accumulated length crosses the limit the reader stops and cancels the body,
 * so an endless response costs bounded memory and ends the socket instead of
 * being read to completion and then rejected.
 */
import { MAX_RESPONSE_BYTES } from "./limits.js";
import type { FetchOutcome } from "./types.js";

const TOO_BIG = `response is larger than the ${MAX_RESPONSE_BYTES}-byte cap`;

export async function readCapped(
	res: Response,
	finalUrl: string,
	contentType: string,
): Promise<FetchOutcome> {
	const reader = res.body?.getReader();
	if (reader === undefined) return { ok: true, finalUrl, contentType, text: "" };
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value === undefined) continue;
		size += value.length;
		if (size > MAX_RESPONSE_BYTES) {
			await reader.cancel().catch(() => undefined);
			return { ok: false, error: TOO_BIG };
		}
		chunks.push(value);
	}
	const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
	return { ok: true, finalUrl, contentType, text: buf.toString("utf8") };
}
