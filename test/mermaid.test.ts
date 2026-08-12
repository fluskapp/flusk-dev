/**
 * The mermaid subset, tested against the shape 318 real journals actually use.
 *
 * The fallback matters as much as the happy path: anything outside the subset
 * must come back as CODE, because a diagram that quietly drops the edges it
 * did not understand looks authoritative while lying about the pipeline.
 */
import { expect, it } from "vitest";
import { renderMarkdown } from "../src/ui/render/markdown.js";
import { parseMermaid } from "../src/ui/render/mermaid-parse.js";
import { layout } from "../src/ui/render/mermaid-layout.js";
import { renderMermaid } from "../src/ui/render/mermaid-svg.js";

/** Copied verbatim from a linof-harness run journal. */
const REAL = `flowchart LR
  intent["✅ intent"]; style intent fill:#d4edda,stroke:#155724
  routing["✅ routing"]; style routing fill:#d4edda,stroke:#155724
  agent["✅ agent"]; style agent fill:#d4edda,stroke:#155724
  learn["⏳ learn"]; style learn fill:#fff3cd,stroke:#856404
  reflect["reflect"]
  intent --> routing
  intent --> agent
  routing --> agent
  agent --> learn
  agent --> reflect`;

it("parses the flowchart shape real journals emit", () => {
	const g = parseMermaid(REAL);
	expect(g).not.toBeNull();
	expect(g?.dir).toBe("LR");
	expect(g?.nodes.map((n) => n.id)).toEqual(["intent", "routing", "agent", "learn", "reflect"]);
	expect(g?.edges).toHaveLength(5);
	expect(g?.nodes.find((n) => n.id === "intent")?.label).toBe("✅ intent");
});

it("recovers status from the emoji, and from the fill when there is none", () => {
	const g = parseMermaid(REAL);
	const by = (id: string) => g?.nodes.find((n) => n.id === id)?.status;
	expect(by("intent")).toBe("done");
	expect(by("learn")).toBe("running");
	// No emoji and no fill: pending is the honest default, not "done".
	expect(by("reflect")).toBe("pending");
});

it("falls back to a fill colour when the label carries no emoji", () => {
	const g = parseMermaid('flowchart LR\n  a["gate"]; style a fill:#f8d7da,stroke:#721c24');
	expect(g?.nodes[0]?.status).toBe("failed");
});

it("REFUSES anything outside the subset rather than dropping it", () => {
	// A labelled edge, a diamond, and a subgraph: all real mermaid, none of
	// which this renderer understands. Each must yield null, not a partial graph.
	expect(parseMermaid("flowchart LR\n  a-->|yes|b")).toBeNull();
	expect(parseMermaid("flowchart LR\n  a{decide}\n  a-->b")).toBeNull();
	expect(parseMermaid("flowchart LR\n  subgraph one\n  a-->b\n  end")).toBeNull();
	expect(parseMermaid("sequenceDiagram\n  A->>B: hi")).toBeNull();
	expect(parseMermaid("")).toBeNull();
});

it("ranks by longest path, so an edge never points backwards", () => {
	const g = parseMermaid(REAL);
	if (g === null) throw new Error("unreachable");
	const l = layout(g);
	const at = new Map(l.nodes.map((n) => [n.id, n]));
	// intent -> agent and intent -> routing -> agent: agent must sit past both.
	expect((at.get("agent")?.x ?? 0)).toBeGreaterThan(at.get("routing")?.x ?? 0);
	expect((at.get("routing")?.x ?? 0)).toBeGreaterThan(at.get("intent")?.x ?? 0);
	expect(l.width).toBeGreaterThan(0);
	expect(l.height).toBeGreaterThan(0);
});

it("terminates on a cycle instead of hanging", () => {
	const g = parseMermaid("flowchart LR\n  a-->b\n  b-->c\n  c-->a");
	if (g === null) throw new Error("unreachable");
	const l = layout(g);
	expect(l.nodes).toHaveLength(3);
});

it("paints from status tokens, never the journal's light-mode hexes", () => {
	const g = parseMermaid(REAL);
	if (g === null) throw new Error("unreachable");
	const svg = renderMermaid(g);
	expect(svg).toContain("var(--ok)");
	expect(svg).toContain("var(--run)");
	// The pastels the document asked for are unreadable on a dark background.
	expect(svg).not.toContain("#d4edda");
	expect(svg).not.toContain("#fff3cd");
	expect(/#[0-9a-f]{6}/i.test(svg)).toBe(false);
});

it("escapes label text into the SVG", () => {
	const g = parseMermaid('flowchart LR\n  a["<script>x</script>"]');
	if (g === null) throw new Error("unreachable");
	expect(renderMermaid(g)).not.toContain("<script>");
});

it("gives two diagrams on one page distinct arrowhead ids", () => {
	const one = parseMermaid("flowchart LR\n  a-->b");
	const two = parseMermaid("flowchart LR\n  x-->y");
	if (one === null || two === null) throw new Error("unreachable");
	const idOf = (s: string) => /id="(mmd-a\d+)"/.exec(s)?.[1];
	expect(idOf(renderMermaid(one, 1))).not.toBe(idOf(renderMermaid(two, 2)));
});

it("renders a mermaid fence as a diagram, and a broken one as code", () => {
	const good = renderMarkdown("text\n\n```mermaid\n" + REAL + "\n```\n");
	expect(good).toContain('class="mmd"');
	expect(good).toContain("<svg");

	const bad = renderMarkdown("```mermaid\nflowchart LR\n  a-->|labelled|b\n```\n");
	expect(bad).not.toContain('class="mmd"');
	expect(bad).toContain("<pre");
});
