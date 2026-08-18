/**
 * The stream-json parser, fed strings only — no claude is ever spawned. The
 * fixture is a real captured `claude -p --output-format stream-json
 * --include-partial-messages --verbose` run.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { createCliParser } from "../src/features/chat/stream-json.js";
import type { ChatChunk } from "../src/features/chat/types.js";

const fixture = readFileSync(
	fileURLToPath(new URL("./fixtures/claude-stream.jsonl", import.meta.url)),
	"utf8",
);

function feed(pieces: string[]): ChatChunk[] {
	const p = createCliParser();
	const out: ChatChunk[] = [];
	for (const piece of pieces) out.push(...p.push(piece));
	out.push(...p.end());
	return out;
}

const deltas = (chunks: ChatChunk[]): string =>
	chunks.map((c) => (c.type === "delta" ? c.text : "")).join("");

it("maps the captured claude stream to clean text and one tool line", () => {
	const chunks = feed([fixture]);
	expect(deltas(chunks)).toBe("done");
	const tools = chunks.filter((c) => c.type === "tool");
	expect(tools).toHaveLength(1);
	expect((tools[0] as { label: string }).label.startsWith("Read ")).toBe(true);
	expect((tools[0] as { label: string }).label.endsWith("stream-sample.err")).toBe(true);
	expect(chunks.some((c) => c.type === "error")).toBe(false);
	expect(chunks.some((c) => c.type === "done")).toBe(false); // the engine owns done
	// thinking/signature deltas never leak into the reply text
	expect(deltas(chunks)).not.toContain("thinking");
	// the result event's accounting arrives as the final stats chunk
	expect(chunks.at(-1)).toEqual({ type: "stats", costUsd: 0.0213778, durationMs: 5394, turns: 2 });
});

it("emits the identical chunk sequence when fed in 7-byte slices", () => {
	const slices: string[] = [];
	for (let i = 0; i < fixture.length; i += 7) slices.push(fixture.slice(i, i + 7));
	expect(feed(slices)).toEqual(feed([fixture]));
});

it("passes a plain-text stream through verbatim", () => {
	expect(feed(["Hello\nworld"])).toEqual([{ type: "delta", text: "Hello\nworld" }]);
});

it("treats a JSON scalar first line as plain text, not JSONL", () => {
	expect(feed(["42\nrest"])).toEqual([{ type: "delta", text: "42\nrest" }]);
});

it("turns a result with is_error into one error chunk, no deltas", () => {
	const lines = [
		`{"type":"system","subtype":"init","session_id":"s"}`,
		`{"type":"assistant","error":"authentication_failed","message":{"content":[]}}`,
		`{"type":"result","subtype":"error_during_execution","is_error":true,"result":"authentication_failed"}`,
	];
	const chunks = feed([`${lines.join("\n")}\n`]);
	expect(chunks).toEqual([{ type: "error", message: "authentication_failed" }]);
});

it("emits the final result as the reply when no text_delta ever streamed", () => {
	const lines = [
		`{"type":"system","subtype":"init","session_id":"s"}`,
		`{"type":"result","subtype":"success","is_error":false,"result":"the answer"}`,
	];
	expect(feed([`${lines.join("\n")}\n`])).toEqual([{ type: "delta", text: "the answer" }]);
});

it("emits stats after the reply text, dropping absent fields", () => {
	const lines = [
		`{"type":"system","subtype":"init","session_id":"s"}`,
		`{"type":"result","subtype":"success","is_error":false,"result":"hi","total_cost_usd":0.5,"num_turns":1}`,
	];
	expect(feed([`${lines.join("\n")}\n`])).toEqual([
		{ type: "delta", text: "hi" },
		{ type: "stats", costUsd: 0.5, turns: 1 },
	]);
});

it("drops a torn trailing line in jsonl mode at end()", () => {
	const whole = `${fixture}{"type":"str`;
	expect(feed([whole])).toEqual(feed([fixture]));
});

it("falls back to raw when the first newline never comes before the cap", () => {
	const big = "x".repeat(65537);
	const p = createCliParser();
	expect(p.push(big)).toEqual([{ type: "delta", text: big }]);
	expect(p.push("more")).toEqual([{ type: "delta", text: "more" }]);
	expect(p.end()).toEqual([]);
});
