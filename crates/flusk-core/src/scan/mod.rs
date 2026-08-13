//! Stage 2 of the CPU/IO floor: session-transcript scanning and git-history
//! parsing. Ports of src/features/projects/scan.repository.ts (scanSessions)
//! and src/features/history/source-git.repository.ts (gitCards). Behavior
//! parity is the contract — float order, sort stability, torn-tail tolerance
//! and every scrub regex's backtracking order are preserved, because the
//! differential tests in test/native-scan*.test.ts demand deep equality.

pub mod cap;
mod chars;
pub mod git_log;
mod noise;
pub mod revert;
pub mod scrub;
mod scrub_assign;
mod scrub_tokens;
mod scrub_urls;
pub mod summary;
pub mod types;
pub mod walk;

#[cfg(test)]
mod tests;
#[cfg(test)]
mod tests_scrub;

use std::path::Path;

/// SessionSummary[] JSON for every transcript under `root_dir`, newest first.
pub fn scan_sessions_json(root_dir: &str) -> String {
    serde_json::to_string(&walk::scan_sessions(Path::new(root_dir)))
        .unwrap_or_else(|_| "[]".to_string())
}

/// HistoryCard[] JSON for a repo's commits, newest first; "[]" outside a repo.
pub fn git_log_cards_json(repo_root: &str, opts_json: &str) -> String {
    let opts = if opts_json.trim().is_empty() {
        types::GitCardOpts::default()
    } else {
        serde_json::from_str(opts_json).unwrap_or_default()
    };
    serde_json::to_string(&git_log::git_cards(repo_root, &opts))
        .unwrap_or_else(|_| "[]".to_string())
}
