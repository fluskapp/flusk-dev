//! The escaping guarantee lives here: every path from source text to HTML
//! goes through `escape_html`, and every emitted href through
//! `normalize_url` + `is_safe_url` — the same pair of decisions, in the same
//! order, as markdown-inline.ts. The class names and tags the renderer emits
//! are literals in this crate, never source-derived.

/// Escape before anything is emitted — the security invariant of the renderer.
pub fn escape_html(src: &str) -> String {
    let mut out = String::with_capacity(src.len() + src.len() / 8);
    for c in src.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            _ => out.push(c),
        }
    }
    out
}

/// The form a browser will actually parse. Browsers strip C0 controls and
/// spaces before reading a URL, so a single `\x01` in front of `javascript:`
/// defeats an anchored scheme test while the script still runs. The decision
/// below and the href that is emitted are both made on this value, never on
/// the raw capture.
pub fn normalize_url(url: &str) -> String {
    url.chars()
        .filter(|&c| !(c <= '\u{20}' || c == '\u{7f}'))
        .collect()
}

/// `^[a-zA-Z][a-zA-Z0-9+.-]*:` — the shape of an absolute scheme.
fn has_scheme(u: &str) -> bool {
    let mut chars = u.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() => {}
        _ => return false,
    }
    for c in chars {
        if c == ':' {
            return true;
        }
        if !(c.is_ascii_alphanumeric() || matches!(c, '+' | '.' | '-')) {
            return false;
        }
    }
    false
}

/// Only http(s) and relative paths link; every other scheme stays plain text.
pub fn is_safe_url(url: &str) -> bool {
    let u = normalize_url(url);
    if u.is_empty() {
        return false;
    }
    let lower = u.to_ascii_lowercase();
    if lower.starts_with("http://") || lower.starts_with("https://") {
        return true;
    }
    if u.starts_with("//") {
        return false; // protocol-relative borrows any scheme
    }
    !has_scheme(&u) // javascript:, data:, vbscript:, …
}
