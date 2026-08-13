//! Deterministic scaffolding: a fixed clock, sequential ids, and a transact
//! wrapper over a real temp-dir log — the storage layer is the thing under
//! test, so nothing here is mocked except randomness and time.

use crate::store::jval::JVal;
use crate::store::ops::{transact_json, TransactError};
use std::path::{Path, PathBuf};

/// 2026-01-01T00:00:00.000Z — a fixed, readable epoch for stamps.
pub const T0: f64 = 1_767_225_600_000.0;
pub const HOUR: f64 = 3_600_000.0;

pub struct Store {
    _dir: tempfile::TempDir,
    pub path: PathBuf,
    pub next_tx: f64,
}

impl Store {
    pub fn new() -> Store {
        let dir = tempfile::tempdir().expect("temp dir");
        let path = dir.path().join("ns.jsonl");
        Store {
            _dir: dir,
            path,
            next_tx: 0.0,
        }
    }

    pub fn transact(&mut self, asserts: &str, now: f64) -> Result<String, TransactError> {
        transact_json(&self.path, asserts, "[]", now, &mut self.next_tx)
    }

    pub fn transact_cas(
        &mut self,
        asserts: &str,
        compares: &str,
        now: f64,
    ) -> Result<String, TransactError> {
        transact_json(&self.path, asserts, compares, now, &mut self.next_tx)
    }

    pub fn query(&self, params: &str, now: f64) -> Vec<JVal> {
        let json = crate::store::ops::query_json(&self.path, params, now).expect("query");
        match serde_json::from_str(&json).expect("query returns JSON") {
            JVal::Arr(items) => items,
            _ => panic!("query returns an array"),
        }
    }

    pub fn log_bytes(&self) -> Vec<u8> {
        std::fs::read(&self.path).unwrap_or_default()
    }
}

/// One assert as its wire JSON, confidence given as an exact literal so the
/// byte tests control number formatting.
pub fn assert_json(subject: &str, predicate: &str, object: &str, extra: &str) -> String {
    let tail = if extra.is_empty() {
        String::new()
    } else {
        format!(",{extra}")
    };
    format!(
        "{{\"subject\":\"{subject}\",\"predicate\":\"{predicate}\",\"object\":\"{object}\"{tail}}}"
    )
}

pub fn read_ids(result: &str) -> Vec<String> {
    let parsed: JVal = serde_json::from_str(result).expect("transact result JSON");
    match parsed.get("ids") {
        Some(JVal::Arr(items)) => items
            .iter()
            .map(|v| match v {
                JVal::Str(s) => s.clone(),
                _ => panic!("id is a string"),
            })
            .collect(),
        _ => panic!("result has ids"),
    }
}

/// Live rows on one (subject, predicate) — the count the functional-predicate
/// invariant is about.
pub fn live_on(store: &Store, subject: &str, predicate: &str, now: f64) -> Vec<JVal> {
    store.query(
        &format!("{{\"subject\":\"{subject}\",\"predicate\":\"{predicate}\"}}"),
        now,
    )
}

/// The first `keep` bytes of the log — a log yet to exist tears to nothing.
pub fn truncated(path: &Path, keep: usize) -> Vec<u8> {
    let bytes = std::fs::read(path).unwrap_or_default();
    bytes[..keep.min(bytes.len())].to_vec()
}
