//! The two line shapes the log can hold, and the only parser for them —
//! src/features/facts/record.ts, byte for byte on the encode side.
//!
//! The log is append-only, so a supersession cannot edit the line it closes;
//! it is a later line that shadows it. Parsing rejects a line rather than the
//! file: a process killed mid-write leaves a truncated tail, and one
//! unreadable line must never cost the store.
//!
//! Encoding writes the record envelope in the reference's literal key order
//! (k, tx, transient, fact / k, tx, id, validUntil) with `transient` always
//! present — parseRecord normalizes it to a boolean, so a sweep rewrite
//! stamps "transient":false even onto lines that originally omitted it.

use super::jval::{write_js_string, JVal};
use serde_json::Number;

pub enum StoreRecord {
    Fact {
        tx: Number,
        transient: bool,
        fact: JVal,
    },
    Close {
        tx: Number,
        id: String,
        valid_until: String,
    },
}

impl StoreRecord {
    pub fn tx(&self) -> f64 {
        match self {
            StoreRecord::Fact { tx, .. } | StoreRecord::Close { tx, .. } => {
                tx.as_f64().unwrap_or(0.0)
            }
        }
    }

    /// The fact this record is about: its own id, or the id a close targets.
    pub fn subject_id(&self) -> &str {
        match self {
            StoreRecord::Fact { fact, .. } => fact.get_str("id").unwrap_or(""),
            StoreRecord::Close { id, .. } => id,
        }
    }
}

pub fn encode(records: &[StoreRecord]) -> String {
    let mut out = String::new();
    for r in records {
        match r {
            StoreRecord::Fact { tx, transient, fact } => {
                out.push_str("{\"k\":\"fact\",\"tx\":");
                out.push_str(&tx.to_string());
                out.push_str(",\"transient\":");
                out.push_str(if *transient { "true" } else { "false" });
                out.push_str(",\"fact\":");
                out.push_str(&fact.to_json());
            }
            StoreRecord::Close { tx, id, valid_until } => {
                out.push_str("{\"k\":\"close\",\"tx\":");
                out.push_str(&tx.to_string());
                out.push_str(",\"id\":");
                write_js_string(id, &mut out);
                out.push_str(",\"validUntil\":");
                write_js_string(valid_until, &mut out);
            }
        }
        out.push_str("}\n");
    }
    out
}

/// None for any line that is not a whole, well-formed record.
pub fn parse_record(line: &str) -> Option<StoreRecord> {
    let raw: JVal = serde_json::from_str(line).ok()?;
    let tx = match raw.get("tx") {
        Some(JVal::Num(n)) => n.clone(),
        _ => Number::from(0),
    };
    if raw.get_str("k") == Some("close") {
        let (id, valid_until) = (raw.get_str("id")?, raw.get_str("validUntil")?);
        return Some(StoreRecord::Close {
            tx,
            id: id.to_string(),
            valid_until: valid_until.to_string(),
        });
    }
    if raw.get_str("k") == Some("fact") {
        let fact = raw.get("fact")?;
        if is_fact(fact) {
            return Some(StoreRecord::Fact {
                tx,
                transient: raw.get("transient") == Some(&JVal::Bool(true)),
                fact: fact.clone(),
            });
        }
    }
    None
}

const STATUSES: [&str; 3] = ["active", "candidate", "superseded"];

fn is_fact(v: &JVal) -> bool {
    for key in ["id", "subject", "predicate", "object", "validFrom"] {
        if v.get_str(key).is_none() {
            return false;
        }
    }
    if !matches!(v.get("confidence"), Some(JVal::Num(_))) {
        return false;
    }
    let Some(status) = v.get_str("status") else {
        return false;
    };
    if !STATUSES.contains(&status) {
        return false;
    }
    matches!(v.get("validUntil"), Some(JVal::Null) | Some(JVal::Str(_)))
}
