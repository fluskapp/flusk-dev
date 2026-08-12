/**
 * The `flusk` object handed to an extension's setup function, and the ledger of
 * what that extension actually did with it.
 *
 * WHY THIS FILE EXISTS: the contract promises flusk can TELL the user what is
 * loaded — LoadedExtension carries the tools, flows and events each file
 * registered. Nothing can reconstruct that after the fact, so registration has
 * to be recorded as it happens, here, at the one seam every extension goes
 * through.
 *
 * Two traps this file exists to close:
 *  - an extension's event handler runs inside the agent's emit loop, which is
 *    awaited in order; a handler that throws would abort the emit and take the
 *    run with it, so handlers are wrapped and their failures are logged only.
 *  - `config` is documented read-only, so each extension gets its own clone —
 *    a plugin cannot mutate the config the rest of the run reads.
 */
import type { FluskConfig } from "../../platform/config/types.js";
import type { FluskEvent, EventBus } from "../../platform/events/events.js";
import type { Tool } from "../tools/tool.js";
import type { FluskApi } from "./types.js";

export interface ApiSink {
	config: FluskConfig;
	home: string;
	repoRoot: string;
	/** Absent when only inspecting (`flusk doctor`): handlers are recorded, not attached. */
	events?: EventBus;
	onFlow?: (spec: unknown, extension: string) => void;
	log?: (line: string) => void;
}

export interface ExtensionRecord {
	tools: Tool[];
	toolNames: string[];
	flows: string[];
	events: string[];
}

const detail = (err: unknown): string => (err instanceof Error ? err.message : String(err));

function flowName(spec: unknown, index: number): string {
	if (typeof spec === "object" && spec !== null) {
		const named = (spec as { name?: unknown }).name;
		if (typeof named === "string" && named.length > 0) return named;
	}
	return `flow#${index + 1}`;
}

/** Registration errors throw: the loader catches them and skips that file. */
function assertTool(tool: Tool): void {
	if (typeof tool?.name !== "string" || tool.name.length === 0) {
		throw new Error("flusk.tool() needs a non-empty name");
	}
	if (typeof tool.execute !== "function") {
		throw new Error(`flusk.tool("${tool.name}") needs an execute function`);
	}
	if (typeof tool.parameters !== "object" || tool.parameters === null) {
		throw new Error(`flusk.tool("${tool.name}") needs a parameters schema`);
	}
}

export function createExtensionApi(
	name: string,
	sink: ApiSink,
): { api: FluskApi; record: ExtensionRecord } {
	const record: ExtensionRecord = { tools: [], toolNames: [], flows: [], events: [] };
	const write = (line: string) => sink.log?.(`[${name}] ${line}`);
	const api: FluskApi = {
		tool(tool: Tool): void {
			assertTool(tool);
			record.tools.push(tool);
			record.toolNames.push(tool.name);
		},
		on<T extends FluskEvent["type"]>(
			type: T,
			handler: (event: Extract<FluskEvent, { type: T }>) => void | Promise<void>,
		): void {
			record.events.push(type);
			sink.events?.on(type, async (event) => {
				try {
					await handler(event);
				} catch (err) {
					write(`handler for "${type}" failed: ${detail(err)}`);
				}
			});
		},
		flow(spec: unknown): void {
			record.flows.push(flowName(spec, record.flows.length));
			sink.onFlow?.(spec, name);
		},
		config: structuredClone(sink.config),
		paths: { home: sink.home, repoRoot: sink.repoRoot },
		log: write,
	};
	return { api, record };
}
