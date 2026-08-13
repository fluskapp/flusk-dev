//! The revert grammar from source-git.repository.ts: only a subject that
//! OPENS with a revert says the work was taken back ("feat: add undo button"
//! ships an undo FEATURE), and a failing commit may name what it undid — a
//! sha or a quoted subject — which marks the REFERENCED commit failed too.

use super::chars::{boundary, is_word, js_space, js_trim, lit_ci, run};

/// REVERT_SUBJECT: `/^revert\b|^\w+(\([^)]*\))?!?:\s*revert\b/i` on the
/// trimmed subject.
pub fn is_failure(subject: &str) -> bool {
    let t: Vec<char> = js_trim(subject).chars().collect();
    if let Some(e) = lit_ci(&t, 0, "revert") {
        if boundary(&t, e) {
            return true;
        }
    }
    // ^\w+ then optional (scope), optional !, then ':' — all deterministic:
    // a shorter \w+ ends at a word char, which none of the followers accept.
    let mut j = run(&t, 0, is_word);
    if j == 0 {
        return false;
    }
    if t.get(j) == Some(&'(') {
        let close = run(&t, j + 1, |c| c != ')');
        if t.get(close) != Some(&')') {
            return false; // unclosed scope: the no-group branch dies on '('
        }
        j = close + 1;
    }
    if t.get(j) == Some(&'!') {
        j += 1;
    }
    if t.get(j) != Some(&':') {
        return false;
    }
    j = run(&t, j + 1, js_space);
    match lit_ci(&t, j, "revert") {
        Some(e) => boundary(&t, e),
        None => false,
    }
}

/// REF_SHA: `/\brevert(?:s|ed)?\s+(?:commit\s+)?([0-9a-f]{7,40})\b/gi`.
/// A hex run longer than 40 (or one glued to a word char) never matches:
/// every backtracked end lands on a word char and `\b` fails.
fn ref_sha_at(ch: &[char], i: usize) -> Option<(usize, String)> {
    if !boundary(ch, i) {
        return None;
    }
    let base = lit_ci(ch, i, "revert")?;
    for suffix in ["s", "ed", ""] {
        let Some(j) = lit_ci(ch, base, suffix) else { continue };
        let k = run(ch, j, js_space);
        if k == j {
            continue; // \s+ needs at least one
        }
        let with_commit = lit_ci(ch, k, "commit")
            .map(|c| run(ch, c, js_space))
            .filter(|&s| s > k + 6);
        for start in [with_commit, Some(k)].into_iter().flatten() {
            let e = run(ch, start, |c| c.is_ascii_hexdigit());
            let n = e - start;
            if (7..=40).contains(&n) && !(e < ch.len() && is_word(ch[e])) {
                return Some((e, ch[start..e].iter().collect()));
            }
        }
    }
    None
}

/// REF_SUBJECT: `/\brevert(?:s|ed)?:?\s+"([^"\n]+)"/gi`.
fn ref_subject_at(ch: &[char], i: usize) -> Option<(usize, String)> {
    if !boundary(ch, i) {
        return None;
    }
    let base = lit_ci(ch, i, "revert")?;
    for suffix in ["s", "ed", ""] {
        let Some(j) = lit_ci(ch, base, suffix) else { continue };
        for with_colon in [true, false] {
            let mut k = j;
            if with_colon {
                if ch.get(k) != Some(&':') {
                    continue;
                }
                k += 1;
            }
            let sp = run(ch, k, js_space);
            if sp == k || ch.get(sp) != Some(&'"') {
                continue;
            }
            let s = sp + 1;
            let e = run(ch, s, |c| c != '"' && c != '\n');
            if e > s && ch.get(e) == Some(&'"') {
                return Some((e + 1, ch[s..e].iter().collect()));
            }
        }
    }
    None
}

fn scan_all(ch: &[char], find: super::chars::Finder, refs: &mut Vec<String>) {
    let mut i = 0;
    while i < ch.len() {
        match find(ch, i) {
            Some((end, cap)) if end > i => {
                refs.push(cap);
                i = end;
            }
            _ => i += 1,
        }
    }
}

/// Whatever a failing commit says it undid: shas first, then quoted subjects
/// — the reference runs the two matchAll passes in that order.
pub fn collect_refs(message: &str, refs: &mut Vec<String>) {
    let ch: Vec<char> = message.chars().collect();
    scan_all(&ch, ref_sha_at, refs);
    scan_all(&ch, ref_subject_at, refs);
}
