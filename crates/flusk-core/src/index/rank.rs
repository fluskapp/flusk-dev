//! Port of src/features/history/rank.ts: the composite ranker. Recency and
//! outcome are tie-breaks bounded by TIE_BAND; exactness is a TIER — a card
//! containing a query term always sorts above one that only matched an
//! expansion, whatever the scores say.

use super::bm25::{score_terms, Bm25Index};
use super::fuzzy::{expand_query, GramIndex};
use super::tokenize::query_terms;
use super::types::{RankOptions, ScoreParts, SearchHit, SearchQuery};

const TIE_BAND: f64 = 0.04;
const DEFAULT_LIMIT: usize = 20;

fn outcome_weight(outcome: &str, opts: &RankOptions) -> f64 {
    if let Some(w) = opts.outcome_weights.as_ref().and_then(|m| m.get(outcome)) {
        return *w;
    }
    match outcome {
        "verified" => 1.0 + TIE_BAND,
        "shipped" => 1.0 + TIE_BAND / 2.0,
        "blocked" => 1.0 - TIE_BAND / 8.0,
        "failed" => 1.0 - TIE_BAND / 4.0,
        _ => 1.0,
    }
}

fn recency_part(at: &str, opts: &RankOptions) -> f64 {
    let weight = opts.recency_weight.unwrap_or(TIE_BAND / 2.0);
    let Some(parsed) = super::time::parse_iso_ms(at) else { return 1.0 };
    let now = opts.now.unwrap_or_else(|| {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_or(0.0, |d| d.as_millis() as f64)
    });
    let age_days = ((now - parsed) / 86_400_000.0).max(0.0);
    1.0 + weight * 0.5_f64.powf(age_days / opts.half_life_days.unwrap_or(180.0))
}

fn basename(p: &str) -> &str {
    p.rsplit('/').next().unwrap_or(p)
}

/// Suffix at a segment boundary, or basenames agree — bare containment handed
/// unrelated files the full path multiplier.
fn touches(card_path: &str, wanted: &str) -> bool {
    let a = card_path.to_ascii_lowercase();
    let b = wanted.to_ascii_lowercase();
    if a == b || a.ends_with(&format!("/{b}")) || b.ends_with(&format!("/{a}")) {
        return true;
    }
    basename(&a) == basename(&b)
}

fn path_part(paths: &[String], wanted: Option<&Vec<String>>, opts: &RankOptions) -> f64 {
    let Some(wanted) = wanted else { return 1.0 };
    if wanted.is_empty() {
        return 1.0;
    }
    let hits = wanted.iter().filter(|w| paths.iter().any(|p| touches(p, w))).count();
    1.0 + opts.path_weight.unwrap_or(0.6) * (hits as f64 / wanted.len() as f64)
}

fn exactness(hit: &SearchHit) -> u8 {
    u8::from(hit.why.lexical - hit.why.fuzzy > 1e-9)
}

pub fn search(
    index: &Bm25Index,
    grams: &GramIndex,
    query: &SearchQuery,
    opts: &RankOptions,
) -> Vec<SearchHit> {
    let terms = expand_query(index, grams, &query_terms(&query.text));
    let mut hits: Vec<SearchHit> = Vec::new();
    for (doc, scored) in score_terms(index, &terms) {
        let Some(card) = index.cards.get(doc) else { continue };
        if let Some(p) = &query.project {
            if &card.project != p {
                continue;
            }
        }
        if let Some(kinds) = &query.kinds {
            if !kinds.contains(&card.kind) {
                continue;
            }
        }
        let outcome = card.outcome.as_deref().unwrap_or("unknown");
        let why = ScoreParts {
            lexical: scored.score,
            recency: recency_part(&card.at, opts),
            outcome: outcome_weight(outcome, opts),
            path: path_part(&card.paths, query.paths.as_ref(), opts),
            fuzzy: scored.fuzzy,
        };
        let kind = opts.kind_boost.as_ref().and_then(|m| m.get(&card.kind)).copied().unwrap_or(1.0);
        hits.push(SearchHit {
            card: card.clone(),
            score: why.lexical * why.recency * why.outcome * why.path * kind,
            why,
            terms: scored.terms,
        });
    }
    hits.sort_by(|a, b| {
        exactness(b)
            .cmp(&exactness(a))
            .then(b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal))
            .then_with(|| a.card.id.cmp(&b.card.id))
    });
    hits.truncate(query.limit.unwrap_or(DEFAULT_LIMIT));
    hits
}
