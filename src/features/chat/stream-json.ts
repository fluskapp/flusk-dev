/**
 * Turning `claude -p --output-format stream-json` stdout into ChatChunks —
 * pure string-in/chunks-out, so it lives outside the repository seam.
 *
 * The mode is sniffed per process from the FIRST line: a JSON object with a
 * string `type` field means JSONL (claude); anything else means plain text
 * (codex, kimi, wrapper scripts), which passes through verbatim as deltas.
 * Text arrives only from `text_delta` stream events — assistant snapshots
 * repeat the same text and are read only for their whole `tool_use` inputs.
 */
import type { ChatChunk } from "./types.js";

/** A first "line" longer than this is not JSONL; flush it as plain text. */
const SNIFF_MAX = 65536;
const LABEL_MAX = 80;
/** First string among these in a tool's input names what it acted on. */
const LABEL_KEYS = ["file_path", "path", "pattern", "command", "url", "query", "prompt"];

export interface CliStreamParser {
	/** Feed decoded stdout; returns chunks to emit now. */
	push(text: string): ChatChunk[];
	/** End of stream; flush the tail. */
	end(): ChatChunk[];
}

interface State {
	sawText: boolean;
}

type Rec = Record<string, unknown>;

const rec = (v: unknown): Rec | null =>
	typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Rec) : null;

function toolLabel(name: string, input: unknown): string {
	const obj = rec(input);
	const value = obj === null ? undefined : LABEL_KEYS.map((k) => obj[k]).find((v) => typeof v === "string");
	if (typeof value !== "string") return name;
	const label = `${name} ${value}`;
	if (label.length <= LABEL_MAX) return label;
	// Keep the tail: for paths and commands the end is the informative part.
	return `${name} …${value.slice(-(LABEL_MAX - name.length - 2))}`;
}

const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

/** The result event's accounting, absent fields dropped; null when empty. */
function statsOf(o: Rec): ChatChunk | null {
	const [costUsd, durationMs, turns] = [num(o.total_cost_usd), num(o.duration_ms), num(o.num_turns)];
	if (costUsd === undefined && durationMs === undefined && turns === undefined) return null;
	return {
		type: "stats",
		...(costUsd === undefined ? {} : { costUsd }),
		...(durationMs === undefined ? {} : { durationMs }),
		...(turns === undefined ? {} : { turns }),
	};
}

function mapEvent(e: unknown, state: State): ChatChunk[] {
	const o = rec(e);
	if (o === null) return [];
	if (o.type === "stream_event") {
		const delta = rec(rec(o.event)?.delta);
		if (delta?.type === "text_delta" && typeof delta.text === "string") {
			state.sawText = true;
			return [{ type: "delta", text: delta.text }];
		}
		return []; // thinking/signature/input_json deltas and lifecycle events
	}
	if (o.type === "assistant") {
		const content = rec(o.message)?.content;
		if (!Array.isArray(content)) return [];
		const out: ChatChunk[] = [];
		for (const item of content) {
			const block = rec(item);
			if (block?.type === "tool_use" && typeof block.name === "string") {
				out.push({ type: "tool", label: toolLabel(block.name, block.input) });
			}
		}
		return out;
	}
	if (o.type === "result") {
		const out: ChatChunk[] = [];
		if (o.is_error === true) {
			out.push({ type: "error", message: String(o.result ?? o.subtype ?? "claude failed") });
		} else if (!state.sawText && typeof o.result === "string" && o.result !== "") {
			// Without --include-partial-messages nothing streams; result is the answer.
			out.push({ type: "delta", text: o.result });
		}
		const stats = statsOf(o);
		if (stats !== null) out.push(stats);
		return out;
	}
	return []; // system, user, rate_limit_event, unknown types
}

function isJsonlLine(line: string): boolean {
	try {
		const o: unknown = JSON.parse(line);
		return rec(o) !== null && typeof (o as Rec).type === "string";
	} catch {
		return false;
	}
}

export function createCliParser(): CliStreamParser {
	let mode: "sniff" | "jsonl" | "raw" = "sniff";
	let buf = "";
	const state: State = { sawText: false };

	const flushRaw = (): ChatChunk[] => {
		const text = buf;
		buf = "";
		return text === "" ? [] : [{ type: "delta", text }];
	};

	const takeLines = (): ChatChunk[] => {
		const out: ChatChunk[] = [];
		for (let nl = buf.indexOf("\n"); nl !== -1; nl = buf.indexOf("\n")) {
			const line = buf.slice(0, nl).trim();
			buf = buf.slice(nl + 1);
			// An unparseable interior line is CLI noise, never leaked as a delta.
			if (line !== "" && isJsonlLine(line)) out.push(...mapEvent(JSON.parse(line), state));
		}
		return out;
	};

	return {
		push(text: string): ChatChunk[] {
			buf += text;
			if (mode === "raw") return flushRaw();
			if (mode === "sniff") {
				const nl = buf.indexOf("\n");
				if (nl === -1) {
					if (buf.length <= SNIFF_MAX) return [];
					mode = "raw";
					return flushRaw();
				}
				mode = isJsonlLine(buf.slice(0, nl)) ? "jsonl" : "raw";
				if (mode === "raw") return flushRaw();
			}
			return takeLines();
		},
		end(): ChatChunk[] {
			// jsonl: a torn trailing line is the tail of an interrupted write; drop it.
			return mode === "jsonl" ? [] : flushRaw();
		},
	};
}
