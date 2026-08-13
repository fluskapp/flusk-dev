//! Unordered/ordered list blocks. Nesting is by two-space indent only — the
//! dashboard renders hand-written notes, not the whole CommonMark grammar.

use super::inline::render_inline;
use super::js::{dot_ok, is_js_ws};

pub struct Item {
    depth: usize,
    ordered: bool,
    text: String,
}

/// `^(\s*)(?:([-*])|(\d+)\.)\s+(.*)$` — None where the regex fails. The
/// indent is measured in UTF-16 units, because `m[1].length` is.
pub fn parse_item(line: &str) -> Option<Item> {
    let cs: Vec<char> = line.chars().collect();
    let n = cs.len();
    let mut i = 0;
    let mut indent_units = 0;
    while i < n && is_js_ws(cs[i]) {
        indent_units += cs[i].len_utf16();
        i += 1;
    }
    let ordered;
    if i < n && matches!(cs[i], '-' | '*') {
        ordered = false;
        i += 1;
    } else {
        let d0 = i;
        while i < n && cs[i].is_ascii_digit() {
            i += 1;
        }
        if i == d0 || i >= n || cs[i] != '.' {
            return None;
        }
        ordered = true;
        i += 1;
    }
    let w0 = i;
    while i < n && is_js_ws(cs[i]) {
        i += 1;
    }
    if i == w0 {
        return None;
    }
    let text: String = cs[i..].iter().collect();
    if !dot_ok(&text) {
        return None;
    }
    Some(Item { depth: indent_units / 2, ordered, text })
}

/// GFM task item, `^\[([ xX])\]\s+(.*)$`. The text is already escaped, so
/// the brackets survive. A checkbox renders disabled: a preview shows state.
fn task(text: &str) -> Option<(bool, String)> {
    let cs: Vec<char> = text.chars().collect();
    let n = cs.len();
    if n < 3 || cs[0] != '[' || !matches!(cs[1], ' ' | 'x' | 'X') || cs[2] != ']' {
        return None;
    }
    let mut i = 3;
    while i < n && is_js_ws(cs[i]) {
        i += 1;
    }
    if i == 3 {
        return None;
    }
    Some((cs[1].eq_ignore_ascii_case(&'x'), cs[i..].iter().collect()))
}

fn render_level(items: &[Item], start: usize, depth: usize) -> (String, usize) {
    let ordered = items.get(start).is_some_and(|it| it.ordered);
    let mut html = String::from(if ordered { "<ol>" } else { "<ul>" });
    let mut i = start;
    while i < items.len() {
        let it = &items[i];
        if it.depth < depth || (it.depth == depth && it.ordered != ordered) {
            break;
        }
        i += 1;
        let t = task(&it.text);
        let mut inner = match &t {
            None => render_inline(&it.text),
            Some((done, rest)) => format!(
                "<input type=\"checkbox\" disabled{}> {}",
                if *done { " checked" } else { "" },
                render_inline(rest)
            ),
        };
        if items.get(i).is_some_and(|next| next.depth > depth) {
            let (sub, after) = render_level(items, i, depth + 1);
            inner.push_str(&sub);
            i = after;
        }
        let cls = if t.is_none() { "" } else { " class=\"task\"" };
        html.push_str(&format!("<li{cls}>{inner}</li>"));
    }
    html.push_str(if ordered { "</ol>" } else { "</ul>" });
    (html, i)
}

/// `lines` is the run of consecutive list lines; returns one or more lists.
pub fn render_list(lines: &[&str]) -> String {
    let mut items: Vec<Item> = lines.iter().filter_map(|l| parse_item(l)).collect();
    if items.is_empty() {
        return String::new();
    }
    let base = items.iter().map(|it| it.depth).min().unwrap_or(0);
    for it in &mut items {
        it.depth -= base;
    }
    let mut html = String::new();
    let mut i = 0;
    while i < items.len() {
        let (chunk, next) = render_level(&items, i, 0);
        html.push_str(&chunk);
        i = if next > i { next } else { i + 1 }; // never spin on a refused item
    }
    html
}
