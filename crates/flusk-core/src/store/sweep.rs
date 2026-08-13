//! Compaction of TTL ephemera — src/features/facts/sweep.ts.
//!
//! Only rows explicitly marked transient AND already past their `validUntil`
//! may go: sweeping early would delete a fact readers still have to see, and
//! sweeping a durable row would erase history no append can rebuild. Nothing
//! here changes what a read returns — expiry is decided from the stored
//! timestamp, so a row's removal is invisible by the time it happens.
//!
//! The rewrite replaces the file a writer would be appending to, so it takes
//! the same lock a transact does: a batch landing mid-sweep would be written
//! into the log the rename is about to discard.

use super::jval::JVal;
use super::lock::with_lock;
use super::log::{read_log, write_log};
use super::materialize::materialize;
use super::time::parse_ms;
use std::collections::HashSet;
use std::path::Path;

/// Hard-deletes expired transient rows from the log at `path`; returns how
/// many went. The caller resolves the namespace to a path — the naming
/// convention (slug + hash) stays in TypeScript so there is one spelling.
pub fn sweep_transient(path: &Path, at: f64) -> Result<usize, String> {
    with_lock(path, || {
        let records = read_log(path)?;
        let mut doomed: HashSet<String> = HashSet::new();
        for row in materialize(&records) {
            if !row.transient {
                continue;
            }
            let Some(JVal::Str(until_iso)) = row.fact.get("validUntil") else {
                continue;
            };
            let until = parse_ms(until_iso);
            if until.is_finite() && until <= at {
                if let Some(id) = row.fact.get_str("id") {
                    doomed.insert(id.to_string());
                }
            }
        }
        if doomed.is_empty() {
            return Ok(0);
        }
        let kept: Vec<_> = records
            .into_iter()
            .filter(|r| !doomed.contains(r.subject_id()))
            .collect();
        write_log(path, &kept)?;
        Ok(doomed.len())
    })
}
