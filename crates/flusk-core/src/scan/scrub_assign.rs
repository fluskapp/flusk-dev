//! The ASSIGN pass of redact(): `key = value` credentials. The key is kept so
//! the text still says what was removed; only the value goes. The key may
//! carry a prefix chain (`DB_PASSWORD`) and a quote (`"password": …`), and
//! must END at a keyword — `max_tokens=4096` and `tokenizer: x` are words
//! this corpus is genuinely about, not credentials. The reference regex's
//! backtracking order is reproduced exactly: most prefix segments first,
//! keyword alternatives in declaration order, quote consumed greedily,
//! value alternatives double-quoted → single-quoted → bare.

use super::chars::{js_space, lit, lit_ci, run};
use super::scrub::mark;

/// The keyword alternation, expanded: each `[_-]?` tries the separator forms
/// (whichever char is present) before the fused form, like the greedy `?`.
const KEYWORDS: [&str; 31] = [
    "passwd", "password",
    "secret_key", "secret-key", "secretkey",
    "client_secret", "client-secret", "clientsecret",
    "secret",
    "api_key", "api-key", "apikey",
    "access_key", "access-key", "accesskey",
    "private_key", "private-key", "privatekey",
    "access_token", "access-token", "accesstoken",
    "auth_token", "auth-token", "authtoken",
    "api_token", "api-token", "apitoken",
    "refresh_token", "refresh-token", "refreshtoken",
    "token",
];

fn contains_ci(hay: &str, needle: &str) -> bool {
    hay.to_ascii_lowercase().contains(needle)
}

fn assign_kind(key: &str) -> &'static str {
    if contains_ci(key, "pass") {
        return "password";
    }
    if contains_ci(key, "token") {
        return "token";
    }
    if contains_ci(key, "secret") && !contains_ci(key, "key") {
        return "secret";
    }
    "api key"
}

/// `["']?\s*[:=]\s*(?!\[redacted:)(?:"[^"\n]*"|'[^'\n]*'|[^\s"',;)&]+)`
/// from `j` (after the keyword); Some(match end).
fn assign_tail(ch: &[char], j: usize) -> Option<usize> {
    let quoted = matches!(ch.get(j), Some('"' | '\''));
    let starts = if quoted { vec![j + 1, j] } else { vec![j] };
    for start in starts {
        let a = run(ch, start, js_space);
        if !matches!(ch.get(a), Some(':' | '=')) {
            continue;
        }
        let v = run(ch, a + 1, js_space);
        // (?!\[redacted:) — what makes redact() idempotent.
        if lit(ch, v, "[redacted:").is_some() {
            continue;
        }
        if let Some(&q) = ch.get(v).filter(|c| matches!(c, '"' | '\'')) {
            let e = run(ch, v + 1, |c| c != q && c != '\n');
            if ch.get(e) == Some(&q) {
                return Some(e + 1);
            }
            continue; // unclosed quote: the bare alternative excludes quotes
        }
        let e = run(ch, v, |c| !js_space(c) && !matches!(c, '"' | '\'' | ',' | ';' | ')' | '&'));
        if e > v {
            return Some(e);
        }
    }
    None
}

/// One ASSIGN match starting exactly at `i`, or None.
pub(crate) fn assign_at(ch: &[char], i: usize) -> Option<(usize, String)> {
    // (?<![A-Za-z0-9_.-])
    if i > 0 && (ch[i - 1].is_ascii_alphanumeric() || matches!(ch[i - 1], '_' | '.' | '-')) {
        return None;
    }
    // (?:[A-Za-z0-9]+[_-])* checkpoints — each segment is a maximal
    // alphanumeric run plus one separator, so the chain is deterministic.
    let mut checkpoints = vec![i];
    let mut p = i;
    loop {
        let e = run(ch, p, |c| c.is_ascii_alphanumeric());
        if e == p || !matches!(ch.get(e), Some('_' | '-')) {
            break;
        }
        p = e + 1;
        checkpoints.push(p);
    }
    for &kstart in checkpoints.iter().rev() {
        for kw in KEYWORDS {
            let Some(kend) = lit_ci(ch, kstart, kw) else { continue };
            if let Some(end) = assign_tail(ch, kend) {
                let key: String = ch[i..kend].iter().collect();
                let rep = format!("{key}={}", mark(assign_kind(&key)));
                return Some((end, rep));
            }
        }
    }
    None
}
