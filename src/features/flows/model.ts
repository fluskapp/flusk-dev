/**
 * flusk's model routing, spoken as a LangChain chat model.
 *
 * flusk decides WHICH model a step gets — `chooseModel` over the learned scores
 * in src/provider/scores.ts — and this file is the only thing that turns that
 * decision into something LangGraph can call. Routing logic does not move here
 * and must not be duplicated here: the choice arrives already made.
 *
 * Nothing throws. A missing key, a missing optional package or an unconfigured
 * endpoint all come back as `{ model: null, reason }`, because "you cannot run
 * this flow yet, here is why" is an answer a CLI can print.
 */
import type { ChatBackendConfig, ModelChoice } from "../../platform/config/types.js";
import {
	type Importer,
	LANGCHAIN,
	LANGCHAIN_ANTHROPIC,
	LANGCHAIN_CORE,
	nodeImporter,
} from "./deps.js";

/**
 * The slice of LangChain's BaseChatModel the flow runtime actually uses.
 *
 * `usage_metadata` is declared because the runtime PRICES the reply
 * (src/lang/price.ts): dropping it is how `--max-cost` came to mean nothing.
 * It is optional because not every backend fills it in — the estimator covers
 * the rest.
 */
export interface ChatModel {
	invoke: (input: string) => Promise<{ content: unknown; usage_metadata?: unknown }>;
}

export interface ModelBridge {
	model: ChatModel | null;
	/** Empty when a model was built; otherwise why there is none. */
	reason: string;
}

export const ANTHROPIC_KEY_ENV = "ANTHROPIC_API_KEY";

export interface BridgeOptions {
	/** The openai-compatible backend to use when the choice is not anthropic. */
	backend?: ChatBackendConfig | undefined;
	importer?: Importer;
	env?: Record<string, string | undefined>;
}

const no = (reason: string): ModelBridge => ({ model: null, reason });

const why = (e: unknown): string => (e instanceof Error ? e.message : String(e));

async function anthropic(id: string, key: string, load: Importer): Promise<ModelBridge> {
	try {
		const mod = (await load(LANGCHAIN_ANTHROPIC)) as {
			ChatAnthropic: new (o: Record<string, unknown>) => ChatModel;
		};
		return { model: new mod.ChatAnthropic({ model: id, apiKey: key }), reason: "" };
	} catch (e) {
		return no(`anthropic/${id} is unavailable: ${why(e)}`);
	}
}

async function compatible(
	choice: ModelChoice,
	backend: ChatBackendConfig,
	env: Record<string, string | undefined>,
	load: Importer,
): Promise<ModelBridge> {
	const key = backend.apiKeyEnv === undefined ? "" : (env[backend.apiKeyEnv] ?? "");
	if (backend.apiKeyEnv !== undefined && key === "") {
		return no(`backend "${backend.id}" needs ${backend.apiKeyEnv}`);
	}
	try {
		const mod = (await load(LANGCHAIN)) as {
			initChatModel: (m: string, f: Record<string, unknown>) => Promise<ChatModel>;
		};
		const model = await mod.initChatModel(backend.model ?? choice.id, {
			modelProvider: "openai",
			// Keyless local servers (Ollama, llama.cpp) still want a non-empty key.
			apiKey: key === "" ? "not-needed" : key,
			configuration: { baseURL: backend.baseUrl },
		});
		return { model, reason: "" };
	} catch (e) {
		return no(`backend "${backend.id}" is unavailable: ${why(e)}`);
	}
}

/**
 * A chat model for an already-routed flusk model choice: @langchain/anthropic
 * when the provider is anthropic and a key exists, otherwise the configured
 * openai-compatible endpoint, otherwise null and the reason why.
 */
export async function chatModelFor(
	choice: ModelChoice,
	opts: BridgeOptions = {},
): Promise<ModelBridge> {
	const load = opts.importer ?? nodeImporter;
	const env = opts.env ?? process.env;
	if (choice.provider === "anthropic") {
		const key = env[ANTHROPIC_KEY_ENV] ?? "";
		if (key !== "") return anthropic(choice.id, key, load);
		if (opts.backend === undefined) {
			return no(`anthropic/${choice.id} needs ${ANTHROPIC_KEY_ENV}`);
		}
	}
	const backend = opts.backend;
	if (backend === undefined || (backend.baseUrl ?? "") === "") {
		return no(
			`no chat backend for ${choice.provider}/${choice.id} — set chat.backends[].baseUrl in ~/.flusk/config.json`,
		);
	}
	return compatible(choice, backend, env, load);
}

/**
 * A scripted model, for tests: the suite must never need a key or a socket.
 * Backed by LangChain's own FakeListChatModel so what the runtime exercises is
 * the real BaseChatModel interface, not a hand-rolled lookalike.
 */
export async function fakeChatModel(
	responses: string[],
	importer: Importer = nodeImporter,
): Promise<ChatModel | null> {
	try {
		const mod = (await importer(`${LANGCHAIN_CORE}/utils/testing`)) as {
			FakeListChatModel: new (o: { responses: string[] }) => ChatModel;
		};
		return new mod.FakeListChatModel({ responses });
	} catch {
		return null;
	}
}

/** Message content flattened to text; LangChain hands back string or blocks. */
export function textOf(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.map((part) => {
			const block = part as { text?: unknown };
			return typeof block.text === "string" ? block.text : "";
		})
		.join("");
}
