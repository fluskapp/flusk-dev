/**
 * The Ask→Chat merge's wire contract: what the composer sends is exactly what
 * the attachments strip disclosed. composeOutgoing must REUSE ask-prompt's one
 * compose function (fenced blocks, disclosed preamble, question last), and
 * chatBody must carry the composed text while the screen keeps what was typed.
 */
import { expect, it } from "vitest";
import { askPrompt } from "../src/features/orchestra/ask-prompt.js";
import {
	chatBody,
	composeOutgoing,
	FOLD_LINES,
	type ChatMsg,
} from "../src/ui/react/chat/chat-model.js";

const block = { id: "span", label: "a.ts lines 1–3", text: "const a = 1;" };

it("a bare message stays itself — no fence, no rule line, no preamble", () => {
	expect(composeOutgoing("hi", [], "")).toBe("hi");
});

it("with blocks it is ask-prompt's compose, byte for byte", () => {
	const got = composeOutgoing("what is a?", [block], "");
	expect(got).toBe(askPrompt("what is a?", [block]));
	expect(got).toContain('<context label="a.ts lines 1–3">');
	expect(got).toContain("REFERENCE MATERIAL");
	expect(got.trimEnd().endsWith("what is a?")).toBe(true);
});

it("an agent preamble alone still routes through the compose, disclosed first", () => {
	const got = composeOutgoing("q", [], "You are the reviewer.");
	expect(got).toBe(askPrompt("q", [], "You are the reviewer."));
	expect(got.startsWith("You are the reviewer.")).toBe(true);
});

it("chatBody carries `sent` over `content` and still drops err turns", () => {
	const composed = composeOutgoing("q", [block], "");
	const msgs: ChatMsg[] = [
		{ role: "user", content: "q", sent: composed, at: "10:00" },
		{ role: "assistant", content: "claude not found on PATH", err: true, at: "10:00" },
		{ role: "assistant", content: "an answer", at: "10:01" },
	];
	const body = chatBody("claude", msgs, undefined);
	expect(body.messages).toHaveLength(2);
	expect(body.messages[0]).toEqual({ role: "user", content: composed });
	expect(body.messages[1]).toEqual({ role: "assistant", content: "an answer" });
	expect(body.cwd).toBeUndefined();
});

it("conversationId rides only when present", () => {
	const msgs: ChatMsg[] = [{ role: "user", content: "q", at: "10:00" }];
	expect(chatBody("claude", msgs, "/repo", "20260817T100000-abc").conversationId).toBe("20260817T100000-abc");
	expect(chatBody("claude", msgs, "/repo")).not.toHaveProperty("conversationId");
});

it("the fold threshold is the design's ~40 lines", () => {
	expect(FOLD_LINES).toBe(40);
});
