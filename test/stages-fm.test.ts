/**
 * The frontmatter surface of a run journal.
 *
 * Guards the two things that made a journal unreadable as a document: the
 * packed stage encoding reaching the screen as "stages.gate | running|0.0s|",
 * and a pull request arriving as a URL to copy rather than a button to press.
 *
 * The client is one concatenated script, so these run it the way the browser
 * does — evaluate the bundle, then call the function.
 */
import { expect, it } from "vitest";
import { CLIENT_JOURNAL_JS } from "../src/ui/client-journal.js";
import { CLIENT_MD_JS } from "../src/ui/client-md.js";
import { CLIENT_STAGES_JS } from "../src/ui/client-stages.js";

/**
 * Evaluates only the modules under test, not the whole bundle.
 *
 * Loading everything needs a real DOM for the shells that build markup at
 * startup, and stubbing one out far enough to run is a test of the stub. These
 * three carry the property table, the stage decoding and safeUrl between them;
 * `esc` is the one thing they borrow from the core module, so it is supplied
 * here as the real implementation rather than a permissive stand-in that would
 * make the escaping assertions meaningless.
 */
const ESC = `function esc(s) {
	return String(s == null ? "" : s)
		.replace(/&/g, "&amp;").replace(/</g, "&lt;")
		.replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}`;

function fromBundle(name: string): (...a: unknown[]) => string {
	const src = `${ESC}\n${CLIENT_STAGES_JS}\n${CLIENT_JOURNAL_JS}\n${CLIENT_MD_JS}\n;return ${name};`;
	const make = new Function("document", "window", "fetch", src) as (
		d: unknown,
		w: unknown,
		f: unknown,
	) => (...a: unknown[]) => string;
	return make({ querySelectorAll: () => [], getElementById: () => null }, {}, () => {});
}

const FM = {
	title: "Run: review PR #187",
	status: "running",
	pr: "https://github.com/adirbenyossef/linof-base/pull/187",
	"stages.intent": "done|5.8s|review · tools: claude",
	"stages.gate": "running|0.0s|",
	"stages.merge": "pending|0.0s|",
};

it("decodes the packed stage value instead of printing it", () => {
	const html = fromBundle("fmTable")(FM);
	// The storage encoding must not survive to the screen.
	expect(html).not.toContain("running|0.0s|");
	expect(html).not.toContain("done|5.8s|");
	expect(html).not.toContain("stages.gate");
	// One pipeline row, not one row per stage.
	expect(html).toContain("stg-row");
	expect(html).toContain("</span>intent");
});

it("shows a status glyph, not colour alone", () => {
	const html = fromBundle("fmTable")(FM);
	expect(html).toContain("stg-i");
	expect(html).toContain("✓"); // done
	expect(html).toContain("●"); // running
	expect(html).toContain("○"); // pending
});

it("prints a real duration and drops the placeholder zero", () => {
	const html = fromBundle("fmTable")(FM);
	expect(html).toContain('<span class="stg-t">5.8s</span>');
	// 0.0s is what the harness writes for work that has not started; rendering
	// it would claim the stage ran and took no time. It stays in the title=
	// tooltip, where the full status is available on demand.
	expect(html).not.toContain('<span class="stg-t">0.0s</span>');
	expect(html).toContain('title="gate \u00b7 running \u00b7 0.0s"');
});

it("turns the pull request into a labelled button", () => {
	const html = fromBundle("fmTable")(FM);
	expect(html).toContain("Open PR #187");
	expect(html).toContain('class="act"');
	expect(html).toContain('rel="noopener noreferrer"');
});

it("leaves a document that is not a run journal alone", () => {
	const html = fromBundle("fmTable")({ title: "Notes", author: "me" });
	expect(html).toContain(">title<");
	expect(html).toContain(">Notes<");
	expect(html).not.toContain("stg-row");
});

it("only linkifies http(s), never a scheme a journal could smuggle in", () => {
	const html = fromBundle("fmTable")({ pr: "javascript:alert(1)", ref: "file:///etc/passwd" });
	// Refused as a LINK. The value still shows as escaped text, because hiding
	// a field is not the same as declining to make it clickable.
	expect(html).not.toContain("<a");
	expect(html).not.toContain("href=");
	expect(html).toContain("javascript:alert(1)");
});

it("parses each field of the packed value, tolerating empties", () => {
	const parse = fromBundle("parseStage") as unknown as (v: unknown) => {
		status: string;
		duration: string;
		detail: string;
	};
	expect(parse("done|5.8s|all green")).toEqual({
		status: "done",
		duration: "5.8s",
		detail: "all green",
	});
	expect(parse("pending|0.0s|")).toEqual({ status: "pending", duration: "0.0s", detail: "" });
	// A detail containing the delimiter must survive whole.
	expect(parse("done|1s|a|b").detail).toBe("a|b");
	expect(parse("")).toEqual({ status: "", duration: "", detail: "" });
	expect(parse(null)).toEqual({ status: "", duration: "", detail: "" });
});
