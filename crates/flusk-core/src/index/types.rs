//! The value boundary: HistoryCard[] in, SearchHit[] out — the same JSON
//! shapes src/features/history/types.ts freezes, so the two implementations
//! are interchangeable behind platform/native.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct HistoryCard {
    pub id: String,
    pub kind: String,
    pub project: String,
    pub title: String,
    pub text: String,
    pub at: String,
    #[serde(default)]
    pub paths: Vec<String>,
    /// The TS type carries more optional fields (outcome etc.); they round-trip
    /// untouched so a hit returns the exact card that went in.
    #[serde(default)]
    pub outcome: Option<String>,
    #[serde(flatten)]
    pub rest: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScoreParts {
    pub lexical: f64,
    pub recency: f64,
    pub outcome: f64,
    pub path: f64,
    pub fuzzy: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct SearchHit {
    pub card: HistoryCard,
    pub score: f64,
    pub why: ScoreParts,
    pub terms: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SearchQuery {
    pub text: String,
    #[serde(default)]
    pub project: Option<String>,
    #[serde(default)]
    pub kinds: Option<Vec<String>>,
    #[serde(default)]
    pub paths: Option<Vec<String>>,
    #[serde(default)]
    pub limit: Option<usize>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RankOptions {
    #[serde(default)]
    pub now: Option<f64>,
    #[serde(default)]
    pub half_life_days: Option<f64>,
    #[serde(default)]
    pub recency_weight: Option<f64>,
    #[serde(default)]
    pub outcome_weights: Option<std::collections::HashMap<String, f64>>,
    #[serde(default)]
    pub kind_boost: Option<std::collections::HashMap<String, f64>>,
    #[serde(default)]
    pub path_weight: Option<f64>,
}
