/**
 * What the Graph panel actually renders, asserted against the compiled client
 * modules (the harness is graph-render-fixture.ts).
 *
 * Four promises are pinned here:
 *  - every row carries its evidence, and every row that looks clickable is;
 *  - labels in the diagram CANNOT overlap — the proof is arithmetic on the
 *    emitted coordinates, not a screenshot of them;
 *  - too many neighbours degrade to the ranked list rather than a hairball;
 *  - no state renders an empty box: each empty section prints a sentence.
 */
import { expect, it } from "vitest";
import { api, bodiesOf, known, localOf, rowsOf } from "./graph-render-fixture.js";

it("gives every row its evidence and an honest click target", () => {
	const html = api.gBlast(known) + api.gCoChange(known) + api.gProvenance(known);
	const bodies = bodiesOf(html);
	expect(bodies).toHaveLength(3);
	for (const body of bodies) {
		// One row per section, each with a why-cell: no row asserts a
		// relationship without saying what produced it.
		expect(body.match(/<tr/g)).toHaveLength(1);
		expect(body).toContain('class="gg-why"');
	}
	// The two rows naming a file open it; the commit row names none, so it is
	// rendered inert rather than as a promise the panel cannot keep.
	expect(html).toContain('data-open="gnode:file:p/a.ts"');
	expect(html).toContain('data-open="gnode:file:p/c.ts"');
	expect(html).toContain('class="gg-inert"');
	// The chain is the audit trail, and the full triples are on the title.
	expect(html).toContain("file:p/a.ts -imports-&gt; file:p/b.ts");
	expect(html).toContain("1 confirmed");
	expect(html).toContain("1f1f1f1f");
});

it("draws the star with labels that cannot overlap", () => {
	const html = api.gLocal({ local: localOf(5) });
	expect(html).toContain("<svg");
	const labels = [...html.matchAll(/<text x="([\d.]+)" y="([\d.]+)" class="gg-label"/g)];
	expect(labels).toHaveLength(5);
	// One column here, so the proof is the pitch: every label sits a full row
	// below the last one. Nothing is placed by a simulation that could settle
	// two labels on top of each other.
	const ys = labels.map((m) => Number(m[2])).sort((a, b) => a - b);
	for (let i = 1; i < ys.length; i++) {
		expect((ys[i] as number) - (ys[i - 1] as number)).toBeGreaterThanOrEqual(20);
	}
	// The centre is drawn once, and the picture is not the only surface: the
	// ranked table under it is what the keyboard cursor steers.
	expect(html.match(/class="gg-dot gg-center"/g)).toHaveLength(1);
	expect(rowsOf(html)).toHaveLength(5);
});

it("degrades to the ranked list rather than drawing a hairball", () => {
	const html = api.gLocal({ local: localOf(30) });
	expect(html).not.toContain("<svg");
	expect(html).toContain("past what stays readable");
	// Every one of them is still THERE, and still openable.
	expect(rowsOf(html)).toHaveLength(30);
	expect(html).toContain('data-open="gnode:file:p/n29.ts"');
});

it("never renders an empty box: each empty section says what is missing", () => {
	const bare = {
		blast: { ...known.blast, impacted: [], unresolved: 1 },
		cochange: { ...known.cochange, peers: [] },
		provenance: { ...known.provenance, rows: [] },
		local: { ...localOf(0) },
	};
	const html = api.gLocal(bare) + api.gBlast(bare) + api.gCoChange(bare) + api.gProvenance(bare);
	expect(html.match(/gg-none/g)).toHaveLength(4);
	expect(html).not.toContain("<table");
	expect(html).toContain("no other indexed file is implicated");
	expect(html).toContain("nothing has indexed yet");
});

it("says when an answer is a floor, and does not say it as a row", () => {
	const capped = {
		...known,
		blast: {
			...known.blast,
			truncation: { truncated: true, reasons: ["limit", "depth"], dropped: 12 },
		},
	};
	const html = api.gBlast(capped);
	expect(html).toContain("Capped (limit, depth)");
	expect(html).toContain("at least 12 more qualified");
	expect(rowsOf(html)).toHaveLength(1);
});
