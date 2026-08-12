/**
 * Word lists and per-executable rules backing classifyCommand. Conservative
 * by design: unlisted commands are "unknown"; false denials beat false allows.
 */

import { isAbsolute, resolve, sep } from "node:path";

export type CommandClass = "read" | "write" | "deny" | "unknown";

export interface Classification {
	class: CommandClass;
	reason: string;
}

const SEVERITY: Record<CommandClass, number> = { read: 0, write: 1, unknown: 2, deny: 3 };

/** Most-restrictive-wins merge (deny > unknown > write > read). */
export function worst(a: Classification, b: Classification): Classification {
	return SEVERITY[b.class] > SEVERITY[a.class] ? b : a;
}

export const SHELLS = new Set(["sh", "bash", "zsh"]);

/** Wrapper words stripped before finding the real executable. `env` execs its
 * argument, so it is a wrapper, never a read command; an env flag (`-i`, `-u`)
 * left in exe position classifies unknown, which the default policy denies. */
export const WRAPPERS = new Set(["command", "builtin", "nohup", "time", "xargs", "env"]);

/** Credential and system locations matched against the raw command string. */
export const SENSITIVE_RE =
	/(?:~|\$\{?HOME\}?)\/\.(?:ssh|aws|gnupg|config\/gh)|\/etc\/|\/private\/etc|Library\/Keychains/i;

const deny = (reason: string): Classification => ({ class: "deny", reason });
const unknown = (reason: string): Classification => ({ class: "unknown", reason });

const READ_CMDS = new Set(
	(
		"ls cat head tail less wc grep rg fd pwd printf echo which whereis file stat du df " +
		"ps date uname hostname sw_vers tree diff cmp sort uniq cut awk column jq yq " +
		"basename dirname realpath readlink"
	).split(" "),
);

const WRITE_CMDS = new Set(
	(
		"node npm npx tsc yarn pnpm bun deno python python3 pip pytest cargo rustc go make " +
		"cmake mkdir touch cp mv ln tar zip unzip sed chmod"
	).split(" "),
);

const DENY_CMDS = new Set(
	(
		"sudo doas ssh scp sftp kill pkill killall shutdown reboot halt launchctl crontab dd " +
		"mkfs diskutil csrutil security"
	).split(" "),
);

const GIT_READ = new Set("status log diff show branch rev-parse remote blame shortlog".split(" "));
const GIT_WRITE = new Set(
	"add commit checkout switch restore stash merge rebase init fetch pull clone worktree".split(" "),
);

function firstNonFlag(args: string[]): string | undefined {
	return args.find((a) => a.length > 0 && !a.startsWith("-"));
}

function classifyGit(args: string[]): Classification {
	const sub = firstNonFlag(args);
	if (sub === undefined) return unknown("git with no subcommand");
	if (sub === "push" || sub.startsWith("push-")) return deny("git push is never allowed");
	if (GIT_READ.has(sub)) return { class: "read", reason: `git ${sub} is read-only` };
	if (GIT_WRITE.has(sub)) return { class: "write", reason: `git ${sub} writes locally` };
	return unknown(`unrecognized git subcommand "${sub}"`);
}

function classifyRm(args: string[]): Classification {
	for (const a of args) {
		if (a.length === 0 || a.startsWith("-")) continue;
		if (a.startsWith("/") || a.startsWith("~") || a.includes(".."))
			return deny(`rm may reach outside the working tree: "${a}"`);
	}
	return { class: "write", reason: "rm with relative paths only" };
}

/** find primaries that execute commands or mutate the filesystem. */
const FIND_ACTIONS = new Set(
	"-exec -execdir -ok -okdir -delete -fprint -fprint0 -fprintf -fls".split(" "),
);

/** Write commands whose positional path arguments must stay inside the repo. */
const JAILED_WRITE_CMDS = new Set("cp mv tar sed touch mkdir ln zip unzip chmod".split(" "));

/** Repo jail for positional paths, mirroring classifyRedirect. Null = no objection. */
function jailPositionalPaths(exe: string, args: string[], repoRoot: string): Classification | null {
	for (const a of args) {
		if (a.length === 0 || a.startsWith("-")) continue;
		if (a.startsWith("~")) return deny(`${exe} touches a home path: "${a}"`);
		if (a.includes("..")) return unknown(`${exe} path with ".." segments: "${a}"`);
		if (a.includes("$")) return unknown(`${exe} path with env expansion: "${a}"`);
		if (isAbsolute(a)) {
			const abs = resolve(a);
			if (abs !== repoRoot && !abs.startsWith(repoRoot + sep))
				return deny(`${exe} targets a path outside the repo: "${a}"`);
		}
	}
	return null;
}

const CURL_DENY_FLAGS = new Set(["-d", "-F", "--form", "--upload-file", "-T"]);
const MUTATING_METHOD = /^(POST|PUT|DELETE)$/i;

function classifyCurlWget(exe: string, args: string[]): Classification {
	for (let i = 0; i < args.length; i += 1) {
		const a = args[i] ?? "";
		if (CURL_DENY_FLAGS.has(a) || a.startsWith("--data"))
			return deny(`${exe} uploads data (${a})`);
		if (a === "-X" && MUTATING_METHOD.test(args[i + 1] ?? ""))
			return deny(`${exe} sends a mutating request`);
		if (/^-X(POST|PUT|DELETE)$/i.test(a)) return deny(`${exe} sends a mutating request`);
	}
	return unknown(`${exe} network fetch`);
}

export function classifyExe(exe: string, args: string[], repoRoot: string): Classification {
	if (exe === "git") return classifyGit(args);
	if (exe === "rm") return classifyRm(args);
	if (exe === "curl" || exe === "wget") return classifyCurlWget(exe, args);
	if (exe === "rsync")
		return args.some((a) => a.includes(":"))
			? deny("rsync with a remote target")
			: unknown("local rsync");
	if (exe === "chmod" && args.some((a) => a.includes("777")))
		return deny("chmod 777 is never allowed");
	if (exe === "defaults")
		return firstNonFlag(args) === "write" ? deny("defaults write") : unknown("defaults");
	if (exe === "npm" && firstNonFlag(args) === "publish") return deny("npm publish");
	if (exe.startsWith("mkfs") || DENY_CMDS.has(exe)) return deny(`"${exe}" is on the deny list`);
	if (exe === "find") {
		const action = args.find((a) => FIND_ACTIONS.has(a));
		if (action !== undefined) return unknown(`find with action primary "${action}"`);
		return { class: "read", reason: "find without action primaries" };
	}
	if (JAILED_WRITE_CMDS.has(exe)) {
		const jailed = jailPositionalPaths(exe, args, repoRoot);
		if (jailed !== null) return jailed;
	}
	if (READ_CMDS.has(exe)) return { class: "read", reason: `"${exe}" is read-only` };
	if (WRITE_CMDS.has(exe)) return { class: "write", reason: `"${exe}" is a known local command` };
	return unknown(`unrecognized command "${exe}"`);
}
