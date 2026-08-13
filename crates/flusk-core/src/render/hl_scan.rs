//! The master tokenizer's matcher set: comment | string | number | ident |
//! punct, tried in that order at every position — the reference's single
//! compiled regex, hand-rolled so byte parity with the exact patterns beats
//! any regex engine's own opinion. String forms live in hl_strings.rs.

use super::hl_langs::{Comment, Spec};
use super::js::{is_js_ws, is_word};

/// A run of source text and the class it should be wrapped in ("" = plain).
pub struct Token<'a> {
    pub cls: &'static str,
    pub text: &'a str,
}

pub(super) struct Scanner<'a> {
    pub(super) code: &'a str,
    pub(super) cv: Vec<(usize, char)>,
}

impl<'a> Scanner<'a> {
    pub fn new(code: &'a str) -> Self {
        Self { code, cv: code.char_indices().collect() }
    }

    pub fn len(&self) -> usize {
        self.cv.len()
    }

    fn byte(&self, i: usize) -> usize {
        self.cv.get(i).map_or(self.code.len(), |p| p.0)
    }

    pub fn slice(&self, a: usize, b: usize) -> &'a str {
        &self.code[self.byte(a)..self.byte(b)]
    }

    pub(super) fn at(&self, i: usize) -> Option<char> {
        self.cv.get(i).map(|p| p.1)
    }

    /// `/^\s*X/` over the next 8 UTF-16 units — the reference's bounded peek,
    /// used for "is this a call?" and JSON keys.
    pub fn peek_ws_then(&self, from: usize, target: char) -> bool {
        let mut units = 0;
        let mut i = from;
        while i < self.cv.len() && units < 8 {
            let c = self.cv[i].1;
            if !is_js_ws(c) {
                return c == target;
            }
            units += c.len_utf16();
            i += 1;
        }
        false
    }

    /// Group number (1-based, matching the reference's captures) + end index.
    pub fn next_match(&self, sp: &Spec, p: usize) -> Option<(u8, usize)> {
        if let Some(e) = self.match_comment(sp.comment, p) {
            return Some((1, e));
        }
        if let Some(e) = self.match_string(sp.strings, p) {
            return Some((2, e));
        }
        if let Some(e) = self.match_num(p) {
            return Some((3, e));
        }
        if let Some(e) = self.match_ident(p) {
            return Some((4, e));
        }
        self.match_punct(p).map(|e| (5, e))
    }

    pub(super) fn run_to_newline(&self, mut j: usize) -> usize {
        while j < self.cv.len() && self.cv[j].1 != '\n' {
            j += 1;
        }
        j
    }

    /// `//[^\n]*` | lazy `/*…*/` | unterminated `/*…$` — or `#[^\n]*`.
    fn match_comment(&self, kind: Comment, i: usize) -> Option<usize> {
        match kind {
            Comment::Hash => (self.at(i)? == '#').then(|| self.run_to_newline(i + 1)),
            Comment::Slashes => {
                if self.at(i)? != '/' {
                    return None;
                }
                match self.at(i + 1) {
                    Some('/') => Some(self.run_to_newline(i + 2)),
                    Some('*') => {
                        let mut j = i + 2; // lazy: nearest */, else consume to end
                        while j < self.cv.len() {
                            if self.cv[j].1 == '*' && self.at(j + 1) == Some('/') {
                                return Some(j + 2);
                            }
                            j += 1;
                        }
                        Some(self.cv.len())
                    }
                    _ => None,
                }
            }
        }
    }

    /// `\b\d[\w.]*`
    fn match_num(&self, i: usize) -> Option<usize> {
        if !self.at(i)?.is_ascii_digit() || (i > 0 && is_word(self.cv[i - 1].1)) {
            return None;
        }
        let mut j = i + 1;
        while j < self.cv.len() && (is_word(self.cv[j].1) || self.cv[j].1 == '.') {
            j += 1;
        }
        Some(j)
    }

    /// `[A-Za-z_$@][\w$]*`
    fn match_ident(&self, i: usize) -> Option<usize> {
        let c = self.at(i)?;
        if !(c.is_ascii_alphabetic() || matches!(c, '_' | '$' | '@')) {
            return None;
        }
        let mut j = i + 1;
        while j < self.cv.len() && (is_word(self.cv[j].1) || self.cv[j].1 == '$') {
            j += 1;
        }
        Some(j)
    }

    fn match_punct(&self, i: usize) -> Option<usize> {
        if !is_punct(self.at(i)?) {
            return None;
        }
        let mut j = i + 1;
        while j < self.cv.len() && is_punct(self.cv[j].1) {
            j += 1;
        }
        Some(j)
    }
}

fn is_punct(c: char) -> bool {
    "{}()[].,;:+-*/%=<>!&|?~^#\\".contains(c)
}
