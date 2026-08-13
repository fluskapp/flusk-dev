//! Escaped HTML for `code`, with `<span class="hl-*">` around what the
//! tokenizer knows. The reference's header documents 600KB inputs blocking
//! the event loop for five minutes; this port removes that class of bug by
//! being fast, not by changing output — including the 1M-unit backstop.
//!
//! Security invariant, unchanged: the tokenizer only ever *slices* the
//! source, every slice passes through `escape_html` before it reaches the
//! output, and the class names are literals — a fence containing
//! `</code><script>` comes back as text.

use super::escape::escape_html;
use super::hl_langs::{is_keyword, resolve_lang, spec, Family, Spec};
use super::hl_lines::diff_tokens;
use super::hl_md::md_tokens;
use super::hl_scan::{Scanner, Token};
use super::hl_yaml::yaml_tokens;
use super::js::utf16_len;

/// A backstop past which highlighting stops earning its cost; text renders.
const MAX_CHARS: usize = 1_000_000;

fn class_of(s: &Scanner, group: u8, start: usize, end: usize, family: Family, sp: &Spec) -> &'static str {
    match group {
        1 => "hl-com",
        2 => {
            if sp.key && s.peek_ws_then(end, ':') {
                "hl-fn" // a JSON object key
            } else {
                "hl-str"
            }
        }
        3 => "hl-num",
        4 => {
            let word = s.slice(start, end);
            if is_keyword(family, word) {
                "hl-kw"
            } else if word.starts_with('$') || word.starts_with('@') || s.peek_ws_then(end, '(') {
                "hl-fn" // a sigiled name, or what looks like a call
            } else {
                ""
            }
        }
        _ => "hl-punct",
    }
}

fn code_tokens<'a>(code: &'a str, family: Family, sp: &Spec) -> Vec<Token<'a>> {
    let s = Scanner::new(code);
    let n = s.len();
    let mut out = Vec::new();
    let mut last = 0;
    let mut p = 0;
    while p < n {
        let Some((group, end)) = s.next_match(sp, p) else {
            p += 1; // bump-along: no alternative matched here
            continue;
        };
        if p > last {
            out.push(Token { cls: "", text: s.slice(last, p) });
        }
        out.push(Token { cls: class_of(&s, group, p, end, family, sp), text: s.slice(p, end) });
        last = end;
        p = end;
    }
    if last < n {
        out.push(Token { cls: "", text: s.slice(last, n) });
    }
    out
}

fn tokens_for(code: &str, family: Family) -> Vec<Token<'_>> {
    match family {
        Family::Diff => diff_tokens(code),
        Family::Yaml => yaml_tokens(code),
        Family::Md => md_tokens(code),
        _ => match spec(family) {
            Some(sp) => code_tokens(code, family, &sp),
            None => vec![Token { cls: "", text: code }],
        },
    }
}

/// Escaped HTML for `code`, spans around what it knows. An unsupported
/// language returns the escaped source unchanged; this function never fails.
pub fn highlight_code(code: &str, lang: &str) -> String {
    if code.is_empty() {
        return String::new();
    }
    let Some(family) = resolve_lang(lang) else { return escape_html(code) };
    // The cap counts UTF-16 units, as `code.length` does; counting is only
    // needed at all once the (always larger) byte length crosses it.
    if code.len() > MAX_CHARS && utf16_len(code) > MAX_CHARS {
        return escape_html(code);
    }
    let mut html = String::with_capacity(code.len());
    for t in tokens_for(code, family) {
        let text = escape_html(t.text);
        if t.cls.is_empty() {
            html.push_str(&text);
        } else {
            html.push_str("<span class=\"");
            html.push_str(t.cls);
            html.push_str("\">");
            html.push_str(&text);
            html.push_str("</span>");
        }
    }
    html
}
