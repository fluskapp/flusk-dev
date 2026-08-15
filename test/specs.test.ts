import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import {
	createSpecFile,
	readSpec,
	scanSpecs,
	setSpecStatus,
} from "../src/features/specs/spec-files.repository.js";
import { specTask } from "../src/features/specs/spec-run.js";
import { renderSpecTemplate } from "../src/features/specs/spec-templates.js";
import { SPEC_DIR, SPEC_TEMPLATES, type Spec } from "../src/features/specs/spec.types.js";

let repo: string;

beforeEach(async () => {
	repo = await mkdtemp(join(tmpdir(), "flusk-specs-"));
});

const specsDir = () => join(repo, SPEC_DIR);

test("every template scaffolds a complete spec that parses back", () => {
	for (const t of SPEC_TEMPLATES) {
		const path = createSpecFile(repo, `demo-${t}`, renderSpecTemplate(t, `demo-${t}`));
		expect(path).toBe(`${SPEC_DIR}/demo-${t}.md`);
		const spec = readSpec(repo, `demo-${t}`);
		expect(spec?.title).toBe(`demo ${t}`);
		expect(spec?.status).toBe("draft");
		// Acceptance the gate can argue against, and a body that teaches.
		expect(spec?.acceptance.length).toBeGreaterThan(1);
		expect(spec?.body).toContain("## ");
	}
	const scan = scanSpecs(repo);
	expect(scan.specs.map((s) => s.name)).toEqual(["demo-bugfix", "demo-feature", "demo-refactor"]);
	expect(scan.specs.map((s) => s.mode)).toEqual(["build", "build", "refactor"]);
	expect(scan.skipped).toEqual([]);
});

test("missing keys default (draft/build/none), a missing title takes the name, the body survives verbatim", async () => {
	await mkdir(specsDir(), { recursive: true });
	await writeFile(join(specsDir(), "bare.md"), "---\ntitle: Bare\n---\nJust a body.\n");
	await writeFile(join(specsDir(), "nameless.md"), "---\nmode: plan\n---\n");
	expect(readSpec(repo, "bare")).toEqual(
		expect.objectContaining({
			name: "bare",
			title: "Bare",
			status: "draft",
			mode: "build",
			acceptance: [],
			body: "Just a body.\n",
		}),
	);
	expect(readSpec(repo, "nameless")).toEqual(
		expect.objectContaining({ title: "nameless", mode: "plan" }),
	);
});

test("unreadable specs land in skipped with why, and never hide the rest", async () => {
	await mkdir(specsDir(), { recursive: true });
	await writeFile(join(specsDir(), "good.md"), "---\ntitle: Good\n---\nok\n");
	await writeFile(join(specsDir(), "lost.md"), "---\nstatus: gone-fishing\n---\nx\n");
	await writeFile(join(specsDir(), "prose.md"), "no fence here\n");
	await writeFile(join(specsDir(), "vibes.md"), "---\nmode: vibe\n---\nx\n");
	const scan = scanSpecs(repo);
	expect(scan.specs.map((s) => s.name)).toEqual(["good"]);
	expect(scan.skipped).toEqual([
		{ path: `${SPEC_DIR}/lost.md`, why: 'unknown status "gone-fishing"' },
		{ path: `${SPEC_DIR}/prose.md`, why: "missing frontmatter" },
		{ path: `${SPEC_DIR}/vibes.md`, why: 'unknown mode "vibe"' },
	]);
});

test("setSpecStatus rewrites the status line and nothing else, byte for byte", async () => {
	const raw = `---\ntitle: "Keep: me"\nstatus: draft\nmode: refactor\nacceptance:\n  - one\n---\n\nBody stays.\n`;
	await mkdir(specsDir(), { recursive: true });
	await writeFile(join(specsDir(), "keep.md"), raw);
	setSpecStatus(repo, "keep", "building");
	const after = await readFile(join(specsDir(), "keep.md"), "utf8");
	expect(after).toBe(raw.replace("status: draft", "status: building"));
	expect(readSpec(repo, "keep")?.status).toBe("building");
});

test("createSpecFile refuses to overwrite an existing spec", () => {
	createSpecFile(repo, "once", renderSpecTemplate("feature", "once"));
	expect(() => createSpecFile(repo, "once", "---\n---\n")).toThrow(/EEXIST/);
});

test("specTask is title, body, then the acceptance list verbatim", () => {
	const spec: Spec = {
		name: "n",
		title: "Ship it",
		status: "draft",
		mode: "build",
		acceptance: ["a gate line", "another"],
		path: `${SPEC_DIR}/n.md`,
		updatedAt: "t",
		body: "The body.\n",
	};
	expect(specTask(spec)).toBe("Ship it\n\nThe body.\n\nAcceptance:\n- a gate line\n- another");
	expect(specTask({ ...spec, acceptance: [] })).toBe("Ship it\n\nThe body.");
});
