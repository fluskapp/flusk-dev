//! redact() port — secret scrubbing for everything that enters the history
//! index. Same two deliberate biases as the reference: err toward
//! over-redaction, EXCEPT the two public digest shapes (a 40/64-char
//! lowercase-hex git sha, an `sha256-|sha384-|sha512-` integrity digest),
//! which a reader needs intact. Passes run in the reference's order over the
//! previous pass's output, so sequencing effects (an anthropic key never
//! reaching the openai rule) are preserved.

use super::chars::{boundary, is_word, replace_scan, run, Finder};
use super::{scrub_assign, scrub_tokens, scrub_urls};

pub(crate) fn mark(kind: &str) -> String {
    format!("[redacted: {kind}]")
}

/// Git emits lowercase; sha1 is 40 chars, sha256 64.
fn is_git_sha(s: &str) -> bool {
    (s.len() == 40 || s.len() == 64) && s.chars().all(|c| matches!(c, '0'..='9' | 'a'..='f'))
}

/// Random base64 needs a PROPORTION of each class, roughly one per twelve
/// characters — a bare "has one of each" test flagged ordinary identifiers.
fn high_entropy(s: &str) -> bool {
    let need = s.chars().count().div_ceil(12);
    let count = |f: fn(&char) -> bool| s.chars().filter(f).count();
    count(char::is_ascii_lowercase) >= need
        && count(char::is_ascii_uppercase) >= need
        && count(char::is_ascii_digit) >= need
}

/// `sha512-<digest>` in a lockfile: a public integrity hash, never a secret.
fn after_integrity_prefix(ch: &[char], offset: usize) -> bool {
    let from = offset.saturating_sub(7);
    let head: String = ch[from..offset].iter().collect();
    matches!(head.as_str(), "sha256-" | "sha384-" | "sha512-")
}

/// HEX: `\b[0-9a-fA-F]{32,}\b`. A run glued to a word char never matches:
/// every backtracked end lands on a hex (word) char and `\b` fails.
fn hex_at(ch: &[char], i: usize) -> Option<(usize, String)> {
    if !ch[i].is_ascii_hexdigit() || !boundary(ch, i) {
        return None;
    }
    let e = run(ch, i, |c| c.is_ascii_hexdigit());
    if e - i < 32 || (e < ch.len() && is_word(ch[e])) {
        return None;
    }
    let m: String = ch[i..e].iter().collect();
    if is_git_sha(&m) {
        return Some((e, m)); // kept, but the scan resumes after it
    }
    Some((e, mark("hash")))
}

/// B64: `\b[A-Za-z0-9+]{32,}={0,2}` with the entropy/integrity callback.
/// No "/" in the charset, deliberately: paths break the run into segments.
fn b64_at(ch: &[char], i: usize) -> Option<(usize, String)> {
    let in_class = |c: char| c.is_ascii_alphanumeric() || c == '+';
    if !in_class(ch[i]) || !boundary(ch, i) {
        return None;
    }
    let e = run(ch, i, in_class);
    if e - i < 32 {
        return None;
    }
    let mut end = e;
    for _ in 0..2 {
        if ch.get(end) == Some(&'=') {
            end += 1;
        }
    }
    let m: String = ch[i..end].iter().collect();
    if m.chars().all(|c| matches!(c, '0'..='9' | 'a'..='f')) {
        return Some((end, m)); // hex was already judged by the pass above
    }
    if !high_entropy(&m) || after_integrity_prefix(ch, i) {
        return Some((end, m));
    }
    Some((end, mark("secret")))
}

/// Replaces every recognised secret shape with a marker naming its kind.
pub fn redact(text: &str) -> String {
    if text.is_empty() {
        return String::new();
    }
    let passes: [Finder; 13] = [
        scrub_tokens::pem_at,
        scrub_tokens::aws_at,
        scrub_tokens::gh_token_at,
        scrub_tokens::gh_pat_at,
        scrub_tokens::anthropic_at,
        scrub_tokens::openai_at,
        scrub_urls::vendor_at,
        scrub_urls::webhook_at,
        scrub_urls::url_auth_at,
        scrub_urls::bearer_at,
        scrub_assign::assign_at,
        hex_at,
        b64_at,
    ];
    let mut ch: Vec<char> = text.chars().collect();
    for pass in passes {
        ch = replace_scan(&ch, pass);
    }
    ch.into_iter().collect()
}
