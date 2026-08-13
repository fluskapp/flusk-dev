//! ECMAScript regex semantics, reproduced deliberately.
//!
//! The TS reference's behavior is defined by JS's `\s` set, its `.` (which
//! excludes all four line terminators) and UTF-16 string lengths. Idiomatic
//! Rust equivalents differ exactly at the edges (`char::is_whitespace` lacks
//! U+FEFF and includes U+0085), and the differential harness asserts byte
//! equality — so the JS definitions are spelled out here and used everywhere.

/// ECMAScript WhiteSpace ∪ LineTerminator — what `\s` (and `trim()`) match.
pub fn is_js_ws(c: char) -> bool {
    matches!(c,
        '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}'
        | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}'
        | '\u{3000}' | '\u{feff}')
}

/// What `.` matches without the `s` flag: anything but a line terminator.
pub fn js_dot(c: char) -> bool {
    !matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}')
}

/// `\w`, and the word class `\b` decides with: ASCII letters, digits, `_`.
pub fn is_word(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_'
}

/// `String.prototype.trim` — the same character set as `\s`.
pub fn js_trim(s: &str) -> &str {
    s.trim_matches(is_js_ws)
}

pub fn js_trim_end(s: &str) -> &str {
    s.trim_end_matches(is_js_ws)
}

/// True when every char could be consumed by a trailing `(.*)$`. A line with
/// a stray `\r` or U+2028/9 fails such a regex ENTIRELY in JS — the pattern
/// has no way to step over what `.` cannot match — and the port must too.
pub fn dot_ok(s: &str) -> bool {
    s.chars().all(js_dot)
}

/// JS `String.length` — UTF-16 code units, which caps and indents count in.
pub fn utf16_len(s: &str) -> usize {
    s.chars().map(char::len_utf16).sum()
}
