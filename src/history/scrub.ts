/**
 * Secret scrubbing for everything that enters the history index.
 *
 * Indexed history is not archived, it is REPLAYED: cards end up inside a
 * composed prompt that may be handed to a model. So a key that was pasted into
 * a commit message in 2023 would leave the machine in 2026. Scrubbing happens
 * at index time, once, rather than at prompt time, so no later path can forget.
 *
 * Two deliberate biases:
 *
 * 1. **We err toward over-redaction.** A false positive costs one mangled word
 *    of search text; a false negative leaks a live credential. So loose shapes
 *    (`api_key=<anything>`) are redacted even though plenty of them are
 *    `api_key=process.env.KEY`.
 * 2. **Except for two public digest shapes, which are preserved verbatim**: a
 *    40/64-char lowercase-hex git sha, and a `sha256-|sha384-|sha512-`
 *    integrity digest. Both are public by construction, and both are
 *    identifiers a reader needs intact — a commit card whose sha has been
 *    replaced by a marker is useless. Every other high-entropy run >= 32 chars
 *    is redacted.
 *
 * Cost: a fixed set of linear regex passes, no allocation beyond the replaced
 * copies. It runs over every commit body, journal and doc in the corpus.
 */

const mark = (kind: string): string => `[redacted: ${kind}]`;

/** Git emits lowercase; sha1 is 40 chars, sha256 64. */
const isGitSha = (s: string): boolean => /^[0-9a-f]{40}$/.test(s) || /^[0-9a-f]{64}$/.test(s);

/**
 * Random base64 spreads digits and both cases throughout; identifiers do not.
 * A bare "has one of each" test flagged `AccountSecurityPanelContainer2` — real
 * entropy needs a PROPORTION of each class, roughly one per twelve characters.
 */
function highEntropy(s: string): boolean {
	const need = Math.ceil(s.length / 12);
	const count = (re: RegExp): number => (s.match(re) ?? []).length;
	return count(/[a-z]/g) >= need && count(/[A-Z]/g) >= need && count(/[0-9]/g) >= need;
}

/** `sha512-<digest>` in a lockfile: a public integrity hash, never a secret. */
const afterIntegrityPrefix = (whole: string, offset: number): boolean =>
	/sha(256|384|512)-$/.test(whole.slice(Math.max(0, offset - 7), offset));

const PEM = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
const AWS = /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g;
const GH_TOKEN = /\b(?:ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{16,}\b/g;
const GH_PAT = /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g;
const ANTHROPIC = /\bsk-ant-[A-Za-z0-9_-]{16,}/g;
const OPENAI = /\bsk-[A-Za-z0-9_-]{16,}/g;
/** Underscore/dot families the `sk-` shapes above cannot reach. */
const VENDOR =
	/\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}|\bnpm_[A-Za-z0-9]{30,}|\bxox[baprs]-[A-Za-z0-9-]{10,}|\bglpat-[A-Za-z0-9_-]{16,}|\bAIza[0-9A-Za-z_-]{35}/g;
const WEBHOOK = /\bhooks\.slack\.com\/services\/\S+|\bdiscord(?:app)?\.com\/api\/webhooks\/\S+/gi;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/g;
/**
 * `scheme://user:pass@host` — a git remote, a DATABASE_URL in a commit body, a
 * `git clone` line in a transcript. The host is kept: it is the part a reader
 * needs, and it is not the secret.
 */
const URL_AUTH = /\b([a-z][a-z0-9+.-]*:\/\/)[^/\s:@]+:[^/\s@]+@/gi;
/**
 * `key = value` credentials. The key is kept so the text still says what was
 * removed (and still matches a search for "password"); only the value goes.
 * The lookahead skips a value that is already a marker, which is what makes
 * redact() idempotent — text can be scrubbed again on its way into a prompt.
 *
 * The key may carry a PREFIX (`DB_PASSWORD`, `AWS_SECRET_ACCESS_KEY`) and a
 * quote (`"password": "…"`): a leading `\b` matched neither, because `\b` does
 * not exist between `_` and a letter, and a `"` sits between key and `:` in
 * every JSON/YAML/compose file. Those two shapes are most of what leaks.
 * The key must END at the keyword, so `max_tokens=4096` and `tokenizer: x`
 * — words this corpus is genuinely about — are not mistaken for credentials.
 */
const KEY =
	"(?:[A-Za-z0-9]+[_-])*(?:passwd|password|secret[_-]?key|client[_-]?secret|secret|api[_-]?key|access[_-]?key|private[_-]?key|access[_-]?token|auth[_-]?token|api[_-]?token|refresh[_-]?token|token)";
const ASSIGN = new RegExp(
	`(?<![A-Za-z0-9_.-])(${KEY})["']?\\s*[:=]\\s*(?!\\[redacted:)(?:"[^"\\n]*"|'[^'\\n]*'|[^\\s"',;)&]+)`,
	"gi",
);
const HEX = /\b[0-9a-fA-F]{32,}\b/g;
/**
 * No "/" in the charset, deliberately. Base64 may contain it, but so does
 * every file path, and a path is the single most valuable thing a history card
 * carries: with "/" included this rule redacted the path list of 679 of 793
 * real commits (`base44/functions/handleUserThing` is 33 mixed chars). Paths
 * therefore break the run into segments, none of which clears the bar. The
 * named-provider rules above, not this one, are what catch real keys.
 */
const B64 = /\b[A-Za-z0-9+]{32,}={0,2}/g;

function assignKind(key: string): string {
	if (/pass/i.test(key)) return "password";
	if (/token/i.test(key)) return "token";
	if (/secret/i.test(key) && !/key/i.test(key)) return "secret";
	return "api key";
}

/** Replaces every recognised secret shape with a marker naming its kind. */
export function redact(text: string): string {
	if (text === "") return text;
	let out = text;
	out = out.replace(PEM, mark("private key"));
	out = out.replace(AWS, mark("aws key"));
	out = out.replace(GH_TOKEN, mark("github token"));
	out = out.replace(GH_PAT, mark("github token"));
	out = out.replace(ANTHROPIC, mark("anthropic key"));
	out = out.replace(OPENAI, mark("openai key"));
	out = out.replace(VENDOR, mark("api key"));
	out = out.replace(WEBHOOK, mark("webhook url"));
	out = out.replace(URL_AUTH, (_m, scheme: string) => `${scheme}${mark("url credentials")}@`);
	out = out.replace(BEARER, `Bearer ${mark("bearer token")}`);
	out = out.replace(ASSIGN, (_m, key: string) => `${key}=${mark(assignKind(key))}`);
	out = out.replace(HEX, (m: string) => (isGitSha(m) ? m : mark("hash")));
	out = out.replace(B64, (m: string, offset: number, whole: string) => {
		if (/^[0-9a-f]+$/.test(m)) return m; // hex was already judged above
		if (!highEntropy(m) || afterIntegrityPrefix(whole, offset)) return m;
		return mark("secret");
	});
	return out;
}
