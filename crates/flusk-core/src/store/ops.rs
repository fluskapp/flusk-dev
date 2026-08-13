//! The FactStore's two verbs over one log file — the orchestration in
//! src/features/facts/facts.repository.ts, minus the pieces that stay in
//! TypeScript: the namespace→path convention and the clock (passed in as
//! `now_ms`, so one transact stamps every timestamp from a single reading).
//!
//! Reads never take a lock. A transact is a read-modify-append, serialized
//! against every other process by the lock file, and the guards are evaluated
//! inside that critical section, against the log as it stands at that moment.
//! `tx` is read back from the log rather than kept only in memory, so numbers
//! stay ascending across restarts and across concurrent sessions.

use super::guards::{check_asserts, check_compares};
use super::jval::{js_num, write_js_string, JVal};
use super::lock::with_lock;
use super::log::{append_log, read_log};
use super::materialize::{last_tx, materialize};
use super::query::run_query;
use super::rng::uuid_v4;
use super::time::to_iso;
use super::transact::plan_transact;
use std::path::Path;

/// A failing compare is a lost race, not a fault; callers tell them apart by
/// this variant alone, so it carries the exact failures for the seam to wrap
/// in the reference's CompareFailedError.
#[derive(Debug)]
pub enum TransactError {
    CompareFailed(Vec<JVal>),
    Other(String),
}

impl From<String> for TransactError {
    fn from(msg: String) -> Self {
        TransactError::Other(msg)
    }
}

/// Facts visible at `asOf` (default `now_ms`), as a JSON array — the exact
/// rows the reference's query would return, in the same order.
pub fn query_json(path: &Path, params_json: &str, now_ms: f64) -> Result<String, String> {
    let params: JVal = serde_json::from_str(params_json)
        .map_err(|e| format!("store: bad query params JSON: {e}"))?;
    let records = read_log(path)?;
    let rows = materialize(&records);
    let hits = run_query(&rows, &params, now_ms)?;
    let parts: Vec<String> = hits.iter().map(JVal::to_json).collect();
    Ok(format!("[{}]", parts.join(",")))
}

fn parse_array(json: &str, what: &str) -> Result<Vec<JVal>, TransactError> {
    if json.trim().is_empty() {
        return Ok(Vec::new());
    }
    match serde_json::from_str(json) {
        Ok(JVal::Arr(items)) => Ok(items),
        _ => Err(TransactError::Other(format!(
            "store: {what} must be a JSON array"
        ))),
    }
}

/// Apply `asserts` atomically iff every compare passes; `{"tx":n,"ids":[…]}`
/// on success. `next_tx` is the store instance's monotonic floor, shared
/// across namespaces exactly as the reference's closed-over `nextTx` is.
pub fn transact_json(
    path: &Path,
    asserts_json: &str,
    compares_json: &str,
    now_ms: f64,
    next_tx: &mut f64,
) -> Result<String, TransactError> {
    let asserts = parse_array(asserts_json, "asserts")?;
    let compares = parse_array(compares_json, "compares")?;
    // Batch-shape rejections happen before the lock, as in the reference.
    check_asserts(&asserts).map_err(TransactError::Other)?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)
            .map_err(|e| TransactError::Other(format!("store: mkdir {}: {e}", dir.display())))?;
    }
    with_lock(path, || {
        let records = read_log(path)?;
        let rows = materialize(&records);
        check_compares(&rows, &compares, now_ms).map_err(TransactError::CompareFailed)?;
        let tx = next_tx.max(last_tx(&records)) + 1.0;
        *next_tx = tx;
        let mut new_id = uuid_v4;
        let plan = plan_transact(&rows, &asserts, &to_iso(now_ms), tx, &mut new_id);
        append_log(path, &plan.records)?;
        Ok(result_json(tx, &plan.ids))
    })
}

fn result_json(tx: f64, ids: &[String]) -> String {
    let mut out = format!("{{\"tx\":{},\"ids\":[", js_num(tx));
    for (i, id) in ids.iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        write_js_string(id, &mut out);
    }
    out.push_str("]}");
    out
}
