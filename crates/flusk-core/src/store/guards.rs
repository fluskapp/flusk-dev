//! Everything that must be decided before a single line is appended —
//! src/features/facts/guards.ts.
//!
//! A transact is all-or-nothing: the guards are evaluated against the state
//! as it stands, and one failure means nothing is written. Checking a compare
//! after the first assert had landed would leave a half-applied batch behind.

use super::jval::JVal;
use super::materialize::Stored;
use super::visibility::visible_at;
use std::collections::HashSet;

fn as_key_part<'a>(v: &'a JVal, key: &str) -> &'a str {
    // Template-literal fidelity: an absent field prints as "undefined" in the
    // reference's error messages, and typed callers never hit this.
    v.get_str(key).unwrap_or("undefined")
}

/// Rejects the batch shapes the log cannot express.
pub fn check_asserts(asserts: &[JVal]) -> Result<(), String> {
    if asserts.is_empty() {
        return Err("transact: asserts must not be empty".to_string());
    }
    let mut seen: HashSet<String> = HashSet::new();
    for a in asserts {
        let (subject, predicate) = (as_key_part(a, "subject"), as_key_part(a, "predicate"));
        let key = format!("{subject} {predicate}");
        // Two values for one functional predicate in one call have no defined
        // winner: the caller must decide the order by splitting the batch.
        if seen.contains(&key) {
            return Err(format!(
                "transact: ({subject}, {predicate}) asserted twice in one call"
            ));
        }
        seen.insert(key);
    }
    Ok(())
}

/// Err carries every guard that does not hold, verbatim, so the binding can
/// hand the seam the exact `failures` array CompareFailedError promises.
pub fn check_compares(rows: &[Stored], compares: &[JVal], at: f64) -> Result<(), Vec<JVal>> {
    let failures: Vec<JVal> = compares
        .iter()
        .filter(|c| !passes(rows, c, at))
        .cloned()
        .collect();
    if failures.is_empty() {
        Ok(())
    } else {
        Err(failures)
    }
}

/// A guard passes only when exactly one visible fact carries its
/// (subject, predicate). Zero is nothing to swap; two is an ambiguity no
/// single expected value can settle, so both count as a failure.
fn passes(rows: &[Stored], c: &JVal, at: f64) -> bool {
    let matches: Vec<&Stored> = rows
        .iter()
        .filter(|r| {
            r.fact.get_str("status") == Some("active")
                && r.fact.get("subject") == c.get("subject")
                && r.fact.get("predicate") == c.get("predicate")
                && visible_at(&r.fact, at)
        })
        .collect();
    matches.len() == 1 && matches[0].fact.get("object") == c.get("object")
}
