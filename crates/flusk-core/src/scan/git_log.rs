//! gitCards port: commits as history cards, newest first.
//!
//! Everything still comes from ONE `git log` — here a std::process::Command
//! with the reference's exact format string; the PARSE is what moved to Rust.
//! Reading the log in-process (the `gix` crate) is the future upgrade, but
//! gix is not in the dependency tree and adding it is not this port's call.
//!
//! OUTCOME rule: an ordinary commit is "shipped"; a commit whose subject
//! literally STARTS with a revert is "failed"; and when it names what it
//! undid, the REFERENCED commit is marked "failed" too — work that had to be
//! taken back is precedent NOT to copy.

use std::path::PathBuf;
use std::process::Command;

use super::cap::cap_text;
use super::chars::js_trim;
use super::noise::is_noise;
use super::revert::{collect_refs, is_failure};
use super::scrub::redact;
use super::types::{GitCard, GitCardOpts};

const DEFAULT_LIMIT: f64 = 800.0;
const TEXT_CAP: usize = 1500;
const MAX_PATHS: usize = 40;
const REC: char = '\u{1e}';
const FORMAT: &str = "--format=\u{1e}%H%x00%aI%x00%P%x00%s%x00%b%x00";

/// The one and only git invocation this module makes.
pub fn log_args(limit: i64, since: Option<&str>) -> Vec<String> {
    let mut args = vec![
        "log".to_string(),
        format!("--max-count={limit}"),
        FORMAT.to_string(),
        "--name-only".to_string(),
    ];
    if let Some(s) = since {
        if !s.is_empty() {
            args.push(format!("--since={s}"));
        }
    }
    args
}

/// `basename(resolve(repoRoot)) || repoRoot`.
fn project_name(repo_root: &str) -> String {
    let abs = std::path::absolute(repo_root).unwrap_or_else(|_| PathBuf::from(repo_root));
    abs.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| repo_root.to_string())
}

fn to_card(record: &str, project: &str, refs: &mut Vec<String>) -> Option<GitCard> {
    let f: Vec<&str> = record.split('\0').collect();
    if f.len() < 6 {
        return None;
    }
    let (sha, at, parents, subject, body, path_blob) = (f[0], f[1], f[2], f[3], f[4], f[5]);
    if sha.is_empty() || subject.is_empty() {
        return None;
    }
    // A merge whose message is only "Merge branch …" carries no lesson; a
    // merge that kept its PR body does, so it stays.
    if js_trim(parents).split(' ').count() > 1 && js_trim(body).is_empty() {
        return None;
    }
    let raw: Vec<&str> = path_blob.split('\n').filter(|p| !js_trim(p).is_empty()).collect();
    let paths: Vec<String> = raw
        .iter()
        .filter(|p| !is_noise(p))
        .take(MAX_PATHS)
        .map(|p| (*p).to_string())
        .collect();
    if paths.is_empty() && !raw.is_empty() {
        return None; // pure-noise commit
    }
    let failed = is_failure(subject);
    // Unconditional: a commit that is not itself a revert can still SAY what
    // it undid, and that target is the failed card.
    collect_refs(&format!("{subject}\n{body}"), refs);
    let text_src = format!("{subject}\n\n{body}\n\n{}", paths.join("\n"));
    Some(GitCard {
        id: format!("commit:{project}:{}", &sha[..sha.len().min(8)]),
        kind: "commit".to_string(),
        project: project.to_string(),
        title: redact(subject),
        text: cap_text(&redact(js_trim(&text_src)), TEXT_CAP),
        at: at.to_string(),
        paths,
        outcome: (if failed { "failed" } else { "shipped" }).to_string(),
        reference: sha.to_string(),
    })
}

/// Second pass: a commit that had to be reverted is itself failed precedent.
fn mark_reverted(cards: &mut [GitCard], refs: &[String]) {
    for r in refs {
        let subject = js_trim(r).to_lowercase();
        for card in cards.iter_mut() {
            if card.outcome == "failed" {
                continue;
            }
            if card.reference.starts_with(r.as_str()) || js_trim(&card.title).to_lowercase() == subject {
                card.outcome = "failed".to_string();
                break;
            }
        }
    }
}

/// Cards for a repo's commits, newest first. A non-git directory yields [].
pub fn git_cards(repo_root: &str, opts: &GitCardOpts) -> Vec<GitCard> {
    let limit = opts.limit.unwrap_or(DEFAULT_LIMIT).trunc().max(0.0) as i64;
    if limit == 0 {
        return Vec::new();
    }
    let output = Command::new("git")
        .args(log_args(limit, opts.since.as_deref()))
        .current_dir(repo_root)
        .output();
    let stdout = match output {
        Ok(o) if o.status.success() => o.stdout,
        _ => return Vec::new(), // not a repo, no git, empty history
    };
    let stdout = String::from_utf8_lossy(&stdout);
    let project = project_name(repo_root);
    let mut refs: Vec<String> = Vec::new();
    let mut cards: Vec<GitCard> = Vec::new();
    let mut records = stdout.split(REC);
    records.next(); // .slice(1): everything before the first record marker
    for record in records {
        if let Some(card) = to_card(record, &project, &mut refs) {
            cards.push(card);
        }
    }
    mark_reverted(&mut cards, &refs);
    cards
}
