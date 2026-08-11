/**
 * Which chat backends this machine can actually offer.
 *
 * Detection is a PATH lookup, never a hardcoded install path: a senior dev's
 * agent CLIs live wherever their installer put them (`~/.local/bin`,
 * `~/.kimi-code/bin`, a volta shim). Config entries merge over the detected
 * ones **by id**, so `chat.backends` can retarget "claude" at a wrapper script
 * without losing auto-detection of the others.
 *
 * Nothing here throws or hides a row: an unavailable backend is still listed,
 * carrying a note that names exactly what is missing. A picker that silently
 * drops a model is a picker you cannot debug.
 */
import { accessSync, constants, statSync } from "node:fs";
import { delimiter, join } from "node:path";
import type { AhConfig, ChatBackendConfig } from "../config/types.js";
import type { ChatBackend } from "./types.js";

/** Agent CLIs probed by default, with the flag that makes each one-shot. */
const DEFAULT_CLIS: ReadonlyArray<{ id: string; label: string; args: string[] }> = [
	{ id: "claude", label: "Claude Code", args: ["-p"] },
	{ id: "codex", label: "Codex", args: ["exec"] },
	{ id: "kimi", label: "Kimi", args: ["-p"] },
];

/** Keys pi-ai routing can use; any one of them makes that backend viable. */
const PI_AI_KEYS = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"];

/** A backend the engine can dispatch on: the UI row plus how to reach it. */
export interface ResolvedBackend {
	backend: ChatBackend;
	config: ChatBackendConfig;
	/** CLI only: argv prefix before the prompt (config args win). */
	args: string[];
}

/** `which`, without shelling out. Returns the absolute path, else null. */
export function which(bin: string): string | null {
	if (bin === "") return null;
	if (bin.includes("/")) return isExecutable(bin) ? bin : null;
	for (const dir of (process.env.PATH ?? "").split(delimiter)) {
		if (dir === "") continue;
		const path = join(dir, bin);
		if (isExecutable(path)) return path;
	}
	return null;
}

function isExecutable(path: string): boolean {
	try {
		accessSync(path, constants.X_OK);
		return statSync(path).isFile();
	} catch {
		return false;
	}
}

function envSet(name: string | undefined): boolean {
	return name !== undefined && name !== "" && (process.env[name] ?? "") !== "";
}

function cli(id: string, label: string, command: string, args: string[]): ResolvedBackend {
	const found = which(command) !== null;
	return {
		backend: {
			id,
			label,
			kind: "cli",
			model: command,
			available: found,
			...(found ? {} : { note: `${command} not found on PATH` }),
		},
		config: { id, kind: "cli", command, args },
		args,
	};
}

function http(c: ChatBackendConfig): ResolvedBackend {
	const missing: string[] = [];
	if ((c.baseUrl ?? "") === "") missing.push("set baseUrl");
	if (c.apiKeyEnv !== undefined && !envSet(c.apiKeyEnv)) missing.push(`set ${c.apiKeyEnv}`);
	return {
		backend: {
			id: c.id,
			label: c.label ?? c.id,
			kind: "openai-compatible",
			...(c.model !== undefined ? { model: c.model } : {}),
			available: missing.length === 0,
			...(missing.length === 0 ? {} : { note: missing.join("; ") }),
		},
		config: c,
		args: [],
	};
}

/**
 * pi-ai is not dispatched yet (src/chat/engine.ts answers it with a message
 * saying so), so it is reported unavailable however many keys are exported.
 * `available: true` here bought a selectable row that errored on every send;
 * an unavailable row renders disabled with its reason, which is the truth.
 */
function piAi(c: ChatBackendConfig): ResolvedBackend {
	return {
		backend: {
			id: c.id,
			label: c.label ?? c.id,
			kind: "pi-ai",
			...(c.model !== undefined ? { model: c.model } : {}),
			available: false,
			note: "pi-ai chat is not wired yet — use a cli or openai-compatible backend",
		},
		config: c,
		args: [],
	};
}

function fromConfig(c: ChatBackendConfig): ResolvedBackend {
	if (c.kind === "pi-ai") return piAi(c);
	if (c.kind === "openai-compatible") return http(c);
	const command = c.command ?? c.id;
	const known =
		DEFAULT_CLIS.find((d) => d.id === c.id) ?? DEFAULT_CLIS.find((d) => d.id === command);
	// A built-in's LABEL is only inherited when the command is still that
	// built-in. An entry that reuses the id "claude" but points `command`
	// somewhere else would otherwise present itself in the picker as
	// "Claude Code" while spawning something entirely different; the args
	// still merge, since retargeting a wrapper script is the supported case.
	const ownCommand = c.command === undefined || c.command === known?.id;
	const label = c.label ?? (ownCommand ? (known?.label ?? c.id) : c.id);
	return cli(c.id, label, command, [...(c.args ?? known?.args ?? [])]);
}

/** Detected CLIs, then config merged over them by id. Never throws. */
export function resolveBackends(cfg: AhConfig): ResolvedBackend[] {
	const out = DEFAULT_CLIS.map((d) => cli(d.id, d.label, d.id, [...d.args]));
	for (const c of cfg.chat?.backends ?? []) {
		if (typeof c?.id !== "string" || c.id === "") continue;
		const resolved = fromConfig(c);
		const at = out.findIndex((b) => b.backend.id === c.id);
		if (at === -1) out.push(resolved);
		else out[at] = resolved;
	}
	return out;
}

export function listBackends(cfg: AhConfig): ChatBackend[] {
	return resolveBackends(cfg).map((r) => r.backend);
}
