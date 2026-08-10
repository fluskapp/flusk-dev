import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve, sep } from "node:path";
import {
	type Classification,
	classifyExe,
	SENSITIVE_RE,
	SHELLS,
	worst,
	WRAPPERS,
} from "./classify-rules.js";

export type { Classification, CommandClass } from "./classify-rules.js";

/** sh -c nesting deeper than this classifies unknown instead of recursing. */
const MAX_SHELL_DEPTH = 4;

const unknown = (reason: string): Classification => ({ class: "unknown", reason });
const deny = (reason: string): Classification => ({ class: "deny", reason });

/**
 * Conservatively classifies a shell command for unattended runs. Anything the
 * rules cannot prove safe is "unknown"; false denials are acceptable, false
 * allows are not. The whole-command class is the most restrictive across
 * pipeline/list segments (deny > unknown > write > read).
 */
export function classifyCommand(command: string, repoRoot: string): Classification {
	return classify(command, resolve(repoRoot), 0);
}

function classify(raw: string, repoRoot: string, depth: number): Classification {
	if (depth > MAX_SHELL_DEPTH) return unknown("shell -c nesting too deep");
	const sensitive = SENSITIVE_RE.exec(raw);
	if (sensitive !== null) return deny(`references sensitive path "${sensitive[0]}"`);
	if (raw.includes("$(") || raw.includes("`")) return unknown("command substitution");
	if (/\beval\b/.test(raw)) return unknown("eval in command");
	if (raw.includes("\n")) return unknown("multi-line command");
	if (raw.includes("<<")) return unknown("heredoc");

	// Drop fd-dups like 2>&1 so they read as neither redirects nor segments.
	const cleaned = raw.replace(/\d*>&\d+/g, " ");
	let acc: Classification | null = null;
	const push = (c: Classification): void => {
		acc = acc === null ? c : worst(acc, c);
	};
	for (const m of cleaned.matchAll(/>{1,2}\s*([^\s|;&<>]+)/g)) {
		push(classifyRedirect(stripQuotes(m[1] ?? ""), repoRoot));
	}
	const exes: string[] = [];
	for (const seg of cleaned.split(/\|\||&&|[|;&]/)) {
		const res = classifySegment(seg.trim(), repoRoot, depth);
		if (res === null) continue;
		exes.push(res.exe);
		push(res.cls);
	}
	// curl/wget flowing into a later shell segment is remote code execution.
	const fetchIdx = exes.findIndex((e) => e === "curl" || e === "wget");
	if (fetchIdx !== -1 && exes.slice(fetchIdx + 1).some((e) => SHELLS.has(e)))
		push(deny("curl/wget output piped into a shell"));
	return acc ?? unknown("empty command");
}

function classifyRedirect(target: string, repoRoot: string): Classification {
	if (target === "" || target.startsWith("&")) return { class: "read", reason: "fd redirect" };
	// $HOME/$TMPDIR/etc expand to paths outside the repo; never treat as relative.
	if (target.includes("$")) return unknown(`redirect target with env expansion: ${target}`);
	let t = target;
	if (t === "~" || t.startsWith("~/")) t = join(homedir(), t.slice(1));
	if (isAbsolute(t)) {
		const abs = resolve(t);
		if (abs === repoRoot || abs.startsWith(repoRoot + sep))
			return { class: "write", reason: `redirect inside repo: ${target}` };
		return deny(`redirect to absolute path outside repo: ${target}`);
	}
	if (t.includes("..")) return unknown(`redirect with ".." segments: ${target}`);
	return { class: "write", reason: `relative redirect: ${target}` };
}

function classifySegment(
	seg: string,
	repoRoot: string,
	depth: number,
): { cls: Classification; exe: string } | null {
	const tokens = seg.split(/\s+/).filter((t) => t.length > 0);
	let i = 0;
	while (i < tokens.length) {
		const t = stripQuotes(tokens[i] ?? "");
		// Skip VAR=value prefixes and wrappers; after xargs the next word is
		// the real command, which this loop reaches by skipping xargs itself.
		if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t) || WRAPPERS.has(basename(t))) {
			i += 1;
			continue;
		}
		break;
	}
	const exeToken = tokens[i];
	if (exeToken === undefined) return null;
	const exe = basename(stripQuotes(exeToken));
	const rest = tokens.slice(i + 1);
	if (SHELLS.has(exe)) return { exe, cls: classifyShell(rest, repoRoot, depth) };
	return { exe, cls: classifyExe(exe, rest.map(stripQuotes), repoRoot) };
}

function classifyShell(rest: string[], repoRoot: string, depth: number): Classification {
	const cIdx = rest.findIndex((t) => /^-[A-Za-z]*c[A-Za-z]*$/.test(stripQuotes(t)));
	if (cIdx === -1) return { class: "write", reason: "shell invocation without -c runs a script" };
	const payload = stripOuterQuotes(rest.slice(cIdx + 1).join(" ").trim());
	if (payload === "") return unknown("shell -c with empty payload");
	const inner = classify(payload, repoRoot, depth + 1);
	return { class: inner.class, reason: `shell -c payload: ${inner.reason}` };
}

function stripQuotes(t: string): string {
	return t.replace(/^["']+|["']+$/g, "");
}

function stripOuterQuotes(s: string): string {
	const q = s[0];
	if (s.length >= 2 && (q === '"' || q === "'") && s.endsWith(q)) return s.slice(1, -1);
	return s;
}
