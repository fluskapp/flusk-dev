/**
 * The four network limits, proved against a local server.
 *
 * Each of these is a way a stranger's URL can hurt the workbench — hang it,
 * fill its memory, walk it in a circle, or point it at something that is not
 * the web at all — so each one is asserted, and asserted by its REASON: a
 * failure whose sentence is "the request failed" is a failure the panel
 * cannot explain to anyone.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { fetchText } from "../src/web/fetch.js";
import { LOOPBACK_ENV, MAX_REDIRECTS } from "../src/web/limits.js";
import { type Site, startSite } from "./web-fixture.js";

let site: Site;

beforeAll(async () => {
	// The fixture is on loopback, which the reader refuses by default — that
	// refusal is itself tested below, with the flag off.
	process.env[LOOPBACK_ENV] = "1";
	site = await startSite();
});

afterAll(async () => {
	await site.close();
	delete process.env[LOOPBACK_ENV];
});

it("fetches a page and reports where it ended up", async () => {
	const got = await fetchText(`${site.url}/doc`);
	expect(got.ok).toBe(true);
	if (!got.ok) return;
	expect(got.finalUrl).toBe(`${site.url}/doc`);
	expect(got.contentType).toContain("text/html");
	expect(got.text).toContain("Widget Guide");
});

it("follows a redirect, and re-checks the target", async () => {
	const got = await fetchText(`${site.url}/once`);
	expect(got.ok && got.finalUrl).toBe(`${site.url}/doc`);
});

it("gives up on a redirect that cycles, naming the loop", async () => {
	const got = await fetchText(`${site.url}/loop`);
	expect(got.ok).toBe(false);
	if (got.ok) return;
	expect(got.error).toContain("redirect loop");
	expect(got.error).toContain("/loop");
});

it("stops after the redirect cap on a chain that never repeats", async () => {
	const got = await fetchText(`${site.url}/chain/1`);
	expect(got.ok).toBe(false);
	if (got.ok) return;
	expect(got.error).toBe(`more than ${MAX_REDIRECTS} redirects`);
});

it("times out on a body that never ends, and says so", async () => {
	const got = await fetchText(`${site.url}/slow`, 300);
	expect(got.ok).toBe(false);
	if (got.ok) return;
	expect(got.error).toBe("timed out after 300ms");
});

it("refuses an oversized response while it is still streaming", async () => {
	const got = await fetchText(`${site.url}/big`);
	expect(got.ok).toBe(false);
	if (got.ok) return;
	expect(got.error).toContain("larger than");
	expect(got.error).toContain("cap");
});

it("reads only http and https", async () => {
	for (const url of ["file:///etc/passwd", "data:text/html,<p>x", "ftp://example.com/x"]) {
		const got = await fetchText(url);
		expect(got.ok).toBe(false);
		if (!got.ok) expect(got.error).toContain("http");
	}
});

it("refuses loopback and private ranges unless explicitly allowed", async () => {
	delete process.env[LOOPBACK_ENV];
	const local = await fetchText(`${site.url}/doc`);
	expect(local.ok).toBe(false);
	if (!local.ok) expect(local.error).toContain("loopback");
	const meta = await fetchText("http://169.254.169.254/latest/meta-data/");
	expect(meta.ok).toBe(false);
	if (!meta.ok) expect(meta.error).toContain("link-local");
	process.env[LOOPBACK_ENV] = "1";
});

it("carries an HTTP status and a wrong content-type back as reasons", async () => {
	const missing = await fetchText(`${site.url}/missing`);
	expect(missing.ok).toBe(false);
	if (!missing.ok) expect(missing.error).toContain("404");
	const pdf = await fetchText(`${site.url}/binary`);
	expect(pdf.ok).toBe(false);
	if (!pdf.ok) expect(pdf.error).toContain("application/pdf");
});
