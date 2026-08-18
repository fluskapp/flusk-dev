/**
 * Restoring a persisted conversation onto the screen: err/partial/sent map to
 * the transcript's shapes and the ISO stamp becomes the clock face. Offline —
 * the mapping is pure; only fetchLatest (untested here) touches the wire.
 */
import { expect, it } from "vitest";
import type { ChatConversation } from "../src/features/chat/types.js";
import { clockFromIso, toChatMsgs } from "../src/ui/react/chat/chat-load.js";

const conv: ChatConversation = {
	id: "20260817T100000-abc",
	turns: [
		{
			role: "user", content: "what is a?", at: "2026-08-17T10:00:00.000Z",
			backendId: "claude", cwd: "/repo", sent: "composed q",
		},
		{
			role: "assistant", content: "a is", at: "2026-08-17T10:00:02.000Z", partial: true,
			cmd: "claude -p <prompt>", cwd: "/repo", tools: ["Read a.ts", "Bash ls"],
			costUsd: 0.02, durationMs: 5394, turns: 2,
		},
		{ role: "assistant", content: "claude not found on PATH", at: "2026-08-17T10:00:03.000Z", err: true },
	],
};

it("maps sent through, partial to a plain turn, err to the muted line", () => {
	const msgs = toChatMsgs(conv);
	expect(msgs).toHaveLength(3);
	expect(msgs[0]).toMatchObject({ role: "user", content: "what is a?", sent: "composed q" });
	// A partial reply is a normal turn whose content is what arrived — no marker.
	expect(msgs[1]).toMatchObject({ role: "assistant", content: "a is" });
	expect(msgs[1]?.err).toBeUndefined();
	expect(msgs[2]).toMatchObject({ role: "assistant", err: true });
	// backendId/cwd are persistence detail, not screen fields.
	expect(msgs[0] !== undefined && "backendId" in msgs[0]).toBe(false);
	expect(msgs[0] !== undefined && "partial" in msgs[0]).toBe(false);
});

it("recorded mechanics come back as the turn's run; bare turns get none", () => {
	const msgs = toChatMsgs(conv);
	expect(msgs[1]?.run).toEqual({
		cmd: "claude -p <prompt>", cwd: "/repo", tools: ["Read a.ts", "Bash ls"],
		costUsd: 0.02, durationMs: 5394, turns: 2,
	});
	// The user turn's cwd is a record field, not an expander.
	expect(msgs[0]?.run).toBeUndefined();
});

it("turns the ISO stamp into the transcript's clock face", () => {
	const at = clockFromIso("2026-08-17T10:00:00.000Z");
	expect(at).toMatch(/\d/);
	expect(at).not.toContain("2026");
	expect(clockFromIso("not a date")).toBe("");
	expect(toChatMsgs(conv)[0]?.at).toBe(at);
});

it("round-trips a hand-built conversation in order, empty stays empty", () => {
	expect(toChatMsgs(conv).map((m) => m.role)).toEqual(["user", "assistant", "assistant"]);
	expect(toChatMsgs({ id: "x", turns: [] })).toEqual([]);
});
