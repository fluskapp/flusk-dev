//! Line-oriented highlighters: diff, YAML and Markdown are decided by what a
//! line *starts with*, not by a token grammar, so they get their own pass
//! (yaml in hl_yaml.rs, markdown in hl_md.rs). Diff is the one that earns
//! its keep — harness journals paste `git diff` output constantly, and an
//! unhighlighted patch is unreadable.

use super::hl_scan::Token;

/// Split into lines, classify each, and stitch the newlines back in.
pub(super) fn by_line<'a>(code: &'a str, classify: impl Fn(&'a str, &mut Vec<Token<'a>>)) -> Vec<Token<'a>> {
    let mut out = Vec::new();
    for (i, line) in code.split('\n').enumerate() {
        if i > 0 {
            out.push(Token { cls: "", text: "\n" });
        }
        let mut toks = Vec::new();
        classify(line, &mut toks);
        out.extend(toks.into_iter().filter(|t| !t.text.is_empty()));
    }
    out
}

/// Patch and porcelain headers, checked before the bare +/- rules.
const DIFF_META: &[&str] = &[
    "diff ", "index ", "@@", "+++", "---", "commit ", "Author:", "Date:", "new file",
    "deleted file", "old mode", "new mode", "similarity index", "rename ", "copy ",
    "Binary files", "=== ",
];

fn diff_class(line: &str) -> &'static str {
    if DIFF_META.iter().any(|p| line.starts_with(p)) {
        return "hl-meta";
    }
    if line.starts_with('+') {
        return "hl-add";
    }
    if line.starts_with('-') {
        return "hl-del";
    }
    ""
}

pub fn diff_tokens(code: &str) -> Vec<Token<'_>> {
    by_line(code, |line, out| out.push(Token { cls: diff_class(line), text: line }))
}
