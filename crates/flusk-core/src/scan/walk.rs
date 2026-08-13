//! sessionFiles + scanSessions: every `<root>/<slug>/*.jsonl`, stamped,
//! newest-mtime first, capped at SESSION_LIMIT, summarized, then newest
//! createdAt first. No file cache here: the cache in the TS reference is a
//! per-process I/O saver, not part of the output contract.

use std::cmp::Ordering;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use super::summary::summarize;
use super::types::{SessionSummary, SESSION_LIMIT};

/// Node's `stat.mtimeMs`: sec * 1e3 + nsec / 1e6 in doubles — same operations
/// in the same order, so the float is bit-identical to what the TS side sees.
fn mtime_ms(t: SystemTime) -> f64 {
    match t.duration_since(UNIX_EPOCH) {
        Ok(d) => d.as_secs() as f64 * 1000.0 + f64::from(d.subsec_nanos()) / 1e6,
        Err(e) => {
            let d = e.duration();
            -(d.as_secs() as f64 * 1000.0 + f64::from(d.subsec_nanos()) / 1e6)
        }
    }
}

struct Found {
    path: PathBuf,
    key: String,
    mtime_ms: f64,
}

/// Every session file with its stamp, newest first, capped.
fn session_files(root: &Path) -> Vec<Found> {
    let Ok(slugs) = fs::read_dir(root) else {
        return Vec::new();
    };
    let mut found = Vec::new();
    for slug in slugs.flatten() {
        let slug_name = slug.file_name().to_string_lossy().into_owned();
        // A stray file at the slug level: readdir fails, the slug is skipped.
        let Ok(files) = fs::read_dir(slug.path()) else {
            continue;
        };
        for file in files.flatten() {
            let name = file.file_name().to_string_lossy().into_owned();
            if !name.ends_with(".jsonl") {
                continue;
            }
            let path = file.path();
            // stampOf: null when the file vanished between readdir and stat.
            let Ok(modified) = fs::metadata(&path).and_then(|m| m.modified()) else {
                continue;
            };
            found.push(Found {
                path,
                key: format!("{slug_name}/{name}"),
                mtime_ms: mtime_ms(modified),
            });
        }
    }
    found.sort_by(|a, b| b.mtime_ms.partial_cmp(&a.mtime_ms).unwrap_or(Ordering::Equal));
    found.truncate(SESSION_LIMIT);
    found
}

pub fn scan_sessions(root: &Path) -> Vec<SessionSummary> {
    let mut out: Vec<SessionSummary> = session_files(root)
        .iter()
        .filter_map(|f| summarize(&f.path, &f.key, f.mtime_ms))
        .collect();
    // The reference sorts with localeCompare; for the ISO-8601 stamps real
    // headers carry, code-unit order and collation agree (both sorts stable).
    out.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    out
}
