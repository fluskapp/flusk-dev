/**
 * flusk's model routing, spoken as a LangChain chat model — and what happens when
 * it cannot be.
 *
 * Nothing throws: a missing key, a missing optional package or an unconfigured
 * endpoint all come back as `{ model: null, reason }`, because "you cannot run
 * this flow yet, here is why" is an answer a CLI can print. The importer is
 * injected, so the proof holds on a machine where the packages ARE installed.
 */
import { describe, expect, it } from "vitest";
import { type Importer, LANGCHAIN, LANGCHAIN_ANTHROPIC } from "../src/lang/deps.js";
import { chatModelFor, fakeChatModel, textOf } from "../src/lang/model.js";

const absent: Importer = async (specifier) => {
	throw new Error(`Cannot find package '${specifier}'`);
};

describe("chatModelFor", () => {
	const choice = { provider: "anthropic", id: "claude-sonnet-5" };

	it("refuses without a key, and says which one", async () => {
		const out = await chatModelFor(choice, { env: {}, importer: absent });
		expect(out.model).toBeNull();
		expect(out.reason).toContain("ANTHROPIC_API_KEY");
	});

	it("builds an anthropic chat model when a key exists", async () => {
		const seen: string[] = [];
		const importer: Importer = async (specifier) => {
			seen.push(specifier);
			return { ChatAnthropic: class {} };
		};
		const out = await chatModelFor(choice, { env: { ANTHROPIC_API_KEY: "k" }, importer });
		expect(out.reason).toBe("");
		expect(out.model).not.toBeNull();
		expect(seen).toEqual([LANGCHAIN_ANTHROPIC]);
	});

	it("says what to configure when there is no backend for a non-anthropic model", async () => {
		const out = await chatModelFor({ provider: "openai", id: "gpt-5" }, { importer: absent });
		expect(out.model).toBeNull();
		expect(out.reason).toContain("chat.backends");
	});

	it("points an openai-compatible model at the configured baseUrl", async () => {
		const calls: Record<string, unknown>[] = [];
		const importer: Importer = async (specifier) => {
			expect(specifier).toBe(LANGCHAIN);
			return {
				initChatModel: async (_m: string, fields: Record<string, unknown>) => {
					calls.push(fields);
					return { invoke: async () => ({ content: "" }) };
				},
			};
		};
		const backend = {
			id: "local",
			kind: "openai-compatible" as const,
			baseUrl: "http://127.0.0.1:1234/v1",
			model: "qwen",
		};
		const out = await chatModelFor({ provider: "local", id: "x" }, { backend, importer });
		expect(out.model).not.toBeNull();
		expect(calls[0]?.configuration).toEqual({ baseURL: backend.baseUrl });
	});

	it("reports a missing optional package instead of throwing", async () => {
		const out = await chatModelFor(choice, { env: { ANTHROPIC_API_KEY: "k" }, importer: absent });
		expect(out.model).toBeNull();
		expect(out.reason).toMatch(/unavailable/);
	});
});

describe("fakeChatModel", () => {
	it("scripts replies so no test needs a key", async () => {
		const model = await fakeChatModel(["all green"]);
		if (model === null) return; // optional packages absent: nothing to prove
		expect(textOf((await model.invoke("anything")).content)).toBe("all green");
	});

	it("is null rather than fatal when the packages are absent", async () => {
		expect(await fakeChatModel(["x"], absent)).toBeNull();
	});
});
