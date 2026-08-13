//! String-literal matching for the master tokenizer. The two load-bearing
//! shapes of the reference survive the port: bodies are the UNROLLED loop —
//! `[^q\\\n]*(?:\\.[^q\\\n]*)*`, never an alternation under a quantifier —
//! and every opener that never closes CONSUMES to its boundary (newline or
//! end of input) instead of being retried at every later position. Those two
//! properties are what turned 600KB of `"\` pairs from five minutes of
//! blocked event loop into a linear scan.

use super::hl_langs::StrForm;
use super::hl_scan::Scanner;
use super::js::js_dot;

impl Scanner<'_> {
    /// First form in the slice that matches at `i` — the alternation order.
    pub(super) fn match_string(&self, forms: &[StrForm], i: usize) -> Option<usize> {
        forms.iter().find_map(|f| match *f {
            StrForm::TripleTerm(q) => self.triple_term(q, i),
            StrForm::TripleUnterm(q) => self.triple_open(q, i).then_some(self.cv.len()),
            StrForm::Quoted(q) => self.quoted(q, i, true),
            StrForm::Backtick => self.quoted('`', i, false),
        })
    }

    fn triple_open(&self, q: char, i: usize) -> bool {
        self.at(i) == Some(q) && self.at(i + 1) == Some(q) && self.at(i + 2) == Some(q)
    }

    /// `"""[\s\S]*?"""` — lazy, so the NEAREST closer wins.
    fn triple_term(&self, q: char, i: usize) -> Option<usize> {
        if !self.triple_open(q, i) {
            return None;
        }
        let mut j = i + 3;
        while j + 3 <= self.cv.len() {
            if self.triple_open(q, j) {
                return Some(j + 3);
            }
            j += 1;
        }
        None
    }

    /// `q body q | q body`: terminated wins exactly when the maximal body
    /// lands on a closing quote. With `stop_nl` false the body may cross
    /// newlines (the backtick form). `\\.`'s dot cannot match a line
    /// terminator, so `\<newline>` ends the body BEFORE the backslash.
    fn quoted(&self, q: char, i: usize, stop_nl: bool) -> Option<usize> {
        if self.at(i)? != q {
            return None;
        }
        let n = self.cv.len();
        let mut j = i + 1;
        loop {
            let Some(c) = self.at(j) else { return Some(n) };
            if c == q {
                return Some(j + 1);
            }
            if stop_nl && c == '\n' {
                return Some(j);
            }
            if c == '\\' {
                match self.at(j + 1) {
                    Some(nx) if js_dot(nx) => j += 2,
                    _ => return Some(j),
                }
            } else {
                j += 1;
            }
        }
    }
}
