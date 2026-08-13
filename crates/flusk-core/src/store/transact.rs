//! Turning asserts into log lines — src/features/facts/transact.ts, the one
//! place supersession, dedup and the Candidate threshold are decided.
//!
//! Each of the three fails silently when it is wrong: miss the supersession
//! and a functional predicate answers two values at once; miss the dedup and
//! a step that runs twice doubles its own history; let a low-confidence guess
//! supersede, and one unconfirmed extraction closes a directly observed fact.

use super::jval::{js_num, JVal};
use super::materialize::Stored;
use super::record::StoreRecord;
use super::time::parse_ms;
use super::visibility::visible_at;
use serde_json::Number;

/// Below this a fact is a Candidate: out of default reads, and it closes nothing.
const CANDIDATE_BELOW: f64 = 0.75;

/// Confidences this close are the same number and must not defeat dedup.
const CONFIDENCE_EPSILON: f64 = 1e-3;

pub struct Plan {
    pub records: Vec<StoreRecord>,
    pub ids: Vec<String>,
}

pub fn plan_transact(
    rows: &[Stored],
    asserts: &[JVal],
    now_iso: &str,
    tx: f64,
    new_id: &mut dyn FnMut() -> String,
) -> Plan {
    let at = parse_ms(now_iso);
    let live: Vec<&Stored> = rows
        .iter()
        .filter(|r| r.fact.get_str("status") != Some("superseded") && visible_at(&r.fact, at))
        .collect();
    let txn = js_num(tx);
    let mut records: Vec<StoreRecord> = Vec::new();
    let mut ids: Vec<String> = Vec::new();
    for input in asserts {
        if let Some(same) = identical(&live, input) {
            ids.push(same.get_str("id").unwrap_or("").to_string());
            continue;
        }
        let fact = build(input, now_iso, new_id());
        // Closes come FIRST. A batch is one append, so a process killed
        // mid-write leaves a byte prefix of it and whatever was emitted last
        // is what a tear drops. Dropping the new fact costs a value the
        // caller can simply assert again; dropping the close leaves two live
        // values on a functional predicate — the subject is wedged for good.
        if fact.get_str("status") == Some("active") && input.get("coexist") != Some(&JVal::Bool(true))
        {
            for r in &live {
                if r.fact.get_str("status") != Some("active") {
                    continue;
                }
                if r.fact.get("subject") != fact.get("subject")
                    || r.fact.get("predicate") != fact.get("predicate")
                {
                    continue;
                }
                records.push(StoreRecord::Close {
                    tx: txn.clone(),
                    id: r.fact.get_str("id").unwrap_or("").to_string(),
                    valid_until: now_iso.to_string(),
                });
            }
        }
        ids.push(fact.get_str("id").unwrap_or("").to_string());
        records.push(StoreRecord::Fact {
            tx: txn.clone(),
            transient: input.get("transient") == Some(&JVal::Bool(true)),
            fact,
        });
    }
    Plan { records, ids }
}

/// `input.confidence ?? 1`, as a number for threshold and epsilon checks.
fn input_confidence(input: &JVal) -> f64 {
    match input.get("confidence") {
        Some(JVal::Num(n)) => n.as_f64().unwrap_or(f64::NAN),
        _ => 1.0,
    }
}

/// The live row this assert would merely restate. Re-running a step that
/// asserts what it asserted last time must be free: the caller gets the
/// existing id back and the log grows by nothing.
fn identical<'a>(live: &[&'a Stored], input: &JVal) -> Option<&'a JVal> {
    let confidence = input_confidence(input);
    live.iter()
        .find(|r| {
            let f = &r.fact;
            f.get("subject") == input.get("subject")
                && f.get("predicate") == input.get("predicate")
                && f.get("object") == input.get("object")
                && f.get("source") == input.get("source")
                && (f.get_f64("confidence").unwrap_or(f64::NAN) - confidence).abs()
                    <= CONFIDENCE_EPSILON
        })
        .map(|r| &r.fact)
}

/// The reference's object literal, key for key and in its order; keys whose
/// value would be `undefined` are omitted, exactly as JSON.stringify does.
fn build(input: &JVal, now_iso: &str, id: String) -> JVal {
    let confidence = input_confidence(input);
    let conf_val = match input.get("confidence") {
        Some(JVal::Num(n)) => JVal::Num(n.clone()),
        _ => JVal::Num(Number::from(1)),
    };
    let mut entries: Vec<(String, JVal)> = vec![("id".to_string(), JVal::Str(id))];
    for key in ["subject", "predicate", "object"] {
        if let Some(v) = input.get(key) {
            entries.push((key.to_string(), v.clone()));
        }
    }
    entries.push(("confidence".to_string(), conf_val));
    if let Some(v) = input.get("source") {
        entries.push(("source".to_string(), v.clone()));
    }
    let status = if confidence < CANDIDATE_BELOW { "candidate" } else { "active" };
    entries.push(("status".to_string(), JVal::Str(status.to_string())));
    entries.push(("validFrom".to_string(), JVal::Str(now_iso.to_string())));
    let until = match input.get("validUntil") {
        Some(JVal::Null) | None => JVal::Null,
        Some(v) => v.clone(),
    };
    entries.push(("validUntil".to_string(), until));
    if let Some(v) = input.get("properties") {
        entries.push(("properties".to_string(), v.clone()));
    }
    JVal::Obj(entries)
}
