//! Frontmatter detection and stripping — the subset render_markdown needs.
//!
//! Only a block that actually PARSES as key/value frontmatter is consumed:
//! stripping on the delimiters alone deleted everything up to the second
//! `---` in any text that merely opened with a horizontal rule, so a reply
//! beginning with `---` silently lost its first section.

use super::js::{dot_ok, is_js_ws, js_trim};

pub struct Row {
    pub key: String,
    pub value: String,
}

/// The text between the opening `---` and its closing fence, or None.
pub fn frontmatter_block(src: &str) -> Option<&str> {
    if !src.starts_with("---") {
        return None;
    }
    let first = src.find('\n')?;
    if !js_trim(&src[3..first]).is_empty() {
        return None;
    }
    let end = src[first..].find("\n---")? + first;
    // JS slice(first+1, end) yields "" when the closer IS the first newline.
    Some(if end > first { &src[first + 1..end] } else { "" })
}

/// `^(\s*)([\w.$/-]+):\s*(.*)$` → (nested, name, value-after-ws), or None —
/// including when the value region holds what `.` cannot consume (a stray \r
/// in a CRLF file), which is why an unnormalized CRLF block parses to zero
/// rows and is therefore never stripped, exactly as the reference behaves.
fn key_line(line: &str) -> Option<(bool, String, String)> {
    let cs: Vec<(usize, char)> = line.char_indices().collect();
    let mut i = 0;
    while i < cs.len() && is_js_ws(cs[i].1) {
        i += 1;
    }
    let nested = i > 0;
    let start = i;
    while i < cs.len() && (cs[i].1.is_ascii_alphanumeric() || matches!(cs[i].1, '_' | '.' | '$' | '/' | '-')) {
        i += 1;
    }
    if i == start || i >= cs.len() || cs[i].1 != ':' {
        return None;
    }
    let name: String = cs[start..i].iter().map(|p| p.1).collect();
    i += 1;
    while i < cs.len() && is_js_ws(cs[i].1) {
        i += 1;
    }
    let rest = &line[cs.get(i).map_or(line.len(), |p| p.0)..];
    if !dot_ok(rest) {
        return None;
    }
    Some((nested, name, rest.to_string()))
}

/// Quotes are stripped only AFTER continuation lines are joined — a value
/// that wraps opens its quote on one line and closes it on another.
fn unquote(value: &str) -> String {
    let t = js_trim(value);
    let cs: Vec<char> = t.chars().collect();
    let quoted = cs.len() > 1 && matches!(cs[0], '"' | '\'');
    if quoted && cs[cs.len() - 1] == cs[0] {
        cs[1..cs.len() - 1].iter().collect()
    } else {
        t.to_string()
    }
}

/// Scalar keys, one level of `parent.child` nesting, wrapped values joined.
pub fn frontmatter_rows(block: &str) -> Vec<Row> {
    let mut rows: Vec<Row> = Vec::new();
    let mut parent = String::new();
    for line in block.split('\n') {
        if js_trim(line).is_empty() {
            continue;
        }
        match key_line(line) {
            None => {
                if let Some(last) = rows.last_mut() {
                    let joined = format!("{} {}", last.value, js_trim(line));
                    last.value = js_trim(&joined).to_string();
                }
            }
            Some((nested, name, raw_value)) => {
                let value = js_trim(&raw_value).to_string();
                // An empty value opens a nested block; test before unquoting,
                // since `key: ""` is a value and `key:` is a parent.
                if !nested && value.is_empty() {
                    parent = name;
                    continue;
                }
                if !nested {
                    parent.clear();
                }
                let key = if nested && !parent.is_empty() { format!("{parent}.{name}") } else { name };
                rows.push(Row { key, value });
            }
        }
    }
    for r in &mut rows {
        r.value = unquote(&r.value);
    }
    rows
}

/// Frontmatter is the caller's business; it never renders. Only a block that
/// parses to at least one row is consumed.
pub fn strip_frontmatter(src: &str) -> &str {
    let Some(block) = frontmatter_block(src) else { return src };
    if frontmatter_rows(block).is_empty() {
        return src;
    }
    // frontmatter_block already proved both of these finds succeed.
    let Some(first) = src.find('\n') else { return src };
    let Some(k) = src[first..].find("\n---") else { return src };
    let end = first + k;
    match src[end + 1..].find('\n') {
        None => "",
        Some(k) => &src[end + 1 + k + 1..],
    }
}
