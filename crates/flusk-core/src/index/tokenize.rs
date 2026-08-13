//! Port of src/features/history/tokenize.ts. Index and query must agree with
//! the TS reference token for token — the golden differential test holds both
//! to the same output.

const STOPWORDS: &[&str] = &[
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is", "are", "was",
    "were", "be", "been", "by", "at", "it", "its", "this", "that", "from", "as", "but", "not",
    "we", "you", "if", "then", "so", "do", "does", "did", "has", "have", "had", "will", "would",
    "can", "into", "when", "what", "how", "why", "all", "any", "our", "my", "me", "there",
    "their", "they",
];

fn keep(term: &str) -> bool {
    term.len() >= 2 && !STOPWORDS.contains(&term)
}

/// "retryHook" → ["retry","Hook"]; "HTTPServer" → ["HTTP","Server"] — the
/// acronym keeps its head, exactly as the TS regex pair splits it.
fn split_identifier(raw: &str) -> Vec<String> {
    let mut spaced = String::with_capacity(raw.len() + 8);
    let bytes: Vec<char> = raw.chars().collect();
    for (i, &c) in bytes.iter().enumerate() {
        if c == '_' {
            spaced.push(' ');
            continue;
        }
        // ([a-z0-9])([A-Z]) boundary
        if i > 0 && c.is_ascii_uppercase() {
            let prev = bytes[i - 1];
            if prev.is_ascii_lowercase() || prev.is_ascii_digit() {
                spaced.push(' ');
            } else if prev.is_ascii_uppercase() {
                // ([A-Z]+)([A-Z][a-z]) boundary: an upper before an Upper-lower pair
                if bytes.get(i + 1).is_some_and(|n| n.is_ascii_lowercase()) {
                    spaced.push(' ');
                }
            }
        }
        spaced.push(c);
    }
    spaced.split_whitespace().map(str::to_string).collect()
}

/// All one case, no underscore: nothing to split — the fast path that is ~40%
/// of a full index build in the reference implementation.
fn is_plain(raw: &str) -> bool {
    let mut upper = false;
    let mut lower = false;
    for c in raw.chars() {
        if c == '_' {
            return false;
        } else if c.is_ascii_uppercase() {
            upper = true;
        } else if c.is_ascii_lowercase() {
            lower = true;
        }
        if upper && lower {
            return false;
        }
    }
    true
}

/// Lowercased terms in occurrence order, duplicates intact.
pub fn tokenize(text: &str) -> Vec<String> {
    let mut out = Vec::new();
    for raw in text.split(|c: char| !(c.is_ascii_alphanumeric() || c == '_')) {
        if raw.is_empty() {
            continue;
        }
        let whole = raw.to_ascii_lowercase();
        if keep(&whole) {
            out.push(whole);
        }
        if is_plain(raw) {
            continue;
        }
        let parts = split_identifier(raw);
        if parts.len() < 2 {
            continue;
        }
        for part in parts {
            let term = part.to_ascii_lowercase();
            if keep(&term) {
                out.push(term);
            }
        }
    }
    out
}

/// Query terms, de-duplicated in first-seen order.
pub fn query_terms(text: &str) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    tokenize(text)
        .into_iter()
        .filter(|t| seen.insert(t.clone()))
        .collect()
}

/// Anchored character trigrams ("hook" → ^ho, hoo, ook, ok$).
pub fn trigrams(term: &str) -> Vec<String> {
    let padded: Vec<char> = format!("^{}$", term.to_ascii_lowercase()).chars().collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i + 3 <= padded.len() {
        out.push(padded[i..i + 3].iter().collect());
        i += 1;
    }
    out
}
