import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { listBackends, which } from "../src/chat/detect.js";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { FluskConfig, ChatBackendConfig } from "../src/config/types.js";

let bin: string;
let realPath: string | undefined;

const cfg = (backends: ChatBackendConfig[]): FluskConfig => ({
	...DEFAULT_CONFIG,
	chat: { backends },
});
const row = (backends: ChatBackendConfig[], id: string) =>
	listBackends(cfg(backends)).find((b) => b.id === id);

beforeAll(() => {
	bin = mkdtempSync(join(tmpdir(), "flusk-chat-bin-"));
	writeFileSync(join(bin, "claude"), "#!/bin/sh\necho hi\n");
	chmodSync(join(bin, "claude"), 0o755);
	// Present but not executable: detection must still call this one missing.
	writeFileSync(join(bin, "codex"), "not a program\n");
	chmodSync(join(bin, "codex"), 0o644);
	realPath = process.env.PATH;
	process.env.PATH = bin;
});

afterAll(() => {
	if (realPath === undefined) delete process.env.PATH;
	else process.env.PATH = realPath;
	rmSync(bin, { recursive: true, force: true });
	delete process.env.FLUSK_CHAT_TEST_KEY;
});

it("auto-detects the three agent CLIs by PATH lookup, noting the missing ones", () => {
	const list = listBackends(cfg([]));
	expect(list.map((b) => b.id)).toEqual(["claude", "codex", "kimi"]);
	expect(list[0]).toMatchObject({ kind: "cli", available: true, model: "claude" });
	expect(list[0]?.note).toBeUndefined();
	expect(list[1]).toMatchObject({ available: false, note: "codex not found on PATH" });
	expect(list[2]).toMatchObject({ available: false, note: "kimi not found on PATH" });
	expect(which("claude")).toBe(join(bin, "claude"));
	expect(which("codex")).toBeNull();
});

it("a configured backend overrides the detected one with the same id", () => {
	const list = listBackends(cfg([{ id: "claude", kind: "cli", command: "claude-wrapper" }]));
	expect(list).toHaveLength(3); // replaced in place, not appended
	expect(list[0]).toMatchObject({
		id: "claude",
		// NOT "Claude Code": the command is no longer claude, and a picker that
		// says Claude Code while spawning something else cannot be audited.
		label: "claude",
		model: "claude-wrapper",
		available: false,
		note: "claude-wrapper not found on PATH",
	});
});

it("keeps the built-in label when the config only retargets args", () => {
	const list = listBackends(cfg([{ id: "claude", kind: "cli", args: ["-p", "--verbose"] }]));
	expect(list[0]).toMatchObject({ id: "claude", label: "Claude Code", model: "claude" });
});

it("names an explicitly labelled backend whatever the config says", () => {
	const entry = { id: "claude", kind: "cli" as const, label: "My wrapper", command: "wrap" };
	expect(listBackends(cfg([entry]))[0]?.label).toBe("My wrapper");
});

it("openai-compatible availability needs a baseUrl and a non-empty key env", () => {
	const keyless = { id: "ollama", kind: "openai-compatible", baseUrl: "http://127.0.0.1:11434/v1" };
	expect(row([keyless as ChatBackendConfig], "ollama")).toMatchObject({ available: true });

	const noKey: ChatBackendConfig = {
		id: "openrouter",
		kind: "openai-compatible",
		baseUrl: "https://openrouter.ai/api/v1",
		model: "z/whatever",
		apiKeyEnv: "OPENROUTER_API_KEY_ABSENT",
	};
	expect(row([noKey], "openrouter")).toMatchObject({
		available: false,
		note: "set OPENROUTER_API_KEY_ABSENT",
		model: "z/whatever",
	});

	process.env.FLUSK_CHAT_TEST_KEY = "sk-test";
	expect(row([{ ...noKey, apiKeyEnv: "FLUSK_CHAT_TEST_KEY" }], "openrouter")).toMatchObject({
		available: true,
	});
	expect(row([{ id: "lm", kind: "openai-compatible" }], "lm")).toMatchObject({
		available: false,
		note: "set baseUrl",
	});
});

it("never throws on a hostile config or an unset PATH", () => {
	delete process.env.PATH;
	const junk = [null, { kind: "cli" }, { id: "", kind: "cli" }] as unknown as ChatBackendConfig[];
	expect(() => listBackends(cfg(junk))).not.toThrow();
	expect(listBackends(cfg(junk)).every((b) => b.available === false)).toBe(true);
	process.env.PATH = bin;
});
