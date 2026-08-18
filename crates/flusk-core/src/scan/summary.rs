//! summarize(): one transcript → one SessionSummary, or None for anything
//! unreadable or foreign — the reference wraps the whole parse in try/catch,
//! so every place it would THROW (malformed interior line, `e.msg.role` on a
//! missing msg, `stats.stats.usage.costUsd` on a missing object) skips the
//! file here. A malformed FINAL line is different: it is the torn tail of an
//! append interrupted by a crash, and is dropped, not fatal.

use std::fs;
use std::path::Path;

use serde_json::{json, Value};

use super::types::SessionSummary;

fn read_entries(text: &str) -> Option<Vec<Value>> {
    let lines: Vec<&str> = text.split('\n').collect();
    let Some(last) = lines.iter().rposition(|l| !l.trim().is_empty()) else {
        return Some(Vec::new());
    };
    let mut entries = Vec::new();
    for (i, line) in lines[..=last].iter().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        match serde_json::from_str::<Value>(line) {
            Ok(v) => entries.push(v),
            Err(_) if i == last => break, // torn final append from a crash
            Err(_) => return None,
        }
    }
    Some(entries)
}

/// The session file doesn't persist RunEndReason; derive a display status.
fn derive_status(has_stats: bool, last_assistant: Option<&Value>) -> &'static str {
    if !has_stats {
        return "running";
    }
    match last_assistant.and_then(|m| m.get("stopReason")).and_then(Value::as_str) {
        Some("end") => "completed",
        Some("error") => "error",
        Some("aborted") => "aborted",
        _ => "stopped", // ended on toolUse: maxTurns/deadline/budget
    }
}

/// Newer files persist the RunEndReason in the stats entry; map it directly.
/// A present-but-null reason still takes this path, like `!== undefined`.
fn status_from_reason(reason: &Value) -> &'static str {
    match reason.as_str() {
        Some("completed") => "completed",
        Some("error") => "error",
        Some("aborted") => "aborted",
        _ => "stopped", // budget/maxTurns/deadline
    }
}

pub fn summarize(path: &Path, key: &str, updated_at_ms: f64) -> Option<SessionSummary> {
    let bytes = fs::read(path).ok()?;
    let entries = read_entries(&String::from_utf8_lossy(&bytes))?;
    let header = entries.first()?;
    if header.get("type").and_then(Value::as_str) != Some("header") {
        return None;
    }
    let mut stats: Option<&Value> = None;
    let mut last_assistant: Option<&Value> = None;
    let mut gate: Option<&Value> = None;
    let mut counted: u64 = 0;
    for e in &entries {
        let t = e.get("type").and_then(Value::as_str);
        if t == Some("stats") {
            stats = Some(e); // the LAST stats entry wins, like the reference loop
        }
        if t == Some("decision") {
            let d = e.get("decision")?; // `.kind` on a missing decision throws
            if d.is_null() {
                return None;
            }
            if d.get("kind").and_then(Value::as_str) == Some("gate") {
                gate = Some(d); // the LAST gate entry wins (scan-derive lastGate)
            }
        }
        if t == Some("message") {
            let msg = e.get("msg")?; // `.role` on a missing/null msg throws
            if msg.is_null() {
                return None;
            }
            if msg.get("role").and_then(Value::as_str) == Some("assistant") {
                last_assistant = Some(msg);
                counted += 1;
            }
        }
    }
    let (status, turns, cost_usd) = match stats {
        Some(st) => {
            let inner = st.get("stats")?;
            if inner.is_null() {
                return None;
            }
            // `stats.stats.turns ?? turns` — null and missing both fall back.
            let turns = match inner.get("turns") {
                None | Some(Value::Null) => json!(counted),
                Some(v) => v.clone(),
            };
            let usage = match inner.get("usage") {
                None | Some(Value::Null) => return None, // `.costUsd` would throw
                Some(v) => v,
            };
            let cost = match usage.get("costUsd") {
                None | Some(Value::Null) => json!(0),
                Some(v) => v.clone(),
            };
            let status = match st.get("reason") {
                Some(r) => status_from_reason(r),
                None => derive_status(true, last_assistant),
            };
            (status, turns, cost)
        }
        None => (derive_status(false, last_assistant), json!(counted), json!(0)),
    };
    // D2 gate fold, mirroring the reference: a blocked outcome in the last
    // gate decision entry overrides whatever stats.reason/stopReason derived.
    let status = if gate.and_then(|g| g.get("outcome")).and_then(Value::as_str) == Some("blocked") {
        "blocked"
    } else {
        status
    };
    // A header without a string createdAt would crash the reference's final
    // sort; such a foreign file is skipped here instead.
    let created_at = header.get("createdAt")?.as_str()?.to_string();
    Some(SessionSummary {
        key: key.to_string(),
        repo_root: header.get("repoRoot").cloned(),
        task: header.get("task").cloned(),
        session_id: header.get("id").cloned(),
        created_at,
        updated_at_ms,
        status: status.to_string(),
        turns,
        cost_usd,
        model: header.get("model").cloned(),
        task_kind: header.get("taskKind").cloned(),
        parent_session: header.get("parentSession").cloned(),
    })
}
