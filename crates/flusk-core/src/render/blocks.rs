//! Multi-line block builders. Each takes the escaped line array plus the
//! index of its opening line and returns the HTML with the index to continue
//! from. `raw` is the *unescaped* line array — the same lines, before
//! render_markdown escaped the document — because the highlighter tokenizes
//! source and escapes every slice itself.
//!
//! Deviation, recorded: the TS reference draws supported ```mermaid fences
//! as SVG (mermaid-*.ts). That subsystem is not ported; the seam routes any
//! document containing a mermaid fence to the TS reference, so the surface
//! behavior is unchanged — but THIS builder renders such a fence as code.

use super::highlight::highlight_code;
use super::inline::render_inline;
use super::js::{is_js_ws, js_dot, js_trim};

/// CommonMark's closing rule, stated exactly: a fence is closed by a BARE
/// run of backticks at least as long as the one that opened it. A line
/// carrying an info string — ```bash — never closes, it opens.
fn closes_fence(line: &str, width: usize) -> bool {
    let cs: Vec<char> = line.chars().collect();
    let mut i = 0;
    while i < cs.len() && is_js_ws(cs[i]) {
        i += 1;
    }
    let t0 = i;
    while i < cs.len() && cs[i] == '`' {
        i += 1;
    }
    let ticks = i - t0;
    while i < cs.len() && is_js_ws(cs[i]) {
        i += 1;
    }
    ticks >= 3 && i == cs.len() && ticks >= width
}

/// The width of the run that opened a fence (`` `{3,} ``), 3 when absent.
fn fence_width(line: &str) -> usize {
    let cs: Vec<char> = line.chars().collect();
    let mut i = 0;
    while i < cs.len() && is_js_ws(cs[i]) {
        i += 1;
    }
    let t0 = i;
    while i < cs.len() && cs[i] == '`' {
        i += 1;
    }
    if i - t0 >= 3 { i - t0 } else { 3 }
}

/// A bare fence whose body is obviously a patch. Measured across 301 real
/// journals: 309 bare ``` fences and ZERO ```diff — gating diff colour on an
/// explicit info string meant every patch rendered unhighlighted.
fn looks_like_diff(text: &str) -> bool {
    let lines: Vec<&str> = text.split('\n').take(6).collect();
    for (k, line) in lines.iter().enumerate() {
        if line.starts_with("diff --git ") {
            return true;
        }
        if let Some(rest) = line.strip_prefix("@@ ") {
            // `@@ .*@@`: a second @@ reachable without crossing what `.` skips.
            let stop = rest.find(|c| !js_dot(c)).unwrap_or(rest.len());
            if rest[..stop].contains("@@") {
                return true;
            }
        }
        if let Some(rest) = line.strip_prefix("index ") {
            let hex = rest.chars().take_while(|c| c.is_ascii_digit() || matches!(c, 'a'..='f')).count();
            if hex >= 4 && rest[hex..].starts_with("..") {
                return true;
            }
        }
        if let Some(rest) = line.strip_prefix("--- ") {
            if rest.chars().all(js_dot) && lines.get(k + 1).is_some_and(|nx| nx.starts_with("+++ ")) {
                return true;
            }
        }
    }
    false
}

/// Fenced code: no inline formatting, and the language gets highlighted.
pub fn take_code(lines: &[&str], start: usize, lang: &str, raw: &[&str]) -> (String, usize) {
    let width = fence_width(lines.get(start).copied().unwrap_or(""));
    let mut body: Vec<&str> = Vec::new();
    let mut i = start + 1;
    while i < lines.len() {
        if closes_fence(lines[i], width) {
            i += 1;
            break;
        }
        body.push(raw.get(i).copied().unwrap_or(""));
        i += 1;
    }
    let text = body.join("\n");
    let name = if lang.is_empty() && looks_like_diff(&text) { "diff" } else { lang };
    let inner = highlight_code(&text, name);
    let cls = if name.is_empty() { String::new() } else { format!(" class=\"lang-{name}\"") };
    (format!("<pre class=\"code\"><code{cls}>{inner}</code></pre>"), i)
}

/// `>` survives escaping as `&gt;`, which is what the caller matched on.
pub fn take_quote(lines: &[&str], start: usize) -> (String, usize) {
    let mut body: Vec<&str> = Vec::new();
    let mut i = start;
    while i < lines.len() {
        let Some(rest) = lines[i].strip_prefix("&gt;") else { break };
        body.push(rest.strip_prefix(' ').unwrap_or(rest)); // ^&gt; ?
        i += 1;
    }
    let joined = body.join(" ");
    (format!("<blockquote><p>{}</p></blockquote>", render_inline(js_trim(&joined))), i)
}

pub fn take_paragraph(lines: &[&str], start: usize, stop: impl Fn(&str) -> bool) -> (String, usize) {
    let mut body: Vec<&str> = Vec::new();
    let mut i = start;
    while i < lines.len() {
        let line = lines[i];
        if js_trim(line).is_empty() || (i > start && stop(line)) {
            break;
        }
        body.push(js_trim(line));
        i += 1;
    }
    (format!("<p>{}</p>", render_inline(&body.join(" "))), i)
}
