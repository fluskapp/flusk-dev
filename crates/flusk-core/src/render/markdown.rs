//! Minimal, dependency-free Markdown → HTML — the render_markdown entry.
//!
//! The whole document is HTML-escaped up front, so no path through the
//! parser can emit source-supplied markup: a `<script>` in a note renders as
//! text. Block markers survive escaping unchanged except `>`, which becomes
//! `&gt;`. Unknown input is never an error — worst case it comes back as
//! paragraphs.

use super::blocks::{take_code, take_paragraph, take_quote};
use super::escape::escape_html;
use super::frontmatter::strip_frontmatter;
use super::inline::render_inline;
use super::js::{is_js_ws, js_dot, js_trim};
use super::list::{parse_item, render_list};
use super::table::{is_table_separator, take_table};

/// `^\s*```\s*([\w+#.-]*)` → Some(info word) when the line opens a fence.
fn fence_lang(line: &str) -> Option<String> {
    let cs: Vec<char> = line.chars().collect();
    let mut i = 0;
    while i < cs.len() && is_js_ws(cs[i]) {
        i += 1;
    }
    if cs.len() < i + 3 || cs[i] != '`' || cs[i + 1] != '`' || cs[i + 2] != '`' {
        return None;
    }
    i += 3;
    while i < cs.len() && is_js_ws(cs[i]) {
        i += 1;
    }
    let start = i;
    while i < cs.len() && (cs[i].is_ascii_alphanumeric() || matches!(cs[i], '_' | '+' | '#' | '.' | '-')) {
        i += 1;
    }
    Some(cs[start..i].iter().collect())
}

/// `^(#{1,6})\s+(.*)$` → (level, text after the whitespace run).
fn heading(line: &str) -> Option<(usize, String)> {
    let cs: Vec<char> = line.chars().collect();
    let mut h = 0;
    while h < cs.len() && cs[h] == '#' {
        h += 1;
    }
    if h == 0 || h > 6 {
        return None;
    }
    let mut i = h;
    while i < cs.len() && is_js_ws(cs[i]) {
        i += 1;
    }
    if i == h {
        return None;
    }
    let rest: String = cs[i..].iter().collect();
    rest.chars().all(js_dot).then_some((h, rest))
}

/// `^(-{3,}|\*{3,}|_{3,})\s*$` over the TRIMMED line.
fn is_rule(trimmed: &str) -> bool {
    let cs: Vec<char> = trimmed.chars().collect();
    cs.len() >= 3 && matches!(cs[0], '-' | '*' | '_') && cs.iter().all(|&c| c == cs[0])
}

/// True for any line that must interrupt a running paragraph.
fn starts_block(line: &str) -> bool {
    fence_lang(line).is_some()
        || heading(line).is_some()
        || is_rule(js_trim(line))
        || line.starts_with("&gt;")
        || parse_item(line).is_some()
}

fn take_list(lines: &[&str], start: usize) -> (String, usize) {
    let mut i = start;
    while i < lines.len() && parse_item(lines[i]).is_some() {
        i += 1;
    }
    (render_list(&lines[start..i]), i)
}

pub fn render_markdown(src: &str) -> String {
    if src.is_empty() {
        return String::new();
    }
    // Frontmatter is the caller's business; strip BEFORE newline
    // normalization, as the reference does. `\r\n?` → `\n` pairs greedily
    // left-to-right, then converts every remaining lone `\r`.
    let body = strip_frontmatter(src).replace("\r\n", "\n").replace('\r', "\n");
    // Escaping never adds or removes a newline, so `raw` and `lines` are the
    // same document line-for-line: index i means the same line in both.
    // Fenced code needs the unescaped text (the highlighter escapes itself).
    let raw: Vec<&str> = body.split('\n').collect();
    let escaped = escape_html(&body);
    let lines: Vec<&str> = escaped.split('\n').collect();
    let mut out: Vec<String> = Vec::new();
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i];
        if js_trim(line).is_empty() {
            i += 1;
            continue;
        }
        if let Some(lang) = fence_lang(line) {
            let (html, next) = take_code(&lines, i, &lang, &raw);
            out.push(html);
            i = next;
        } else if let Some((n, text)) = heading(line) {
            out.push(format!("<h{n}>{}</h{n}>", render_inline(js_trim(&text))));
            i += 1;
        } else if is_rule(js_trim(line)) {
            out.push("<hr>".to_string());
            i += 1;
        } else if line.starts_with("&gt;") {
            let (html, next) = take_quote(&lines, i);
            out.push(html);
            i = next;
        } else if line.contains('|') && is_table_separator(lines.get(i + 1).copied().unwrap_or("")) {
            let (html, next) = take_table(&lines, i);
            out.push(html);
            i = next;
        } else if parse_item(line).is_some() {
            let (html, next) = take_list(&lines, i);
            out.push(html);
            i = next;
        } else {
            let (html, next) = take_paragraph(&lines, i, starts_block);
            out.push(html);
            i = if next > i { next } else { i + 1 };
        }
    }
    out.join("\n")
}
