//! The golden fixture, searched in Rust. Full TS-vs-Rust equivalence runs in
//! vitest (test/native-history.test.ts); this is the pure-Rust half — the
//! fixture loads, every golden query returns hits, and determinism holds.

use flusk_core::index::types::{RankOptions, SearchQuery};
use flusk_core::index::HistoryEngine;

fn fixture() -> serde_json::Value {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../test/fixtures/history-golden.json");
    serde_json::from_str(&std::fs::read_to_string(path).expect("fixture readable")).unwrap()
}

#[test]
fn golden_queries_all_return_hits() {
    let fx = fixture();
    let engine = HistoryEngine::new(serde_json::from_value(fx["cards"].clone()).unwrap());
    let now = fx["now"].as_str().unwrap();
    let now_ms = flusk_core::index::time::parse_iso_ms(now).unwrap();
    for case in fx["golden"].as_array().unwrap() {
        let query = SearchQuery {
            text: case["query"].as_str().unwrap().to_string(),
            project: None,
            kinds: None,
            paths: case["paths"]
                .as_array()
                .map(|a| a.iter().map(|p| p.as_str().unwrap().to_string()).collect()),
            limit: Some(10),
        };
        let opts = RankOptions { now: Some(now_ms), ..Default::default() };
        let hits = engine.search(&query, &opts);
        assert!(!hits.is_empty(), "no hits for {:?}", query.text);
    }
}

#[test]
fn search_is_deterministic() {
    let fx = fixture();
    let engine = HistoryEngine::new(serde_json::from_value(fx["cards"].clone()).unwrap());
    let q = serde_json::to_string(&serde_json::json!({"text": "retry hook backoff", "limit": 10})).unwrap();
    let a = engine.search_json(&q, "").unwrap();
    let b = engine.search_json(&q, "").unwrap();
    assert_eq!(a, b);
}
