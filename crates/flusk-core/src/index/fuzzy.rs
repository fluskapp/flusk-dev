//! Port of src/features/history/fuzzy.ts: trigram candidates, then bounded
//! edit distance, only for terms with almost no exact postings. The ordering
//! guarantee (exact-containing cards above expansion-only cards) lives in
//! rank.rs, exactly as it does in the reference.

use super::bm25::{document_frequency, Bm25Index, WeightedTerm};
use super::edit_distance::edit_distance;
use super::tokenize::trigrams;
use std::collections::{HashMap, HashSet};

const MAX_EXACT_POSTINGS: usize = 1;
const MIN_OVERLAP: f64 = 0.4;
const MAX_CANDIDATES: usize = 3;
const PENALTY: f64 = 0.35;

/// A gram shared by this much of the vocabulary discriminates nothing.
const MAX_BUCKET: usize = 4000;

/// Trigram → vocabulary terms. The TS reference caches this per index in a
/// WeakMap; here the engine owns its index, so the map is built beside it.
pub struct GramIndex {
    buckets: HashMap<String, Vec<String>>,
}

impl GramIndex {
    pub fn build(index: &Bm25Index) -> Self {
        let mut buckets: HashMap<String, Vec<String>> = HashMap::new();
        // Deterministic vocabulary order: sorted, unlike JS Map insertion
        // order — harmless because candidates are re-sorted by (distance,
        // overlap) and ties beyond that cannot arise from bucket order alone.
        let mut terms: Vec<&String> = index.postings.keys().collect();
        terms.sort();
        for term in terms {
            let grams: HashSet<String> = trigrams(term).into_iter().collect();
            for gram in grams {
                buckets.entry(gram).or_default().push(term.clone());
            }
        }
        Self { buckets }
    }
}

/// Expansions for one term, best first; empty when the term needs no help.
pub fn expand_term(index: &Bm25Index, grams_of: &GramIndex, term: &str) -> Vec<WeightedTerm> {
    if document_frequency(index, term) > MAX_EXACT_POSTINGS {
        return Vec::new();
    }
    let max = if term.len() <= 5 { 1 } else { 2 };
    let grams: HashSet<String> = trigrams(term).into_iter().collect();
    let mut shared: HashMap<&str, usize> = HashMap::new();
    let mut order: Vec<&str> = Vec::new();
    for gram in &grams {
        let Some(bucket) = grams_of.buckets.get(gram) else { continue };
        if bucket.len() > MAX_BUCKET {
            continue;
        }
        for other in bucket {
            match shared.get_mut(other.as_str()) {
                Some(n) => *n += 1,
                None => {
                    shared.insert(other, 1);
                    order.push(other);
                }
            }
        }
    }
    let mut scored: Vec<(String, usize, f64)> = Vec::new();
    for candidate in order {
        if candidate == term {
            continue;
        }
        let hits = shared[candidate];
        let overlap = (2 * hits) as f64 / (grams.len() + trigrams(candidate).len()) as f64;
        if overlap < MIN_OVERLAP {
            continue;
        }
        let distance = edit_distance(term, candidate, max);
        if distance > max {
            continue;
        }
        scored.push((candidate.to_string(), distance, overlap));
    }
    scored.sort_by(|a, b| a.1.cmp(&b.1).then(b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal)));
    scored
        .into_iter()
        .take(MAX_CANDIDATES)
        .map(|(t, d, _)| WeightedTerm { term: t, weight: PENALTY / d as f64, fuzzy: true })
        .collect()
}

/// Exact terms at full weight first, then penalised expansions — exact-first
/// ordering is load-bearing (a term another word expands to keeps full weight
/// via score_terms' first-seen de-duplication).
pub fn expand_query(index: &Bm25Index, grams_of: &GramIndex, terms: &[String]) -> Vec<WeightedTerm> {
    let exact: HashSet<&String> = terms.iter().collect();
    let mut out: Vec<WeightedTerm> = terms
        .iter()
        .map(|t| WeightedTerm { term: t.clone(), weight: 1.0, fuzzy: false })
        .collect();
    for term in terms {
        for e in expand_term(index, grams_of, term) {
            if !exact.contains(&e.term) {
                out.push(e);
            }
        }
    }
    out
}
