//! Port of src/features/history/bm25.ts: BM25F-lite over one posting list,
//! title x3 / paths x2 / text x1, one length normalisation.

use super::tokenize::tokenize;
use super::types::HistoryCard;
use std::collections::HashMap;

const K1: f64 = 1.2;
const B: f64 = 0.75;

pub struct Posting {
    pub doc: usize,
    /// Field-boosted term frequency.
    pub tf: f64,
}

pub struct Bm25Index {
    pub cards: Vec<HistoryCard>,
    pub postings: HashMap<String, Vec<Posting>>,
    pub lengths: Vec<f64>,
    pub avg_length: f64,
}

pub struct WeightedTerm {
    pub term: String,
    pub weight: f64,
    pub fuzzy: bool,
}

#[derive(Default, Clone)]
pub struct DocScore {
    pub score: f64,
    pub fuzzy: f64,
    pub terms: Vec<String>,
}

fn count(into: &mut HashMap<String, f64>, order: &mut Vec<String>, text: &str, boost: f64) {
    for term in tokenize(text) {
        match into.get_mut(&term) {
            Some(tf) => *tf += boost,
            None => {
                into.insert(term.clone(), boost);
                order.push(term);
            }
        }
    }
}

pub fn build_index(cards: Vec<HistoryCard>) -> Bm25Index {
    let mut postings: HashMap<String, Vec<Posting>> = HashMap::new();
    let mut lengths = Vec::with_capacity(cards.len());
    let mut total = 0.0;
    for (doc, card) in cards.iter().enumerate() {
        let mut counts = HashMap::new();
        let mut order = Vec::new();
        count(&mut counts, &mut order, &card.title, 3.0);
        count(&mut counts, &mut order, &card.paths.join(" "), 2.0);
        count(&mut counts, &mut order, &card.text, 1.0);
        let mut length = 0.0;
        for term in order {
            let tf = counts[&term];
            length += tf;
            postings.entry(term).or_default().push(Posting { doc, tf });
        }
        lengths.push(length);
        total += length;
    }
    let avg = if cards.is_empty() { 1.0 } else { total / cards.len() as f64 };
    Bm25Index { cards, postings, lengths, avg_length: avg }
}

pub fn document_frequency(index: &Bm25Index, term: &str) -> usize {
    index.postings.get(term).map_or(0, Vec::len)
}

/// Scores a pre-weighted term list. Accumulation order per document follows
/// the caller's term order, exactly as the TS Map-insertion semantics do, so
/// float summation order — and therefore the last bit of every score —
/// matches the reference.
pub fn score_terms(index: &Bm25Index, terms: &[WeightedTerm]) -> Vec<(usize, DocScore)> {
    let mut out: HashMap<usize, DocScore> = HashMap::new();
    let mut doc_order: Vec<usize> = Vec::new();
    let mut seen = std::collections::HashSet::new();
    let n = index.cards.len().max(1) as f64;
    let avg = if index.avg_length > 0.0 { index.avg_length } else { 1.0 };
    for wt in terms {
        if !seen.insert(wt.term.clone()) {
            continue;
        }
        let Some(list) = index.postings.get(&wt.term) else { continue };
        let df = list.len() as f64;
        let idf = (1.0 + (n - df + 0.5) / (df + 0.5)).ln();
        for p in list {
            let norm = 1.0 - B + (B * index.lengths.get(p.doc).copied().unwrap_or(avg)) / avg;
            let gain = ((idf * (p.tf * (K1 + 1.0))) / (p.tf + K1 * norm)) * wt.weight;
            let hit = match out.get_mut(&p.doc) {
                Some(h) => h,
                None => {
                    doc_order.push(p.doc);
                    out.entry(p.doc).or_default()
                }
            };
            hit.score += gain;
            if wt.fuzzy {
                hit.fuzzy += gain;
            }
            hit.terms.push(wt.term.clone());
        }
    }
    // Insertion order, as a JS Map iterates — rank.rs relies on it before its
    // own (fully-tiebroken) sort.
    doc_order
        .into_iter()
        .map(|d| {
            let s = out.remove(&d).unwrap_or_default();
            (d, s)
        })
        .collect()
}
