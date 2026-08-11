/**
 * ripgrep's BYTE offsets → the CHARACTER offsets the dashboard highlights,
 * and the window of a long line worth sending at all.
 *
 * Kept apart from rg-parse.ts because both halves are subtle and both are
 * hot: a single matching line can carry a hundred thousand submatches, so
 * anything here that is not linear is a frozen server.
 */

/** Characters kept per line; rg's --max-columns caps its own output, not JSON. */
export const MAX_LINE = 400;
/** Characters of context kept ahead of a match that sits past the cap. */
const LEAD = 80;

/** One submatch as rg reports it: BYTE offsets into the line. */
export interface RgSub {
	start?: number;
	end?: number;
}

/** True when every character is one byte, so offsets need no mapping at all. */
export function isAscii(line: string): boolean {
	return Buffer.byteLength(line, "utf8") === line.length;
}

/** The slice of a line that is sent, in characters. */
export interface Window {
	origin: number;
	width: number;
}

/**
 * Submatches, byte offsets → character offsets, relative to the kept window.
 *
 * rg counts BYTES and the UI highlights CHARACTERS: on `héllo wörld needle`
 * rg says the match starts at 14 while the string says 12, so skipping this
 * paints the highlight two characters right of the word on every accented
 * line — and further off with every emoji.
 *
 * The mapping is built ONCE, over the kept window only (at most MAX_LINE
 * characters). Re-decoding the whole line for every submatch was quadratic:
 * rg reports 100_000 submatches on a single 300KB line, and one such file
 * blocked the event loop long enough that the search timeout could not fire.
 */
export function toRanges(line: string, subs: RgSub[], window: Window): [number, number][] {
	const { origin, width } = window;
	const text = line.slice(origin, origin + width);
	const ascii = isAscii(line);
	const originByte = ascii ? origin : Buffer.byteLength(line.slice(0, origin), "utf8");
	const bytes: number[] = [];
	const chars: number[] = [];
	let byte = originByte;
	let char = 0;
	if (!ascii) {
		for (const cp of text) {
			bytes.push(byte);
			chars.push(char);
			byte += Buffer.byteLength(cp, "utf8");
			char += cp.length;
		}
	}
	const endByte = ascii ? originByte + text.length : byte;
	const at = (b: number): number => {
		const want = Math.max(0, b);
		if (want <= originByte) return 0;
		if (want >= endByte) return text.length;
		if (ascii) return want - originByte;
		let lo = 0;
		let hi = bytes.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if ((bytes[mid] ?? 0) <= want) lo = mid;
			else hi = mid - 1;
		}
		return chars[lo] ?? 0;
	};
	const out: [number, number][] = [];
	for (const s of subs) {
		if (typeof s.start !== "number" || typeof s.end !== "number") continue;
		const from = at(s.start);
		const to = at(s.end);
		if (to > from) out.push([from, to]);
	}
	return out;
}

/**
 * Where the kept window starts. A match past MAX_LINE used to be dropped
 * outright, so the row showed 400 characters that did not contain the query
 * and read as a false positive; the window slides to hold the first submatch
 * with a little context ahead of it instead.
 */
export function windowFor(body: string, subs: RgSub[]): Window {
	const origin = windowOrigin(body, subs);
	return { origin, width: Math.min(MAX_LINE, body.length - origin) };
}

function windowOrigin(body: string, subs: RgSub[]): number {
	if (body.length <= MAX_LINE) return 0;
	const first = subs.find((s) => typeof s.start === "number")?.start;
	if (first === undefined) return 0;
	const start = Math.max(0, first);
	const at = isAscii(body)
		? start
		: Buffer.from(body, "utf8").subarray(0, start).toString("utf8").length;
	if (at < MAX_LINE) return 0;
	return Math.max(0, Math.min(at - LEAD, body.length - MAX_LINE));
}
