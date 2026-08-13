//! The markdown line highlighter: a line's class is decided by its prefix,
//! then code spans / links / bold runs are picked out inside it.

use super::hl_lines::by_line;
use super::hl_scan::Token;
use super::js::{dot_ok, is_js_ws};

/// Heading / quote / fence lines take one class for the whole line.
fn md_prefix_class(line: &str) -> Option<&'static str> {
    let cs: Vec<char> = line.chars().collect();
    let mut i = 0;
    while i < cs.len() && is_js_ws(cs[i]) {
        i += 1;
    }
    let rest = &cs[i..];
    let mut h = 0;
    while h < rest.len() && rest[h] == '#' {
        h += 1;
    }
    if (1..=6).contains(&h) && h < rest.len() && is_js_ws(rest[h]) {
        return Some("hl-kw"); // ^\s*#{1,6}\s
    }
    if rest.first() == Some(&'>') {
        return Some("hl-com");
    }
    if rest.starts_with(&['`', '`', '`']) || rest.starts_with(&['~', '~', '~']) {
        return Some("hl-punct");
    }
    None
}

/// `^(\s*(?:[-*+]|\d+\.)\s)(.*)$` → byte index where the marker group ends.
fn md_marker_split(line: &str) -> Option<usize> {
    let cs: Vec<(usize, char)> = line.char_indices().collect();
    let mut i = 0;
    while i < cs.len() && is_js_ws(cs[i].1) {
        i += 1;
    }
    if i < cs.len() && matches!(cs[i].1, '-' | '*' | '+') {
        i += 1;
    } else {
        let d0 = i;
        while i < cs.len() && cs[i].1.is_ascii_digit() {
            i += 1;
        }
        if i == d0 || i >= cs.len() || cs[i].1 != '.' {
            return None;
        }
        i += 1;
    }
    if i >= cs.len() || !is_js_ws(cs[i].1) {
        return None;
    }
    i += 1;
    let rest = cs.get(i).map_or(line.len(), |p| p.0);
    dot_ok(&line[rest..]).then_some(rest)
}

/// Inside a markdown line: code spans, links, bold runs —
/// ``/`[^`\n]*`|\[[^\]\n]*\]\([^)\s]*\)|\*\*[^*\n]+\*\*/g``.
fn md_inline_find(cs: &[(usize, char)], from: usize) -> Option<(usize, usize, &'static str)> {
    let n = cs.len();
    let mut p = from;
    while p < n {
        match cs[p].1 {
            '`' => {
                let mut j = p + 1;
                while j < n && cs[j].1 != '`' && cs[j].1 != '\n' {
                    j += 1;
                }
                if j < n && cs[j].1 == '`' {
                    return Some((p, j + 1, "hl-str"));
                }
            }
            '[' => {
                let mut j = p + 1;
                while j < n && cs[j].1 != ']' && cs[j].1 != '\n' {
                    j += 1;
                }
                if j + 1 < n && cs[j].1 == ']' && cs[j + 1].1 == '(' {
                    let mut k = j + 2;
                    while k < n && cs[k].1 != ')' && !is_js_ws(cs[k].1) {
                        k += 1;
                    }
                    if k < n && cs[k].1 == ')' {
                        return Some((p, k + 1, "hl-fn"));
                    }
                }
            }
            '*' if p + 1 < n && cs[p + 1].1 == '*' => {
                let mut j = p + 2;
                while j < n && cs[j].1 != '*' && cs[j].1 != '\n' {
                    j += 1;
                }
                if j > p + 2 && j + 1 < n && cs[j].1 == '*' && cs[j + 1].1 == '*' {
                    return Some((p, j + 2, "hl-kw"));
                }
            }
            _ => {}
        }
        p += 1;
    }
    None
}

fn md_inline<'a>(line: &'a str, out: &mut Vec<Token<'a>>) {
    let cs: Vec<(usize, char)> = line.char_indices().collect();
    let b = |i: usize| cs.get(i).map_or(line.len(), |p| p.0);
    let mut last = 0;
    while let Some((a, e, cls)) = md_inline_find(&cs, last) {
        out.push(Token { cls: "", text: &line[b(last)..b(a)] });
        out.push(Token { cls, text: &line[b(a)..b(e)] });
        last = e;
    }
    out.push(Token { cls: "", text: &line[b(last)..] });
}

pub fn md_tokens(code: &str) -> Vec<Token<'_>> {
    by_line(code, |line, out| {
        if let Some(cls) = md_prefix_class(line) {
            out.push(Token { cls, text: line });
            return;
        }
        match md_marker_split(line) {
            None => md_inline(line, out),
            Some(split) => {
                out.push(Token { cls: "hl-punct", text: &line[..split] });
                md_inline(&line[split..], out);
            }
        }
    })
}
