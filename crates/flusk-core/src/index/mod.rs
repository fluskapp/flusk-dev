//! The history index: tokenize, BM25F, fuzzy expansion, composite rank.
//! `HistoryEngine` is the unit the bindings expose — build once per corpus,
//! search many times, exactly the shape the TS fallback presents.

pub mod bm25;
pub mod edit_distance;
pub mod fuzzy;
pub mod rank;
pub mod time;
pub mod tokenize;
pub mod types;

use bm25::{build_index, Bm25Index};
use fuzzy::GramIndex;
use types::{HistoryCard, RankOptions, SearchHit, SearchQuery};

pub struct HistoryEngine {
    index: Bm25Index,
    grams: GramIndex,
}

impl HistoryEngine {
    pub fn new(cards: Vec<HistoryCard>) -> Self {
        let index = build_index(cards);
        let grams = GramIndex::build(&index);
        Self { index, grams }
    }

    pub fn from_json(cards_json: &str) -> Result<Self, serde_json::Error> {
        Ok(Self::new(serde_json::from_str(cards_json)?))
    }

    pub fn search(&self, query: &SearchQuery, opts: &RankOptions) -> Vec<SearchHit> {
        rank::search(&self.index, &self.grams, query, opts)
    }

    pub fn search_json(&self, query_json: &str, opts_json: &str) -> Result<String, serde_json::Error> {
        let query: SearchQuery = serde_json::from_str(query_json)?;
        let opts: RankOptions = if opts_json.trim().is_empty() {
            RankOptions::default()
        } else {
            serde_json::from_str(opts_json)?
        };
        serde_json::to_string(&self.search(&query, &opts))
    }

    pub fn len(&self) -> usize {
        self.index.cards.len()
    }

    pub fn is_empty(&self) -> bool {
        self.index.cards.is_empty()
    }
}
