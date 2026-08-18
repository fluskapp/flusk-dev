/**
 * The live busy state: the rail must say what the reply is doing from click to
 * first byte. Everything here is pure over chat-turns.ts — no DOM, no wire.
 */
import { expect, it } from "vitest";
import type { ChatMsg } from "../src/ui/react/chat/chat-model.js";
import {
	appendDelta,
	pushError,
	pushTool,
	resetLive,
	stateText,
	TOOL_MAX,
	type ChatLive,
} from "../src/ui/react/chat/chat-turns.js";

const live = (over: Partial<ChatLive> = {}): ChatLive => ({
	phase: "idle", startedAt: 0, tools: [], backend: "", ...over,
});

it("derives the state line per phase, with counting seconds", () => {
	const t0 = 1_000_000;
	expect(stateText(live({ phase: "starting", backend: "claude", startedAt: t0 }), t0 + 100)).toBe("starting claude…");
	expect(stateText(live({ phase: "waiting", startedAt: t0 }), t0 + 5_300)).toBe("waiting for first output… (5s)");
	expect(stateText(live({ phase: "streaming", startedAt: t0 }), t0 + 12_000)).toBe("streaming (12s)");
	expect(stateText(live(), t0)).toBe("");
});

it("never counts backwards on clock skew", () => {
	expect(stateText(live({ phase: "waiting", startedAt: 2_000 }), 1_000)).toBe("waiting for first output… (0s)");
});

it("caps the tool list at TOOL_MAX keeping the newest, oldest first", () => {
	const l = live();
	for (let i = 1; i <= 8; i++) pushTool(l, `Read f${i}.ts`);
	expect(TOOL_MAX).toBe(6);
	expect(l.tools).toHaveLength(6);
	expect(l.tools[0]).toBe("Read f3.ts");
	expect(l.tools[5]).toBe("Read f8.ts");
});

it("reset returns the live state to rest — tools cleared with it", () => {
	const l = live({ phase: "streaming", startedAt: 5, backend: "claude", tools: ["Bash ls"] });
	resetLive(l);
	expect(l).toEqual({ phase: "idle", startedAt: 0, tools: [], backend: "" });
});

it("appendDelta grows the streaming turn and never an err line", () => {
	const msgs: ChatMsg[] = [{ role: "user", content: "hi", at: "10:00" }];
	appendDelta(msgs, "he");
	appendDelta(msgs, "llo");
	expect(msgs).toHaveLength(2);
	expect(msgs[1]).toMatchObject({ role: "assistant", content: "hello" });
	pushError(msgs, "boom");
	appendDelta(msgs, "next");
	expect(msgs[2]).toMatchObject({ err: true, content: "boom" });
	expect(msgs[3]).toMatchObject({ role: "assistant", content: "next" });
});

it("pushError replaces an empty streaming turn instead of stacking one", () => {
	const msgs: ChatMsg[] = [];
	appendDelta(msgs, "");
	pushError(msgs, "claude not found on PATH");
	expect(msgs).toHaveLength(1);
	expect(msgs[0]).toMatchObject({ role: "assistant", err: true, content: "claude not found on PATH" });
});
