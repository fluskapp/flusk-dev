//! The value boundary: the SessionSummary and HistoryCard JSON shapes the TS
//! references freeze. Header/stats fields pass through as raw Values so a
//! summary carries exactly what the transcript said; field order matches the
//! reference object literals, and optional keys are omitted (not null) when
//! the header lacks them, exactly as JSON.stringify drops undefined.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Transcripts a scan will parse, newest first (SESSION_LIMIT).
pub const SESSION_LIMIT: usize = 500;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repo_root: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<Value>,
    pub created_at: String,
    pub updated_at_ms: f64,
    pub status: String,
    pub turns: Value,
    pub cost_usd: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<Value>,
    /// Routing kind from the header, when the run recorded one.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task_kind: Option<Value>,
    /// Present when this session belongs to a subagent (links to its parent).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_session: Option<Value>,
}

/// One commit as a history card — the frozen HistoryCard contract.
#[derive(Debug, Clone, Serialize)]
pub struct GitCard {
    pub id: String,
    pub kind: String,
    pub project: String,
    pub title: String,
    pub text: String,
    pub at: String,
    pub paths: Vec<String>,
    pub outcome: String,
    #[serde(rename = "ref")]
    pub reference: String,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct GitCardOpts {
    pub limit: Option<f64>,
    /// Anything `git log --since` accepts, e.g. "6 months ago".
    pub since: Option<String>,
}
