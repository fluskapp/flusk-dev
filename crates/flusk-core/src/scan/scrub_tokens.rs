//! Named-shape passes of redact(): PEM blocks and provider key prefixes
//! (the rest live in scrub_urls.rs). Each function is one reference regex,
//! matched at a fixed start position for the replace_scan driver; greedy runs
//! plus the trailing-`\b` analysis stand in for backtracking, which for these
//! charsets is deterministic.

use super::chars::{boundary, is_word, lit, run};
use super::scrub::mark;

pub(crate) type Hit = Option<(usize, String)>;

/// `[A-Z ]*` then `PRIVATE KEY-----`: the class run must END with the label.
fn pem_label(ch: &[char], from: usize) -> Option<usize> {
    let e = run(ch, from, |c| matches!(c, 'A'..='Z' | ' '));
    let tail: String = ch[from.max(e.saturating_sub(11))..e].iter().collect();
    if e - from < 11 || tail != "PRIVATE KEY" {
        return None;
    }
    lit(ch, e, "-----")
}

pub(crate) fn pem_at(ch: &[char], i: usize) -> Hit {
    let b = lit(ch, i, "-----BEGIN ")?;
    let head = pem_label(ch, b)?;
    // `[\s\S]*?` is lazy: the FIRST position where the END marker fits wins.
    let mut k = head;
    while k < ch.len() {
        if let Some(be) = lit(ch, k, "-----END ") {
            if let Some(fin) = pem_label(ch, be) {
                return Some((fin, mark("private key")));
            }
        }
        k += 1;
    }
    None
}

pub(crate) fn aws_at(ch: &[char], i: usize) -> Hit {
    if !boundary(ch, i) {
        return None;
    }
    let e = lit(ch, i, "AKIA").or_else(|| lit(ch, i, "ASIA"))?;
    let end = run(ch, e, |c| matches!(c, '0'..='9' | 'A'..='Z'));
    // {16} exactly, then \b — a longer run leaves a word char after unit 16.
    if end - e < 16 || (e + 16 < ch.len() && is_word(ch[e + 16])) {
        return None;
    }
    Some((e + 16, mark("aws key")))
}

pub(crate) fn gh_token_at(ch: &[char], i: usize) -> Hit {
    if !boundary(ch, i) {
        return None;
    }
    let e = ["ghp_", "gho_", "ghs_", "ghu_", "ghr_"].iter().find_map(|p| lit(ch, i, p))?;
    let end = run(ch, e, |c| c.is_ascii_alphanumeric());
    // trailing \b: an underscore right after the run kills every backtrack.
    if end - e < 16 || ch.get(end) == Some(&'_') {
        return None;
    }
    Some((end, mark("github token")))
}

pub(crate) fn gh_pat_at(ch: &[char], i: usize) -> Hit {
    if !boundary(ch, i) {
        return None;
    }
    let e = lit(ch, i, "github_pat_")?;
    let end = run(ch, e, |c| c.is_ascii_alphanumeric() || c == '_');
    if end - e < 20 {
        return None;
    }
    Some((end, mark("github token")))
}

pub(crate) fn key_charset(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_' || c == '-'
}

pub(crate) fn anthropic_at(ch: &[char], i: usize) -> Hit {
    if !boundary(ch, i) {
        return None;
    }
    let e = lit(ch, i, "sk-ant-")?;
    let end = run(ch, e, key_charset);
    if end - e < 16 {
        return None;
    }
    Some((end, mark("anthropic key")))
}

pub(crate) fn openai_at(ch: &[char], i: usize) -> Hit {
    if !boundary(ch, i) {
        return None;
    }
    let e = lit(ch, i, "sk-")?;
    let end = run(ch, e, key_charset);
    if end - e < 16 {
        return None;
    }
    Some((end, mark("openai key")))
}
