//! Inline markdown → HTML over ALREADY-ESCAPED text. Code spans and links
//! are consumed by the scanner so emphasis never enters them; only the tags
//! this module writes are ever produced.

use super::emphasis::emphasis;
use super::escape::{is_safe_url, normalize_url};
use super::js::is_js_ws;

enum Tok {
    Code { body: (usize, usize), end: usize },
    Link { text: (usize, usize), url: (usize, usize), end: usize },
}

/// Leftmost match of ``/`([^`]+)`|\[([^\]]*)\]\(([^)\s]*)\)/`` from `from`.
/// The two branches start on distinct characters, so leftmost-first over the
/// alternation reduces to a bump-along scan trying each position once.
fn find_token(cs: &[char], from: usize) -> Option<(usize, Tok)> {
    let n = cs.len();
    let mut p = from;
    while p < n {
        if cs[p] == '`' {
            let mut q = p + 1;
            while q < n && cs[q] != '`' {
                q += 1;
            }
            if q < n && q > p + 1 {
                return Some((p, Tok::Code { body: (p + 1, q), end: q + 1 }));
            }
        } else if cs[p] == '[' {
            let mut q = p + 1;
            while q < n && cs[q] != ']' {
                q += 1;
            }
            if q + 1 < n && cs[q + 1] == '(' {
                let mut r = q + 2;
                while r < n && cs[r] != ')' && !is_js_ws(cs[r]) {
                    r += 1;
                }
                if r < n && cs[r] == ')' {
                    return Some((p, Tok::Link { text: (p + 1, q), url: (q + 2, r), end: r + 1 }));
                }
            }
        }
        p += 1;
    }
    None
}

fn seg(cs: &[char], a: usize, b: usize) -> String {
    cs[a..b].iter().collect()
}

pub fn render_inline(escaped: &str) -> String {
    let cs: Vec<char> = escaped.chars().collect();
    let mut out = String::new();
    let mut pos = 0;
    while let Some((at, tok)) = find_token(&cs, pos) {
        out.push_str(&emphasis(&seg(&cs, pos, at)));
        match tok {
            Tok::Code { body, end } => {
                out.push_str("<code>");
                out.push_str(&seg(&cs, body.0, body.1));
                out.push_str("</code>");
                pos = end;
            }
            Tok::Link { text, url, end } => {
                let url_s = seg(&cs, url.0, url.1);
                if is_safe_url(&url_s) {
                    // The NORMALIZED url, not the capture: emitting the raw one
                    // would put back the very characters is_safe_url looked past.
                    out.push_str("<a href=\"");
                    out.push_str(&normalize_url(&url_s));
                    out.push_str("\" rel=\"noopener noreferrer\">");
                    out.push_str(&emphasis(&seg(&cs, text.0, text.1)));
                    out.push_str("</a>");
                } else {
                    out.push_str(&emphasis(&seg(&cs, at, end)));
                }
                pos = end;
            }
        }
    }
    out.push_str(&emphasis(&seg(&cs, pos, cs.len())));
    out
}
