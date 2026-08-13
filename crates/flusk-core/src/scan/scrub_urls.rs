//! The remaining named-shape passes of redact(): vendor key families,
//! webhook URLs, URL credentials and bearer tokens — split from
//! scrub_tokens.rs only for the file-size cap; same pass order, same
//! reference regexes.

use super::chars::{boundary, js_space, lit, lit_ci, run};
use super::scrub::mark;
use super::scrub_tokens::{key_charset, Hit};

/// VENDOR: underscore/dot families the `sk-` shapes above cannot reach.
pub(crate) fn vendor_at(ch: &[char], i: usize) -> Hit {
    if !boundary(ch, i) {
        return None;
    }
    for p in ["sk_", "pk_", "rk_"] {
        if let Some(a) = lit(ch, i, p) {
            if let Some(b) = lit(ch, a, "live_").or_else(|| lit(ch, a, "test_")) {
                let end = run(ch, b, |c| c.is_ascii_alphanumeric());
                if end - b >= 16 {
                    return Some((end, mark("api key")));
                }
            }
        }
    }
    if let Some(a) = lit(ch, i, "npm_") {
        let end = run(ch, a, |c| c.is_ascii_alphanumeric());
        if end - a >= 30 {
            return Some((end, mark("api key")));
        }
    }
    if let Some(a) = lit(ch, i, "xox") {
        if matches!(ch.get(a), Some('b' | 'a' | 'p' | 'r' | 's')) && ch.get(a + 1) == Some(&'-') {
            let end = run(ch, a + 2, |c| c.is_ascii_alphanumeric() || c == '-');
            if end - (a + 2) >= 10 {
                return Some((end, mark("api key")));
            }
        }
    }
    if let Some(a) = lit(ch, i, "glpat-") {
        let end = run(ch, a, key_charset);
        if end - a >= 16 {
            return Some((end, mark("api key")));
        }
    }
    if let Some(a) = lit(ch, i, "AIza") {
        let end = run(ch, a, key_charset);
        if end - a >= 35 {
            return Some((a + 35, mark("api key"))); // {35} exactly, no trailing \b
        }
    }
    None
}

pub(crate) fn webhook_at(ch: &[char], i: usize) -> Hit {
    if !boundary(ch, i) {
        return None;
    }
    let e = lit_ci(ch, i, "hooks.slack.com/services/")
        .or_else(|| lit_ci(ch, i, "discordapp.com/api/webhooks/"))
        .or_else(|| lit_ci(ch, i, "discord.com/api/webhooks/"))?;
    let end = run(ch, e, |c| !js_space(c));
    if end == e {
        return None; // \S+ needs at least one
    }
    Some((end, mark("webhook url")))
}

/// URL_AUTH keeps the scheme and host; only `user:pass` goes.
pub(crate) fn url_auth_at(ch: &[char], i: usize) -> Hit {
    if !ch[i].is_ascii_alphabetic() || !boundary(ch, i) {
        return None;
    }
    let s_end = run(ch, i + 1, |c| c.is_ascii_alphanumeric() || matches!(c, '+' | '.' | '-'));
    let a = lit(ch, s_end, "://")?;
    let user = run(ch, a, |c| !js_space(c) && !matches!(c, '/' | ':' | '@'));
    if user == a || ch.get(user) != Some(&':') {
        return None;
    }
    let pass = run(ch, user + 1, |c| !js_space(c) && !matches!(c, '/' | '@'));
    if pass == user + 1 || ch.get(pass) != Some(&'@') {
        return None;
    }
    let scheme: String = ch[i..a].iter().collect();
    Some((pass + 1, format!("{scheme}{}@", mark("url credentials"))))
}

pub(crate) fn bearer_at(ch: &[char], i: usize) -> Hit {
    if !boundary(ch, i) {
        return None;
    }
    let e = lit(ch, i, "Bearer")?;
    let sp = run(ch, e, js_space);
    if sp == e {
        return None;
    }
    let end = run(ch, sp, |c| {
        c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '~' | '+' | '/' | '=' | '-')
    });
    if end - sp < 8 {
        return None;
    }
    // The replacement collapses whatever \s+ matched to one space.
    Some((end, format!("Bearer {}", mark("bearer token"))))
}
