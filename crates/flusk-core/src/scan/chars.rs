//! Character-level helpers that reproduce JS regex semantics — `\w`, `\s`,
//! `\b`, literal and case-insensitive matching, greedy runs — for the
//! hand-written matchers in scrub*/revert. No regex crate is in the
//! dependency tree, so every reference pattern is a purpose-built scan whose
//! match and backtracking order mirrors the regex it ports.

/// JS `\w`: ASCII alphanumeric or underscore.
pub(crate) fn is_word(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_'
}

/// JS `\s`: ECMA-262 WhiteSpace + LineTerminator (incl. NBSP and BOM).
pub(crate) fn js_space(c: char) -> bool {
    matches!(c,
        '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}'
        | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}'
        | '\u{205f}' | '\u{3000}' | '\u{feff}')
}

/// JS `.trim()`: strip the `\s` set from both ends.
pub(crate) fn js_trim(s: &str) -> &str {
    s.trim_matches(js_space)
}

/// JS `\b` at position `i`: exactly one neighbour is a word char.
pub(crate) fn boundary(ch: &[char], i: usize) -> bool {
    let before = i > 0 && is_word(ch[i - 1]);
    let after = i < ch.len() && is_word(ch[i]);
    before != after
}

/// Case-sensitive literal at `i`; Some(end) on success. Empty literal matches.
pub(crate) fn lit(ch: &[char], i: usize, s: &str) -> Option<usize> {
    let mut j = i;
    for c in s.chars() {
        if ch.get(j) != Some(&c) {
            return None;
        }
        j += 1;
    }
    Some(j)
}

/// ASCII case-insensitive literal at `i` — the `/i` flag for our patterns,
/// whose literals are all ASCII.
pub(crate) fn lit_ci(ch: &[char], i: usize, s: &str) -> Option<usize> {
    let mut j = i;
    for c in s.chars() {
        match ch.get(j) {
            Some(g) if g.eq_ignore_ascii_case(&c) => j += 1,
            _ => return None,
        }
    }
    Some(j)
}

/// End of the maximal (greedy) run from `i` of chars satisfying `f`.
pub(crate) fn run(ch: &[char], i: usize, f: impl Fn(char) -> bool) -> usize {
    let mut j = i;
    while j < ch.len() && f(ch[j]) {
        j += 1;
    }
    j
}

/// A matcher: proposes (match end, replacement) for a match STARTING at the
/// given position, or None.
pub(crate) type Finder = fn(&[char], usize) -> Option<(usize, String)>;

/// One `String.replace(/re/g, …)` pass. `find` proposes a match STARTING at
/// the given position; on a miss the scan advances one char — the regex
/// engine's bump-along loop — and after a hit it resumes at the match end,
/// which is what keeps the interior of a replaced (or kept) match unscanned.
pub(crate) fn replace_scan(ch: &[char], find: Finder) -> Vec<char> {
    let mut out = Vec::with_capacity(ch.len());
    let mut i = 0;
    while i < ch.len() {
        match find(ch, i) {
            Some((end, rep)) if end > i => {
                out.extend(rep.chars());
                i = end;
            }
            _ => {
                out.push(ch[i]);
                i += 1;
            }
        }
    }
    out
}
