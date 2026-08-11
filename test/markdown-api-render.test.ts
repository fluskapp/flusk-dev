/**
 * POST /api/render — the one renderer, over the wire.
 *
 * The rules that matter to a caller: the reply is JSON whatever happened, an
 * oversize body is 413 rather than a dropped socket, and markdown arrives with
 * its frontmatter as a table rather than as raw YAML.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { renderPayload } from "../src/ui/api-render.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call, post } from "./api-http.js";

let home: string;
let ui: UiServer;

beforeAll(async () => {
	home = mkdtempSync(join(tmpdir(), "ah-render-home-"));
	process.env.AH_HOME = home;
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
	delete process.env.AH_HOME;
	rmSync(home, { recursive: true, force: true });
});

const body = (reply: { body: string }): Record<string, unknown> =>
	JSON.parse(reply.body) as Record<string, unknown>;

it("renders markdown, frontmatter table first", async () => {
	const text = "---\ntitle: Run 7\nstatus: failed\n---\n# Body\n\n- [x] done\n";
	const reply = await post(ui.url, "/api/render", { text });
	expect(reply.status).toBe(200);
	expect(reply.headers["content-type"]).toContain("application/json");
	const html = String(body(reply).html);
	expect(html.indexOf('<table class="fm">')).toBe(0);
	expect(html).toContain('<th class="fm-k">status</th><td class="fm-v">failed</td>');
	expect(html).toContain("<h1>Body</h1>");
	expect(html).toContain('<input type="checkbox" disabled checked>');
});

it("renders a highlighted code block when a language is named", async () => {
	const reply = await post(ui.url, "/api/render", { text: "const a = 1;", lang: "ts" });
	expect(reply.status).toBe(200);
	const html = String(body(reply).html);
	expect(html).toContain('<pre class="code"><code class="lang-ts">');
	expect(html).toContain('<span class="hl-kw">const</span>');
	// diff is the language the journals need most
	const diff = await post(ui.url, "/api/render", { text: "-old\n+new", lang: "diff" });
	expect(String(body(diff).html)).toContain('<span class="hl-add">+new</span>');
});

it("never emits markup the caller supplied", async () => {
	for (const req of [
		{ text: "<script>alert(1)</script>" },
		{ text: "```\n</code><script>x</script>\n```" },
		{ text: "</code><script>x</script>", lang: "ts" },
		{ text: "x", lang: '"><script>x</script>' },
	]) {
		const html = String(body(await post(ui.url, "/api/render", req)).html);
		expect(html, JSON.stringify(req)).not.toContain("<script");
		expect(html).not.toContain("onerror=");
	}
});

it("answers with JSON for every rejection", async () => {
	const bad = await post(ui.url, "/api/render", { lang: "ts" });
	expect(bad.status).toBe(400);
	expect(body(bad).error).toBe("text is required");
	for (const raw of ["not json", "[1,2]", "null", '{"text":7}']) {
		const reply = await call(ui.url, "/api/render", { method: "POST", body: raw });
		expect(reply.status).toBe(400);
		expect(reply.headers["content-type"]).toContain("application/json");
		expect(typeof body(reply).error).toBe("string");
	}
	// GET is not this route; it falls through to the 404, still JSON
	const get = await call(ui.url, "/api/render");
	expect(get.status).toBe(404);
	expect(body(get).error).toBe("not found");
});

it("rejects a body over 1MB with 413, not a dropped connection", async () => {
	const text = "x".repeat(1_100_000);
	const reply = await post(ui.url, "/api/render", { text });
	expect(reply.status).toBe(413);
	expect(body(reply).error).toBe("request body too large");
	// just under the cap still renders
	const ok = await post(ui.url, "/api/render", { text: "y".repeat(900_000) });
	expect(ok.status).toBe(200);
	expect(String(body(ok).html).length).toBeGreaterThan(900_000);
});

it("renders the same html in process as over the wire", async () => {
	const text = "# T\n\n| a | b |\n|---|---|\n| 1 | 2 |";
	const reply = await post(ui.url, "/api/render", { text });
	expect(String(body(reply).html)).toBe(renderPayload(text, "").html);
	expect(renderPayload("x", "unknown-lang").html).toBe(
		'<pre class="code"><code class="lang-unknown-lang">x</code></pre>',
	);
});
