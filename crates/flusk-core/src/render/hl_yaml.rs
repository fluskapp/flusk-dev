//! The YAML line highlighter: key/punct/value per line, nothing stateful.

use super::hl_lines::by_line;
use super::hl_scan::Token;
use super::js::{dot_ok, is_js_ws, js_dot, js_trim};

fn byte(cs: &[(usize, char)], i: usize, line: &str) -> usize {
    cs.get(i).map_or(line.len(), |p| p.0)
}

/// `^(\s*(?:-\s+)?)([\w.$/-]+)(:)(.*)$` → byte offsets (key start, colon,
/// value start). Two attempts, because `-` is also a key character: the
/// optional `-\s+` group is preferred, but a line it strands (`-  : x`)
/// falls back to matching without it, exactly as backtracking would.
fn yaml_key(line: &str) -> Option<(usize, usize, usize)> {
    let cs: Vec<(usize, char)> = line.char_indices().collect();
    let mut w = 0;
    while w < cs.len() && is_js_ws(cs[w].1) {
        w += 1;
    }
    if w < cs.len() && cs[w].1 == '-' {
        let mut d = w + 1;
        while d < cs.len() && is_js_ws(cs[d].1) {
            d += 1;
        }
        if d > w + 1 {
            if let Some(r) = yaml_key_at(line, &cs, d) {
                return Some(r);
            }
        }
    }
    yaml_key_at(line, &cs, w)
}

fn yaml_key_at(line: &str, cs: &[(usize, char)], start: usize) -> Option<(usize, usize, usize)> {
    let mut i = start;
    while i < cs.len() && (cs[i].1.is_ascii_alphanumeric() || matches!(cs[i].1, '_' | '.' | '$' | '/' | '-')) {
        i += 1;
    }
    if i == start || i >= cs.len() || cs[i].1 != ':' {
        return None;
    }
    let rest = byte(cs, i + 1, line);
    dot_ok(&line[rest..]).then_some((byte(cs, start, line), byte(cs, i, line), rest))
}

/// `/^["'].*["']$/` — first and last char quotes, `.`-matchable middle.
fn quoted_shape(v: &str) -> bool {
    let cs: Vec<char> = v.chars().collect();
    cs.len() >= 2
        && matches!(cs[0], '"' | '\'')
        && matches!(cs[cs.len() - 1], '"' | '\'')
        && cs[1..cs.len() - 1].iter().all(|&c| js_dot(c))
}

/// `/^(true|false|null|~|-?\d[\d._]*(?:e[+-]?\d+)?)$/i`
fn yaml_scalar(v: &str) -> bool {
    if v == "~" || ["true", "false", "null"].iter().any(|w| v.eq_ignore_ascii_case(w)) {
        return true;
    }
    let cs: Vec<char> = v.chars().collect();
    let mut i = usize::from(cs.first() == Some(&'-'));
    if !cs.get(i).is_some_and(|c| c.is_ascii_digit()) {
        return false;
    }
    i += 1;
    while i < cs.len() && (cs[i].is_ascii_digit() || matches!(cs[i], '.' | '_')) {
        i += 1;
    }
    if i == cs.len() {
        return true;
    }
    if !matches!(cs[i], 'e' | 'E') {
        return false;
    }
    i += 1;
    if i < cs.len() && matches!(cs[i], '+' | '-') {
        i += 1;
    }
    i < cs.len() && cs[i..].iter().all(|c| c.is_ascii_digit())
}

/// The value tokens. Trailing whitespace after the value is dropped — the
/// reference emits only the lead and the trimmed value.
fn yaml_value<'a>(raw: &'a str, out: &mut Vec<Token<'a>>) {
    let trimmed = js_trim(raw);
    if trimmed.is_empty() {
        out.push(Token { cls: "", text: raw });
        return;
    }
    let at = raw.find(trimmed).unwrap_or(0);
    let (lead, value) = (&raw[..at], &raw[at..at + trimmed.len()]);
    out.push(Token { cls: "", text: lead });
    let cls = if value.starts_with('#') {
        "hl-com"
    } else if quoted_shape(value) {
        "hl-str"
    } else if yaml_scalar(value) {
        "hl-num"
    } else {
        ""
    };
    out.push(Token { cls, text: value });
}

/// `^\s*(?:---|\.\.\.)\s*$` — document markers.
fn doc_marker(line: &str) -> bool {
    let t = js_trim(line);
    t == "---" || t == "..."
}

pub fn yaml_tokens(code: &str) -> Vec<Token<'_>> {
    by_line(code, |line, out| {
        if line.trim_start_matches(is_js_ws).starts_with('#') {
            out.push(Token { cls: "hl-com", text: line }); // ^\s*#
            return;
        }
        if doc_marker(line) {
            out.push(Token { cls: "hl-punct", text: line });
            return;
        }
        match yaml_key(line) {
            None => out.push(Token { cls: "", text: line }),
            Some((key, colon, rest)) => {
                out.push(Token { cls: "", text: &line[..key] });
                out.push(Token { cls: "hl-kw", text: &line[key..colon] });
                out.push(Token { cls: "hl-punct", text: &line[colon..rest] });
                yaml_value(&line[rest..], out);
            }
        }
    })
}
