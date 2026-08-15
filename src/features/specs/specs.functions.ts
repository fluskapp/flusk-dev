/**
 * The spec feature's typed server functions — what the Specs window calls.
 * Bodies delegate to spec-files.repository.ts; the only logic here is the
 * root check: a request names a CONFIGURED project root or it is refused,
 * the same membership test the graph functions use (never a prefix test).
 */
import { resolve } from "node:path";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { loadConfig } from "../../platform/config/config.js";
import { expandHome } from "../projects/journal-scan.repository.js";
import { projectRoots } from "../projects/project-scan.repository.js";
import { SPEC_STATUSES } from "./spec-frontmatter.js";
import { createSpecFile, readSpec, scanSpecs, setSpecStatus } from "./spec-files.repository.js";
import { renderSpecTemplate } from "./spec-templates.js";
import {
	SPEC_TEMPLATES,
	type Spec,
	type SpecScan,
	type SpecStatus,
	type SpecTemplate,
} from "./spec.types.js";

export type { Spec, SpecMeta, SpecScan, SpecStatus, SpecTemplate } from "./spec.types.js";

/** The configured root this request names, or null. */
const specRoot = createServerOnlyFn((raw: string): string | null => {
	const path = resolve(expandHome(raw));
	return projectRoots(loadConfig(process.cwd())).includes(path) ? path : null;
});

/** A write's answer: the repo-relative path it landed at, or the refusal. */
export type SpecWriteReply = { ok: true; path: string } | { ok: false; why: string };

const why = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Every spec in the repo — the Specs window's list, skipped files included. */
export const getSpecs = createServerFn()
	.inputValidator((data: { repo: string }) => data)
	.handler(async ({ data }): Promise<SpecScan> => {
		const root = specRoot(data.repo);
		if (root === null) {
			return { specs: [], skipped: [{ path: data.repo, why: "not a configured project root" }] };
		}
		return scanSpecs(root);
	});

/** One spec with its body, or null — unreadable and missing look the same
 * here; the scan's `skipped` is where the reason lives. */
export const getSpec = createServerFn()
	.inputValidator((data: { repo: string; name: string }) => data)
	.handler(async ({ data }): Promise<Spec | null> => {
		const root = specRoot(data.repo);
		return root === null ? null : readSpec(root, data.name);
	});

/** The status line, rewritten in place; everything else stays byte-for-byte. */
export const saveSpecStatus = createServerFn({ method: "POST" })
	.inputValidator((data: { repo: string; name: string; status: SpecStatus }) => data)
	.handler(async ({ data }): Promise<SpecWriteReply> => {
		const root = specRoot(data.repo);
		if (root === null) return { ok: false, why: "not a configured project root" };
		if (!SPEC_STATUSES.includes(data.status)) return { ok: false, why: `unknown status "${data.status}"` };
		try {
			return { ok: true, path: setSpecStatus(root, data.name, data.status) };
		} catch (e) {
			return { ok: false, why: why(e) };
		}
	});

/** Scaffolds a new spec from a template; an existing file is refused. */
export const createSpec = createServerFn({ method: "POST" })
	.inputValidator((data: { repo: string; name: string; template?: SpecTemplate }) => data)
	.handler(async ({ data }): Promise<SpecWriteReply> => {
		const root = specRoot(data.repo);
		if (root === null) return { ok: false, why: "not a configured project root" };
		const template = data.template ?? "feature";
		if (!SPEC_TEMPLATES.includes(template)) return { ok: false, why: `unknown template "${template}"` };
		try {
			return { ok: true, path: createSpecFile(root, data.name, renderSpecTemplate(template, data.name)) };
		} catch (e) {
			return { ok: false, why: why(e) };
		}
	});
