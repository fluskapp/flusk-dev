/**
 * `.flusk/harnesses/<id>.json` on disk — built-ins, then ~/.flusk/harnesses
 * (scope "global"), then <repo>/.flusk/harnesses (scope "project"); later
 * scopes REPLACE earlier by id, the runconfig shadow idiom. A broken file is
 * skipped WITH its reason AND refuses the id it shadows — silently falling
 * through to a different spec would launch something the dialog never showed.
 *
 * Trust (H0 D4): a harness spec names a binary a click will spawn. Home specs
 * are the user's own; project specs are always LISTED but runnable only when
 * the repo root is vouched for in ~/.flusk/trusted-projects.json — untrusted
 * rows carry `available: false` and say why (unavailable is data).
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fluskHome } from "../../platform/paths/paths.js";
import { which } from "../chat/detect.repository.js";
import { isProjectTrusted } from "../extensions/trust.repository.js";
import { builtinHarnesses } from "./detect.js";
import { parseHarnessText } from "./harness-parse.js";
import { HARNESS_DIR, type HarnessMeta, type HarnessScan, type HarnessSpec } from "./harness.types.js";

export const globalHarnessDir = (): string => join(fluskHome(), "harnesses");
export const projectHarnessDir = (repoRoot: string): string => join(repoRoot, HARNESS_DIR);

const listDir = (dir: string): string[] => {
	try {
		return readdirSync(dir)
			.filter((f) => f.endsWith(".json"))
			.sort();
	} catch {
		return []; // no harness dir is normal, not an error
	}
};

function toMeta(
	spec: HarnessSpec,
	id: string,
	scope: "global" | "project",
	path: string,
	trusted: boolean,
): HarnessMeta {
	if (!trusted) {
		return { ...spec, id, scope, path, available: false, note: "project harness — repo not trusted" };
	}
	const found = which(spec.command) !== null;
	return {
		...spec,
		id,
		scope,
		path,
		available: found,
		...(found ? {} : { note: `${spec.command} not found on PATH` }),
	};
}

/** Built-ins ← global ← project (listed always; runnable only when trusted).
 * null repoRoot skips the project scope entirely. */
export function scanHarnesses(repoRoot: string | null): HarnessScan {
	const byId = new Map<string, HarnessMeta>();
	for (const b of builtinHarnesses()) byId.set(b.id, b);
	const skipped: HarnessScan["skipped"] = [];
	const scopes: Array<{ scope: "global" | "project"; dir: string; trusted: boolean }> = [
		{ scope: "global", dir: globalHarnessDir(), trusted: true },
	];
	if (repoRoot !== null) {
		scopes.push({ scope: "project", dir: projectHarnessDir(repoRoot), trusted: isProjectTrusted(repoRoot) });
	}
	for (const { scope, dir, trusted } of scopes) {
		for (const file of listDir(dir)) {
			const id = file.slice(0, -".json".length);
			const path = join(dir, file);
			let text: string;
			try {
				text = readFileSync(path, "utf8");
			} catch (e) {
				skipped.push({ path, why: e instanceof Error ? e.message : String(e) });
				byId.delete(id); // a broken shadow refuses the id (the runconfig rule)
				continue;
			}
			const parsed = parseHarnessText(text);
			if (!parsed.ok) {
				skipped.push({ path, why: parsed.why });
				byId.delete(id);
				continue;
			}
			byId.set(id, toMeta(parsed.spec, id, scope, path, trusted));
		}
	}
	return { harnesses: [...byId.values()], skipped };
}

export type HarnessOpen = { ok: true; meta: HarnessMeta } | { ok: false; why: string };

/** The id fresh off disk — the launch idiom; a skipped shadow names its why. */
export function readHarness(repoRoot: string | null, id: string): HarnessOpen {
	const scan = scanHarnesses(repoRoot);
	const found = scan.harnesses.find((h) => h.id === id);
	if (found !== undefined) return { ok: true, meta: found };
	const broken = scan.skipped.find((s) => basename(s.path) === `${id}.json`);
	return { ok: false, why: broken?.why ?? `"${id}" is not a configured harness` };
}
