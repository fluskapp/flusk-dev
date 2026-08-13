//! GFM tables, including the wrapped rows harness journals actually write:
//! a stage's detail is command output, so one row's cells can sit several
//! source lines apart.

use super::inline::render_inline;
use super::js::{is_js_ws, js_trim, js_trim_end};

/// How far a single table row may reach for the rest of a wrapped cell.
const ROW_SPAN_MAX: usize = 40;

fn cells(line: &str) -> Vec<String> {
    let t = js_trim(line);
    let t = t.strip_prefix('|').unwrap_or(t);
    let t = t.strip_suffix('|').unwrap_or(t);
    t.split('|').map(|c| js_trim(c).to_string()).collect()
}

/// `^:?-+:?$` per cell.
fn sep_cell(c: &str) -> bool {
    let c = c.strip_prefix(':').unwrap_or(c);
    let c = c.strip_suffix(':').unwrap_or(c);
    !c.is_empty() && c.chars().all(|ch| ch == '-')
}

/// A GFM separator row: `|---|:--:|`. Decides whether the line above is a table.
pub fn is_table_separator(line: &str) -> bool {
    if !line.contains('-') || !line.contains('|') {
        return false;
    }
    let parts = cells(line);
    !parts.is_empty() && parts.iter().all(|c| sep_cell(c))
}

/// `^\s*(?:#{1,6}\s|```|&gt;|\||[-*]\s|\d+\.\s)` — lines that end a wrapped
/// row rather than continue it.
fn interrupts(line: &str) -> bool {
    let cs: Vec<char> = line.chars().collect();
    let mut i = 0;
    while i < cs.len() && is_js_ws(cs[i]) {
        i += 1;
    }
    let rest = &cs[i..];
    let n = rest.len();
    if n == 0 {
        return false;
    }
    if rest.starts_with(&['`', '`', '`']) || rest.starts_with(&['&', 'g', 't', ';']) || rest[0] == '|' {
        return true;
    }
    if matches!(rest[0], '-' | '*') && n >= 2 && is_js_ws(rest[1]) {
        return true;
    }
    let mut h = 0;
    while h < n && rest[h] == '#' {
        h += 1;
    }
    if (1..=6).contains(&h) && h < n && is_js_ws(rest[h]) {
        return true;
    }
    let mut d = 0;
    while d < n && rest[d].is_ascii_digit() {
        d += 1;
    }
    d > 0 && d < n && rest[d] == '.' && d + 1 < n && is_js_ws(rest[d + 1])
}

/// A row is finished when it ends in `|` or has all the header's cells.
fn closed(text: &str, width: usize) -> bool {
    js_trim_end(text).ends_with('|') || cells(text).len() >= width
}

/// End line (exclusive) this row spans to, or None when it never closes.
/// Looking ahead first is the point: a row only absorbs lines when a closer
/// actually exists to absorb them up to.
fn row_span(lines: &[&str], start: usize, width: usize) -> Option<usize> {
    let mut text = lines.get(start).copied().unwrap_or("").to_string();
    if closed(&text, width) {
        return Some(start + 1);
    }
    let mut i = start + 1;
    while i < lines.len() && i - start < ROW_SPAN_MAX {
        let line = lines[i];
        if interrupts(line) {
            return None;
        }
        text.push(' ');
        text.push_str(js_trim(line));
        if closed(&text, width) {
            return Some(i + 1);
        }
        i += 1;
    }
    None
}

/// One row, which may be wrapped over several lines.
fn take_row(lines: &[&str], start: usize, width: usize) -> (Option<String>, usize) {
    let first = lines.get(start).copied().unwrap_or("");
    if js_trim(first).is_empty() || !first.contains('|') {
        return (None, start);
    }
    let end = row_span(lines, start, width).unwrap_or(start + 1);
    let text = lines[start..end]
        .iter()
        .enumerate()
        .map(|(k, l)| if k == 0 { (*l).to_string() } else { js_trim(l).to_string() })
        .collect::<Vec<_>>()
        .join(" ");
    let tds: String = cells(&text)
        .iter()
        .map(|c| format!("<td>{}</td>", render_inline(c)))
        .collect();
    (Some(format!("<tr>{tds}</tr>")), end)
}

pub fn take_table(lines: &[&str], start: usize) -> (String, usize) {
    let head = cells(lines.get(start).copied().unwrap_or(""));
    let mut i = start + 2;
    let mut rows: Vec<String> = Vec::new();
    while i < lines.len() {
        let (row, next) = take_row(lines, i, head.len());
        let Some(row) = row else { break };
        rows.push(row);
        i = if next > i { next } else { i + 1 };
    }
    let th: String = head.iter().map(|c| format!("<th>{}</th>", render_inline(c))).collect();
    let body = if rows.is_empty() { String::new() } else { format!("<tbody>{}</tbody>", rows.join("")) };
    (format!("<table><thead><tr>{th}</tr></thead>{body}</table>"), i)
}
