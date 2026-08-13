//! Read filtering: status, time, pattern, order, cap — in that order, as
//! src/features/facts/query.ts. The cap keeps the NEWEST rows, because every
//! question this store is asked is a question about now; a caller whose
//! answer needs every row asks for NO_LIMIT.
//!
//! The status filter is applied independently of `asOf`: a row's status is
//! its status NOW while `asOf` asks what was true then, and folding them
//! together would make the change feed's before-and-after diff identical.

use super::jval::JVal;
use super::materialize::Stored;
use super::visibility::{at_ms, status_set, visible_at, DEFAULT_LIMIT};

pub fn run_query(rows: &[Stored], params: &JVal, now_ms: f64) -> Result<Vec<JVal>, String> {
    let at = at_ms(params.get("asOf"), now_ms)?;
    let admitted = status_set(params.get_str("status"));
    let mut hits: Vec<&JVal> = Vec::new();
    for row in rows {
        let f = &row.fact;
        if !admitted.contains(f.get_str("status").unwrap_or("")) {
            continue;
        }
        if !visible_at(f, at) {
            continue;
        }
        if mismatch(params, f, "subject") || mismatch(params, f, "predicate") {
            continue;
        }
        if mismatch(params, f, "object") {
            continue;
        }
        hits.push(f);
    }
    // Oldest first, and the cap drops the OLDEST rows. Stable sort on the
    // validFrom string: uniform toISOString values make string order time
    // order, and ties (one batch shares its stamp) keep append order.
    hits.sort_by(|a, b| {
        a.get_str("validFrom")
            .unwrap_or("")
            .cmp(b.get_str("validFrom").unwrap_or(""))
    });
    let limit = params.get_f64("limit").unwrap_or(DEFAULT_LIMIT);
    let start = ((hits.len() as f64) - limit.max(0.0)).max(0.0) as usize;
    Ok(hits[start..].iter().map(|f| (*f).clone()).collect())
}

/// `params.subject !== undefined && f.subject !== params.subject` — a filter
/// only applies when the key is present, and compares strictly.
fn mismatch(params: &JVal, f: &JVal, key: &str) -> bool {
    match params.get(key) {
        None => false,
        Some(want) => f.get(key) != Some(want),
    }
}
