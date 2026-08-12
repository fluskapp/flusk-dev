/**
 * The parser's contract: a spec file is a prompt with a tiny header, and a
 * file that does not parse comes back as a REASON, never a throw and never a
 * half-built spec. Everything a cloned repo could put in the header —
 * a claimed scope, a path-shaped name, a value with a newline in it — has to
 * end the same way: refused, with something the user can read.
 */
import { describe, expect, it } from "vitest";
import { parseSpecFile } from "../src/features/orchestra/frontmatter.js";
import { parseAgentSpec } from "../src/features/orchestra/spec-parse.js";

const SPEC = `---
name: test-writer
description: Writes vitest tests for a module that has none
worker: internal
tools: [read, write, edit, bash]
---
You write tests.

Second paragraph.
`;

function parse(text: string) {
	return parseAgentSpec(text, "/abs/agents/x.md", "project");
}

describe("parseSpecFile", () => {
	it("splits header fields, lists and body", () => {
		const out = parseSpecFile(SPEC);
		expect(out.ok).toBe(true);
		if (!out.ok) return;
		expect(out.file.fields.name).toBe("test-writer");
		expect(out.file.lists.tools).toEqual(["read", "write", "edit", "bash"]);
		expect(out.file.body).toBe("You write tests.\n\nSecond paragraph.");
	});

	it("reads an indented list block and an empty list", () => {
		const out = parseSpecFile("---\nname: a\ntools:\n  - read\n  - write\nextra: []\n---\nbody");
		expect(out.ok && out.file.lists.tools).toEqual(["read", "write"]);
		expect(out.ok && out.file.lists.extra).toEqual([]);
	});

	it("strips quotes and tolerates CRLF and comments", () => {
		const out = parseSpecFile('---\r\n# note\r\ndescription: "a: b"\r\n---\r\nbody\r\n');
		expect(out.ok && out.file.fields.description).toBe("a: b");
		expect(out.ok && out.file.body).toBe("body");
	});

	it.each([
		["no frontmatter", "just markdown\n", /missing frontmatter/],
		["unterminated", "---\nname: a\nbody without a fence\n", /unterminated/],
		["garbage line", "---\nname: a\nthis is not a key\n---\nbody", /unparseable/],
	])("refuses %s with a reason", (_label, text, pattern) => {
		const out = parseSpecFile(text);
		expect(out.ok).toBe(false);
		expect(!out.ok && out.reason).toMatch(pattern);
	});
});

describe("parseAgentSpec", () => {
	it("builds a spec whose scope and source come from the caller", () => {
		const out = parse(SPEC);
		expect(out.ok).toBe(true);
		if (!out.ok) return;
		expect(out.spec).toMatchObject({
			name: "test-writer",
			worker: "internal",
			scope: "project",
			source: "/abs/agents/x.md",
			tools: ["read", "write", "edit", "bash"],
		});
		expect(out.spec.prompt).toContain("You write tests.");
	});

	it("ignores a frontmatter scope claim: a file cannot promote itself", () => {
		const out = parse("---\nname: a\ndescription: d\nscope: builtin\n---\nbody");
		expect(out.ok && out.spec.scope).toBe("project");
	});

	it("defaults an absent worker to internal", () => {
		const out = parse("---\nname: a\ndescription: d\n---\nbody");
		expect(out.ok && out.spec.worker).toBe("internal");
	});

	it("drops backendId and model for an internal worker", () => {
		const out = parse("---\nname: a\ndescription: d\nbackendId: claude\nmodel: x\n---\nbody");
		expect(out.ok && out.spec.backendId).toBeUndefined();
		expect(out.ok && out.spec.model).toBeUndefined();
	});

	it("keeps backendId and model for a cli worker", () => {
		const text =
			"---\nname: a\ndescription: d\nworker: cli\nbackendId: claude\nmodel: opus\n---\nb";
		const out = parse(text);
		expect(out.ok && out.spec.backendId).toBe("claude");
		expect(out.ok && out.spec.model).toBe("opus");
	});

	it.each([
		["missing name", "---\ndescription: d\n---\nbody", /missing `name`/],
		["path-shaped name", "---\nname: ../evil\ndescription: d\n---\nb", /kebab-case/],
		["upper-case name", "---\nname: Test_Writer\ndescription: d\n---\nb", /kebab-case/],
		["missing description", "---\nname: a\n---\nbody", /description/],
		["empty body", "---\nname: a\ndescription: d\n---\n", /body IS the system prompt/],
		["unknown worker", "---\nname: a\ndescription: d\nworker: shell\n---\nb", /unknown worker/],
		["cli without backend", "---\nname: a\ndescription: d\nworker: cli\n---\nb", /backendId/],
	])("refuses %s", (_label, text, pattern) => {
		const out = parse(text);
		expect(out.ok).toBe(false);
		expect(!out.ok && out.reason).toMatch(pattern);
	});
});
