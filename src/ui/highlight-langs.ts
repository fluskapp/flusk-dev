/**
 * The vocabulary the highlighter tokenizes with: one `Spec` per language
 * family, plus the alias table that maps a fence's language word onto it.
 *
 * Every pattern here is an alternation of single-character branches under one
 * quantifier, or a lazy scan. That is deliberate: the tokenizer builds one
 * master regex out of these, and a nested quantifier over an unbounded run
 * would let a 500KB minified line backtrack catastrophically.
 */

/** A run of source text and the class it should be wrapped in ("" = plain). */
export interface Token {
	cls: string;
	text: string;
}

export interface Spec {
	/** Comment forms, longest first. */
	comment: string;
	/** String literal forms, longest first. */
	string: string;
	keywords: ReadonlySet<string>;
	/** True where a string followed by `:` is an object key (JSON). */
	key?: true;
}

const kw = (words: string): ReadonlySet<string> => new Set(words.split(" "));

/**
 * `"…"` with escapes and no newline inside, written as an UNROLLED loop —
 * `[^"\\\n]*(?:\\.[^"\\\n]*)*` — never as `(?:[^"\\\n]|\\.)*`.
 *
 * The obvious form puts an alternation under a quantifier, which is the
 * classic catastrophic-backtracking shape: 600KB of `"\` pairs took FIVE
 * MINUTES of blocked event loop before the tokenizer gave up on the opening
 * quote. Unrolled, the two branches are disjoint at every position and the
 * scan is linear. The second alternative is the unterminated case, so a quote
 * with no partner ends at the newline instead of being retried at every later
 * quote in the block.
 */
function quoted(q: string): string {
	const body = `[^${q}\\\\\\n]*(?:\\\\.[^${q}\\\\\\n]*)*`;
	return `${q}${body}${q}|${q}${body}`;
}

/**
 * Every multi-line form ends with an UNTERMINATED alternative that runs to the
 * end of input. Without it an opener that never closes is retried at every
 * later position — `"/*a".repeat(300_000)` inside a ```ts fence made the lazy
 * `[\s\S]*?` re-scan to end-of-input once per `/`, which is quadratic and
 * blocked the event loop for two minutes. It is also how every real
 * highlighter renders: an unclosed `/*` comments out the rest of the block.
 */
const TICK_BODY = "[^`\\\\]*(?:\\\\.[^`\\\\]*)*";
const BACKTICK = `\`${TICK_BODY}\`|\`${TICK_BODY}`;
const SLASHES = "//[^\\n]*|/\\*[\\s\\S]*?\\*/|/\\*[\\s\\S]*$";
const HASH = "#[^\\n]*";

const JS_KW = kw(
	"abstract any as async await boolean break case catch class const continue declare default" +
		" delete do else enum export extends false finally for from function get if implements" +
		" import in infer instanceof interface keyof let namespace never new null number of" +
		" package private protected public readonly return satisfies set static string super" +
		" switch this throw true try type typeof undefined unknown var void while with yield",
);

const RUST_KW = kw(
	"as async await bool break const continue crate dyn else enum extern f32 f64 false fn for" +
		" i16 i32 i64 i8 if impl in isize let loop macro_rules match mod move mut None Ok Option" +
		" pub ref Result return self Self Some static str String struct super trait true type u16" +
		" u32 u64 u8 unsafe use usize Vec where while Err",
);

const PY_KW = kw(
	"and as assert async await break case class continue def del elif else except False finally" +
		" for from global if import in is lambda match None nonlocal not or pass raise return" +
		" self True try while with yield",
);

const SH_KW = kw(
	"alias case cd do done elif else esac eval exec exit export fi for function if in local" +
		" readonly return set shift source then trap unset until while",
);

export const SPECS: Readonly<Record<string, Spec>> = {
	ts: {
		comment: SLASHES,
		string: [quoted('"'), quoted("'"), BACKTICK].join("|"),
		keywords: JS_KW,
	},
	rust: { comment: SLASHES, string: [quoted('"'), quoted("'")].join("|"), keywords: RUST_KW },
	python: {
		comment: HASH,
		string: [
			'"""[\\s\\S]*?"""',
			"'''[\\s\\S]*?'''",
			'"""[\\s\\S]*$',
			"'''[\\s\\S]*$",
			quoted('"'),
			quoted("'"),
		].join("|"),
		keywords: PY_KW,
	},
	bash: { comment: HASH, string: [quoted('"'), quoted("'")].join("|"), keywords: SH_KW },
	json: {
		comment: SLASHES,
		string: quoted('"'),
		keywords: kw("true false null"),
		key: true,
	},
};

const ALIASES: Readonly<Record<string, string>> = {
	bash: "bash",
	cjs: "ts",
	console: "bash",
	diff: "diff",
	javascript: "ts",
	js: "ts",
	json: "json",
	json5: "json",
	jsonc: "json",
	jsx: "ts",
	markdown: "md",
	md: "md",
	mjs: "ts",
	patch: "diff",
	py: "python",
	python: "python",
	python3: "python",
	rs: "rust",
	rust: "rust",
	sh: "bash",
	shell: "bash",
	tsx: "ts",
	ts: "ts",
	typescript: "ts",
	yaml: "yaml",
	yml: "yaml",
	zsh: "bash",
};

/** The family a fence's language word belongs to, or "" when unsupported. */
export function resolveLang(lang: string): string {
	if (typeof lang !== "string") return "";
	const key = lang.trim().toLowerCase().replace(/^\./, "");
	return ALIASES[key] ?? "";
}
