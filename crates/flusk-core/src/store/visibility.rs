//! The single definition of "visible", shared by reads and by
//! compare-and-swap — src/features/facts/visibility.ts.
//!
//! A guard that judged visibility differently from a query is how two workers
//! end up claiming the same task. Expiry is decided from the stored
//! timestamp, never from a row's presence: a fact past its `validUntil` stays
//! on disk, and its invisibility IS the event a cooldown waits for.

use super::jval::JVal;
use super::time::parse_ms;
use std::collections::HashSet;

/// Row cap when the caller names none. Truncation drops the oldest rows.
pub const DEFAULT_LIMIT: f64 = 200.0;

/// Statuses a read admits when the caller names none.
const DEFAULT_STATUS: &str = "active";

/// ISO-8601 or epoch milliseconds; absent means the caller's "now" — which
/// the binding passes in explicitly, since the clock lives on the JS side.
pub fn at_ms(as_of: Option<&JVal>, now_ms: f64) -> Result<f64, String> {
    match as_of {
        None => Ok(now_ms),
        Some(JVal::Num(n)) => Ok(n.as_f64().unwrap_or(f64::NAN)),
        Some(JVal::Str(s)) => {
            let ms = parse_ms(s);
            if ms.is_nan() {
                Err(format!("query: unparseable asOf \"{s}\""))
            } else {
                Ok(ms)
            }
        }
        // Date.parse coerces anything else to a string and yields NaN, which
        // the reference turns into the same rejection.
        Some(JVal::Null) => Err("query: unparseable asOf \"null\"".to_string()),
        Some(JVal::Bool(b)) => Err(format!("query: unparseable asOf \"{b}\"")),
        Some(_) => Err("query: unparseable asOf \"[object Object]\"".to_string()),
    }
}

/// "active,candidate" -> the set to admit. Independent of `asOf`.
pub fn status_set(status: Option<&str>) -> HashSet<String> {
    status
        .unwrap_or(DEFAULT_STATUS)
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .collect()
}

/// True when the fact had started and had not stopped at `at`. An unreadable
/// timestamp keeps the fact visible: losing a row is worse than showing one.
pub fn visible_at(f: &JVal, at: f64) -> bool {
    let from = f.get_str("validFrom").map_or(f64::NAN, parse_ms);
    if from.is_finite() && from > at {
        return false;
    }
    match f.get("validUntil") {
        Some(JVal::Str(s)) => {
            let until = parse_ms(s);
            !until.is_finite() || until > at
        }
        // null is open-ended; anything else Date.parse-s to NaN → visible.
        _ => true,
    }
}
