//! The three emphasis passes of markdown-inline.ts, as bump-along scanners.
//!
//! Each pass scans its INPUT and builds a new string — `.replace(/…/g)`
//! semantics — so a replacement never feeds a later match in the same pass,
//! and the passes compose in the reference's order: `**` first, then `*`,
//! then boundary-guarded `_` (this corpus is full of snake_case identifiers;
//! treating those underscores as emphasis rewrites the very names a journal
//! exists to record).

use super::js::is_js_ws;

/// The lookaround class of the `_` pass, written literally in the reference.
fn is_word_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_'
}

fn wrap(out: &mut String, tag: &str, body: &[char]) {
    out.push('<');
    out.push_str(tag);
    out.push('>');
    out.extend(body.iter());
    out.push_str("</");
    out.push_str(tag);
    out.push('>');
}

/// `/\*\*([^*]+)\*\*/g`
fn pass_strong(s: &str) -> String {
    let cs: Vec<char> = s.chars().collect();
    let n = cs.len();
    let mut out = String::with_capacity(s.len());
    let mut p = 0;
    while p < n {
        if cs[p] == '*' && p + 1 < n && cs[p + 1] == '*' && p + 2 < n && cs[p + 2] != '*' {
            let mut q = p + 2;
            while q < n && cs[q] != '*' {
                q += 1;
            }
            if q + 1 < n && cs[q + 1] == '*' {
                wrap(&mut out, "strong", &cs[p + 2..q]);
                p = q + 2;
                continue;
            }
        }
        out.push(cs[p]);
        p += 1;
    }
    out
}

/// `/\*([^*\s][^*]*)\*/g`
fn pass_em_star(s: &str) -> String {
    let cs: Vec<char> = s.chars().collect();
    let n = cs.len();
    let mut out = String::with_capacity(s.len());
    let mut p = 0;
    while p < n {
        if cs[p] == '*' && p + 1 < n && cs[p + 1] != '*' && !is_js_ws(cs[p + 1]) {
            let mut q = p + 2;
            while q < n && cs[q] != '*' {
                q += 1;
            }
            if q < n {
                wrap(&mut out, "em", &cs[p + 1..q]);
                p = q + 1;
                continue;
            }
        }
        out.push(cs[p]);
        p += 1;
    }
    out
}

/// `/(?<![A-Za-z0-9_])_([^_\s][^_]*)_(?![A-Za-z0-9_])/g` — the lookarounds
/// read the INPUT string, which bump-along over `cs` reproduces exactly.
fn pass_em_underscore(s: &str) -> String {
    let cs: Vec<char> = s.chars().collect();
    let n = cs.len();
    let mut out = String::with_capacity(s.len());
    let mut p = 0;
    while p < n {
        if cs[p] == '_'
            && (p == 0 || !is_word_char(cs[p - 1]))
            && p + 1 < n
            && cs[p + 1] != '_'
            && !is_js_ws(cs[p + 1])
        {
            let mut q = p + 2;
            while q < n && cs[q] != '_' {
                q += 1;
            }
            if q < n && (q + 1 >= n || !is_word_char(cs[q + 1])) {
                wrap(&mut out, "em", &cs[p + 1..q]);
                p = q + 1;
                continue;
            }
        }
        out.push(cs[p]);
        p += 1;
    }
    out
}

pub fn emphasis(s: &str) -> String {
    pass_em_underscore(&pass_em_star(&pass_strong(s)))
}
