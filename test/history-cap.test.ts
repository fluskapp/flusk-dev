import { describe, expect, it } from "vitest";
import { capText, dropPartialTail } from "../src/features/history/cap.js";

describe("capText", () => {
	it("leaves text that already fits untouched", () => {
		expect(capText("short enough", 100)).toBe("short enough");
		expect(capText("exact", 5)).toBe("exact");
	});

	it("never ends mid-word", () => {
		// "README.md" straddles the cap: the partial token goes, not half of it.
		const text = "Co-Authored-By: someone\n\nREADME.md\nsrc/index.ts";
		const capped = capText(text, 27);
		expect(capped).toBe("Co-Authored-By: someone");
		expect(capped.endsWith("RE")).toBe(false);
	});

	it("keeps a whole final word when the cap lands on a boundary", () => {
		expect(capText("alpha beta gamma", 10)).toBe("alpha beta");
	});

	it("hard-cuts a single enormous token rather than returning nothing", () => {
		const blob = "a".repeat(200);
		expect(capText(blob, 50)).toBe("a".repeat(50));
	});

	it("respects the cap it was given", () => {
		const text = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do";
		for (const max of [1, 7, 13, 20, 40]) {
			expect(capText(text, max).length).toBeLessThanOrEqual(max);
		}
	});

	it("returns empty for a non-positive cap", () => {
		expect(capText("anything", 0)).toBe("");
		expect(capText("anything", -5)).toBe("");
	});
});

describe("dropPartialTail", () => {
	it("drops the word a byte-boundary cut left half-written", () => {
		expect(dropPartialTail("one implements, one wri")).toBe("one implements, one");
	});

	it("keeps text that ends on whitespace", () => {
		expect(dropPartialTail("complete words\n")).toBe("complete words");
	});

	it("returns a single unbroken token untouched", () => {
		expect(dropPartialTail("supercalifragilistic")).toBe("supercalifragilistic");
	});
});
