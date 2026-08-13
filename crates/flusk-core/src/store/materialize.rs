//! Folding the log into rows — src/features/facts/materialize.ts.
//!
//! Visibility is deliberately NOT decided here: that depends on the read's
//! `asOf`, and baking it in would make a snapshot read impossible. A close
//! applied here can only ever shorten a fact's life; letting one extend it
//! would resurrect a value a reader had already stopped seeing, the one thing
//! a bitemporal log must never do.

use super::jval::JVal;
use super::record::StoreRecord;
use std::collections::HashMap;

/// A stored row: the fact plus the flags that live outside its shape.
pub struct Stored {
    pub fact: JVal,
    pub transient: bool,
}

pub fn materialize(records: &[StoreRecord]) -> Vec<Stored> {
    let mut by_id: HashMap<String, usize> = HashMap::new();
    let mut order: Vec<Stored> = Vec::new();
    for r in records {
        match r {
            StoreRecord::Fact { transient, fact, .. } => {
                let Some(id) = fact.get_str("id") else {
                    continue; // unreachable past parse validation; never panic on a log
                };
                if by_id.contains_key(id) {
                    continue;
                }
                by_id.insert(id.to_string(), order.len());
                order.push(Stored {
                    fact: fact.clone(),
                    transient: *transient,
                });
            }
            // A close whose fact has been compacted away is dropped, not an error.
            StoreRecord::Close { id, valid_until, .. } => {
                let Some(&i) = by_id.get(id) else {
                    continue;
                };
                let row = &mut order[i];
                row.fact.set("status", JVal::Str("superseded".to_string()));
                // Keep the EARLIER validUntil — string compare, as the
                // reference does; ISO-8601 UTC makes string order time order.
                let keep_current = matches!(
                    row.fact.get("validUntil"),
                    Some(JVal::Str(current)) if current.as_str() < valid_until.as_str()
                );
                if !keep_current {
                    row.fact.set("validUntil", JVal::Str(valid_until.clone()));
                }
            }
        }
    }
    order
}

/// Highest transaction number in the log; 0 for an empty one.
pub fn last_tx(records: &[StoreRecord]) -> f64 {
    let mut max = 0.0;
    for r in records {
        if r.tx() > max {
            max = r.tx();
        }
    }
    max
}
