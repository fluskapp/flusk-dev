/**
 * The chat tool window. The client ships as plain JS in template strings, so
 * the shaping functions are compiled out of the emitted source and called
 * directly here — the same text the browser gets, exercised as functions.
 * Behaviours that are structural (a stop control, /api/render at end of turn)
 * are pinned against that source instead.
 */
import { expect, it } from "vitest";
import { CLIENT_CHAT_JS } from "../src/ui/client-chat.js";
import { CLIENT_CHAT_STREAM_JS } from "../src/ui/client-chat-stream.js";
import { CLIENT_CORE_JS } from "../src/ui/client-core.js";
import { CHAT_CSS } from "../src/ui/styles-chat.js";

interface Msg {
	role: string;
	content: string;
	err?: boolean;
	at?: string;
	html?: string;
}
interface Body {
	backendId: string;
	messages: Array<{ role: string; content: string }>;
	cwd?: string;
}
interface Chat {
	turnHtml(m: Msg, streaming?: boolean): string;
	chatBody(backendId: string, msgs: Msg[], cwd?: string): Body;
	setTurnHtml(m: Msg, html: unknown): Msg;
}

// The panel's boot IIFE is DOM-guarded, so the bundle loads under node.
const chat = new Function(
	`${CLIENT_CORE_JS}${CLIENT_CHAT_JS}${CLIENT_CHAT_STREAM_JS}
	return { turnHtml: turnHtml, chatBody: chatBody, setTurnHtml: setTurnHtml };`,
)() as Chat;

it("gives the user a quiet tinted block, not a shouty role label", () => {
	const html = chat.turnHtml({ role: "user", content: "ship <b>it</b>", at: "09:41" });
	expect(html).toContain('class="turn user"');
	expect(html).toContain('class="said"');
	expect(html).toContain("ship &lt;b&gt;it&lt;/b&gt;");
	// The old panel printed "YOU"/"MODEL" over every turn.
	expect(html).not.toContain('class="who"');
	expect(html.toUpperCase()).not.toContain(">YOU<");
	// The timestamp ships but is CSS-hidden until hover.
	expect(html).toContain("<time>09:41</time>");
	expect(CHAT_CSS).toContain(".turn time");
	expect(CHAT_CSS).toContain(".turn:hover time { opacity: .8; }");
});

it("renders the model's turn from the HTML the server produced", () => {
	const served = "<p><strong>bold</strong></p><table><tr><td>a</td></tr></table>";
	const html = chat.turnHtml({ role: "assistant", content: "**bold**\n| a |", html: served });
	expect(html).toContain(served);
	expect(html).toContain('class="body md"');
	// The reply is markup now, so the source asterisks are gone from the view.
	expect(html).not.toContain("**bold**");
	// Plain body text at full width: no bubble around the model's words.
	expect(html).not.toContain('class="said"');
});

it("keeps the reply as escaped text when the render never arrived", () => {
	const m: Msg = { role: "assistant", content: "**bold** & <script>x</script>" };
	const html = chat.turnHtml(m);
	expect(html).toContain('class="body pre');
	expect(html).toContain("**bold** &amp; &lt;script&gt;x&lt;/script&gt;");
	expect(html).not.toContain("<script>");
});

it("marks the streaming turn so the caret has something to hang on", () => {
	const html = chat.turnHtml({ role: "assistant", content: "part" }, true);
	expect(html).toContain('id="chat-stream"');
	expect(html).toContain("streaming");
	expect(CHAT_CSS).toContain(".streaming::after");
	expect(CHAT_CSS).toContain("flusk-caret");
	// A finished turn must not keep the caret.
	expect(chat.turnHtml({ role: "assistant", content: "part" })).not.toContain("streaming");
});

it("shows a failure as one muted line, not as a fake model turn", () => {
	const html = chat.turnHtml({ role: "assistant", content: "claude not on PATH", err: true });
	expect(html).toContain('class="turn-err"');
	expect(html).not.toContain('class="turn model"');
	expect(html).not.toContain('class="said"');
	expect(CHAT_CSS).toContain("color: var(--dim)");
});

it("never replays a failure line back to the model", () => {
	const msgs: Msg[] = [
		{ role: "user", content: "hi" },
		{ role: "assistant", content: "claude not on PATH", err: true },
		{ role: "user", content: "again" },
	];
	const body = chat.chatBody("claude", msgs, "/repo");
	expect(body.messages).toEqual([
		{ role: "user", content: "hi" },
		{ role: "user", content: "again" },
	]);
	expect(body.backendId).toBe("claude");
	expect(body.cwd).toBe("/repo");
	// No project selected: the field is absent rather than empty.
	expect(chat.chatBody("claude", msgs).cwd).toBeUndefined();
});

it("adopts server HTML only when there is some — otherwise the text stands", () => {
	const ok = chat.setTurnHtml({ role: "assistant", content: "x" }, "<p>x</p>");
	expect(ok.html).toBe("<p>x</p>");
	for (const bad of ["", undefined, null, { html: "<p>x</p>" }]) {
		const m = chat.setTurnHtml({ role: "assistant", content: "x" }, bad);
		expect(m.html).toBeUndefined();
		expect(chat.turnHtml(m)).toContain("x");
	}
});

it("ends every turn by asking the server to render it", () => {
	expect(CLIENT_CHAT_STREAM_JS).toContain('fetch("/api/render"');
	expect(CLIENT_CHAT_STREAM_JS).toContain("JSON.stringify({ text: m.content })");
	expect(CLIENT_CHAT_STREAM_JS).toContain("setTurnHtml(m, (await r.json()).html)");
	// Called with the turn that just finished, including after Stop.
	expect(CLIENT_CHAT_STREAM_JS).toContain("await finishTurn(S.chat.msgs[S.chat.msgs.length - 1])");
	// textContent belongs to the streaming path alone; the shaped turn is HTML.
	expect(CLIENT_CHAT_JS).toContain("el.textContent = last.content");
	const shaping = CLIENT_CHAT_JS.slice(
		CLIENT_CHAT_JS.indexOf("function turnHtml"),
		CLIENT_CHAT_JS.indexOf("function renderChat"),
	);
	expect(shaping).toContain('<div class="body md">');
	expect(shaping).not.toContain("textContent");
});

it("keeps a stop control that aborts the fetch and keeps what arrived", () => {
	expect(CLIENT_CHAT_STREAM_JS).toContain("function stopChat()");
	expect(CLIENT_CHAT_STREAM_JS).toContain("S.chat.abort.abort()");
	expect(CLIENT_CHAT_STREAM_JS).toContain("signal: ac.signal");
	// Nothing in stop empties the transcript.
	expect(CLIENT_CHAT_STREAM_JS).not.toMatch(/S\.chat\.msgs\s*=\s*\[\]/);
	expect(CLIENT_CHAT_JS).toContain('$("#chat-stop").hidden = !on');
});
