/**
 * The run page's honesty states, from the round-1 critique: a live 8-hex id
 * is its own ref kind (never "journal"), a missing session renders a banner
 * instead of crashing Meta on a null header, a failed journal names its
 * reason, the chat roster distinguishes "loading" from "none exists", and
 * the pre-paint theme boot restores exactly what the togglers wrote.
 */
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FluskEvent } from "../src/platform/events/events.js";
import { whoEmptyLabel } from "../src/ui/react/chat/attach-who.js";
import { refKind } from "../src/ui/react/runs/format.js";
import { foldTail } from "../src/ui/react/runs/LiveRun.js";
import { JournalRun } from "../src/ui/react/runs/JournalRun.js";
import { SessionBody } from "../src/ui/react/runs/SessionRun.js";
import { THEME_BOOT } from "../src/ui/react/workbench/theme-boot.js";

describe("refKind", () => {
	it("routes the RunnerWidget's 8-hex id to the live view, not a journal", () => {
		expect(refKind("f53b567d")).toBe("live");
	});
	it("keeps sessions, indexed journals and docs where they were", () => {
		expect(refKind("proj/2026-08-01.jsonl")).toBe("session");
		expect(refKind("~/x/docs/runs/2026-08-01-run.md")).toBe("journal");
		expect(refKind("notes/design.md")).toBe("doc");
	});
	it("only the exact launch id shape is live — near misses stay journals", () => {
		expect(refKind("F53B567D")).toBe("journal"); // uuids are lowercase
		expect(refKind("f53b567")).toBe("journal"); // 7 chars
		expect(refKind("f53b567d9")).toBe("journal"); // 9 chars
	});
});

describe("foldTail", () => {
	const delta = (text: string, channel: "text" | "thinking" = "text"): FluskEvent => ({
		type: "assistant:delta", text, channel,
	});
	it("merges consecutive text deltas and skips thinking", () => {
		const lines = foldTail([delta("Hel"), delta("secret", "thinking"), delta("lo")]);
		expect(lines).toHaveLength(1);
		expect(lines[0]?.text).toBe("Hello");
	});
	it("tool and turn frames break the merge and print one line each", () => {
		const lines = foldTail([
			{ type: "turn:start", turn: 1 },
			delta("a"),
			{ type: "tool:start", callId: "c1", name: "read", args: {} },
			{ type: "tool:end", callId: "c1", name: "read", output: "", isError: true },
			delta("b"),
		]);
		expect(lines.map((l) => l.text)).toEqual(["— turn 1 —", "a", "▸ read", "✕ read", "b"]);
	});
});

describe("a missing session's banner (never a crash on header:null)", () => {
	it("names the reason and the resolved path, with no transcript shell", () => {
		const html = renderToStaticMarkup(
			h(SessionBody, {
				d: { header: null, error: "bad session key", path: "/tmp/s/gone.jsonl" },
				keyRef: "proj/gone.jsonl",
			}),
		);
		expect(html).toContain("Couldn&#x27;t read this session — bad session key.");
		expect(html).toContain("moved or renamed");
		expect(html).toContain("/tmp/s/gone.jsonl");
		expect(html).toContain("Reveal in Finder");
		expect(html).not.toContain('id="meta"'); // Meta never sees a null header
	});
});

describe("a failed journal names its reason", () => {
	it("renders the cause, the file, and the action row", () => {
		const html = renderToStaticMarkup(
			h(JournalRun, {
				meta: null,
				path: "/tmp/docs/runs/x.md",
				body: { text: "", html: "", error: "not an indexed journal" },
			}),
		);
		expect(html).toContain("Couldn&#x27;t load this run&#x27;s journal — not an indexed journal.");
		expect(html).toContain("/tmp/docs/runs/x.md");
		expect(html).toContain("Reveal in Finder");
		expect(html).not.toContain("could not render this journal");
	});
});

describe("whoEmptyLabel", () => {
	it("says detecting while the roster is loading — not 'none exists'", () => {
		expect(whoEmptyLabel(false, "")).toBe("detecting backends…");
	});
	it("names the fix only once a resolved list is truly empty", () => {
		expect(whoEmptyLabel(true, "")).toContain("No chat backend found");
		expect(whoEmptyLabel(true, "")).toContain("chat.backends");
	});
	it("keeps a real failure's own message", () => {
		expect(whoEmptyLabel(true, "answerer list unavailable: boom")).toBe(
			"answerer list unavailable: boom",
		);
	});
});

describe("theme boot", () => {
	const run = (stored: string | null, threw = false): string | undefined => {
		const dataset: { theme?: string } = {};
		const localStorage = {
			getItem: (): string | null => {
				if (threw) throw new Error("private mode");
				return stored;
			},
		};
		const document = { documentElement: { dataset } };
		new Function("localStorage", "document", THEME_BOOT)(localStorage, document);
		return dataset.theme;
	};
	it("restores the stored choice before paint", () => {
		expect(run("dark")).toBe("dark");
		expect(run("light")).toBe("light");
	});
	it("ignores absence, garbage values, and a throwing storage", () => {
		expect(run(null)).toBeUndefined();
		expect(run("solarized")).toBeUndefined();
		expect(run("dark", true)).toBeUndefined();
	});
});
