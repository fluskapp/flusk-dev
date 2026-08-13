//! The render stage: Markdown → HTML and syntax highlighting, ported 1:1
//! from src/ui/render/{markdown,highlight}*.ts.
//!
//! BYTE-IDENTICAL HTML is the contract — the workbench CSS addresses the
//! exact class vocabulary these emit — which is why no markdown or regex
//! crate stands in for the reference's hand-written grammar: a library's
//! opinion of an edge case is a diff the harness would reject. JS regex
//! semantics (its \s set, what `.` skips, UTF-16 lengths) are reproduced in
//! js.rs and used throughout. The reference's escaping guarantee is carried
//! whole: source text reaches HTML only through escape.rs.

pub mod blocks;
pub mod emphasis;
pub mod escape;
pub mod frontmatter;
pub mod highlight;
pub mod hl_langs;
pub mod hl_lines;
pub mod hl_md;
pub mod hl_scan;
pub mod hl_strings;
pub mod hl_yaml;
pub mod inline;
pub mod js;
pub mod list;
pub mod markdown;
pub mod table;

pub use highlight::highlight_code;
pub use markdown::render_markdown;

#[cfg(test)]
mod tests_hl;
#[cfg(test)]
mod tests_md;
