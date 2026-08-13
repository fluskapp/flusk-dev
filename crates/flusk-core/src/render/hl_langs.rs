//! The vocabulary the highlighter tokenizes with: one `Spec` per language
//! family, plus the alias table that maps a fence's language word onto it.
//! The string-form lists keep the reference's alternation ORDER — terminated
//! before unterminated — because the order is the tie-break.

use std::collections::HashSet;
use std::sync::OnceLock;

use super::js::js_trim;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Family {
    Ts,
    Rust,
    Python,
    Bash,
    Json,
    Diff,
    Yaml,
    Md,
}

/// String literal forms, tried in slice order at every position.
#[derive(Clone, Copy)]
pub enum StrForm {
    TripleTerm(char),
    TripleUnterm(char),
    Quoted(char),
    Backtick,
}

#[derive(Clone, Copy)]
pub enum Comment {
    Slashes,
    Hash,
}

#[derive(Clone, Copy)]
pub struct Spec {
    pub comment: Comment,
    pub strings: &'static [StrForm],
    /// True where a string followed by `:` is an object key (JSON).
    pub key: bool,
}

const TS_STRINGS: &[StrForm] = &[StrForm::Quoted('"'), StrForm::Quoted('\''), StrForm::Backtick];
const RUST_STRINGS: &[StrForm] = &[StrForm::Quoted('"'), StrForm::Quoted('\'')];
const PY_STRINGS: &[StrForm] = &[
    StrForm::TripleTerm('"'),
    StrForm::TripleTerm('\''),
    StrForm::TripleUnterm('"'),
    StrForm::TripleUnterm('\''),
    StrForm::Quoted('"'),
    StrForm::Quoted('\''),
];
const JSON_STRINGS: &[StrForm] = &[StrForm::Quoted('"')];

pub fn spec(f: Family) -> Option<Spec> {
    Some(match f {
        Family::Ts => Spec { comment: Comment::Slashes, strings: TS_STRINGS, key: false },
        Family::Rust => Spec { comment: Comment::Slashes, strings: RUST_STRINGS, key: false },
        Family::Python => Spec { comment: Comment::Hash, strings: PY_STRINGS, key: false },
        Family::Bash => Spec { comment: Comment::Hash, strings: RUST_STRINGS, key: false },
        Family::Json => Spec { comment: Comment::Slashes, strings: JSON_STRINGS, key: true },
        Family::Diff | Family::Yaml | Family::Md => return None,
    })
}

const JS_KW: &str = "abstract any as async await boolean break case catch class const continue declare default delete do else enum export extends false finally for from function get if implements import in infer instanceof interface keyof let namespace never new null number of package private protected public readonly return satisfies set static string super switch this throw true try type typeof undefined unknown var void while with yield";

const RUST_KW: &str = "as async await bool break const continue crate dyn else enum extern f32 f64 false fn for i16 i32 i64 i8 if impl in isize let loop macro_rules match mod move mut None Ok Option pub ref Result return self Self Some static str String struct super trait true type u16 u32 u64 u8 unsafe use usize Vec where while Err";

const PY_KW: &str = "and as assert async await break case class continue def del elif else except False finally for from global if import in is lambda match None nonlocal not or pass raise return self True try while with yield";

const SH_KW: &str = "alias case cd do done elif else esac eval exec exit export fi for function if in local readonly return set shift source then trap unset until while";

const JSON_KW: &str = "true false null";

fn kw(words: &'static str, cell: &'static OnceLock<HashSet<&'static str>>) -> &'static HashSet<&'static str> {
    cell.get_or_init(|| words.split(' ').collect())
}

pub fn is_keyword(f: Family, word: &str) -> bool {
    static JS: OnceLock<HashSet<&str>> = OnceLock::new();
    static RS: OnceLock<HashSet<&str>> = OnceLock::new();
    static PY: OnceLock<HashSet<&str>> = OnceLock::new();
    static SH: OnceLock<HashSet<&str>> = OnceLock::new();
    static JSON: OnceLock<HashSet<&str>> = OnceLock::new();
    match f {
        Family::Ts => kw(JS_KW, &JS).contains(word),
        Family::Rust => kw(RUST_KW, &RS).contains(word),
        Family::Python => kw(PY_KW, &PY).contains(word),
        Family::Bash => kw(SH_KW, &SH).contains(word),
        Family::Json => kw(JSON_KW, &JSON).contains(word),
        Family::Diff | Family::Yaml | Family::Md => false,
    }
}

/// The family a fence's language word belongs to, or None when unsupported.
/// `trim → toLowerCase → strip one leading "."`, in the reference's order.
pub fn resolve_lang(lang: &str) -> Option<Family> {
    let lowered = js_trim(lang).to_lowercase();
    let key = lowered.strip_prefix('.').unwrap_or(&lowered);
    Some(match key {
        "bash" | "console" | "sh" | "shell" | "zsh" => Family::Bash,
        "cjs" | "javascript" | "js" | "jsx" | "mjs" | "ts" | "tsx" | "typescript" => Family::Ts,
        "diff" | "patch" => Family::Diff,
        "json" | "json5" | "jsonc" => Family::Json,
        "markdown" | "md" => Family::Md,
        "py" | "python" | "python3" => Family::Python,
        "rs" | "rust" => Family::Rust,
        "yaml" | "yml" => Family::Yaml,
        _ => return None,
    })
}
