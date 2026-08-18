//! Pure-Rust half of the stage-2 tests: parsing, statuses, torn tails, the
//! revert grammar and the caps. Full TS-vs-Rust equivalence runs in vitest
//! (test/native-scan*.test.ts) over real trees and a scripted repo.

use std::fs;

use super::cap::cap_text;
use super::git_log::log_args;
use super::revert::{collect_refs, is_failure};
use super::walk::scan_sessions;

const HEADER: &str = r#"{"type":"header","version":1,"id":"a1","task":"t","repoRoot":"/r","gitBranch":null,"model":{"provider":"fake","id":"fake-1","contextWindow":200000},"createdAt":"2026-08-01T00:00:00.000Z"}"#;
const ASSISTANT: &str = r#"{"type":"message","id":2,"msg":{"role":"assistant","content":[],"stopReason":"end","usage":{"input":1,"output":1,"cacheRead":0,"costUsd":0.1}}}"#;
const STATS: &str = r#"{"type":"stats","id":3,"stats":{"turns":2,"usage":{"input":1,"output":1,"cacheRead":0,"costUsd":0.5},"startedAt":"2026-08-01T00:00:00.000Z"},"reason":"completed"}"#;
const GATE_BLOCKED: &str = r#"{"type":"decision","id":4,"at":"2026-08-01T00:00:01.000Z","decision":{"kind":"gate","outcome":"blocked","retries":2,"verified":[]}}"#;
const GATE_OK: &str = r#"{"type":"decision","id":5,"at":"2026-08-01T00:00:02.000Z","decision":{"kind":"gate","outcome":"completed","retries":1,"verified":["npm test"]}}"#;

fn tree(files: &[(&str, &str)]) -> tempfile::TempDir {
    let dir = tempfile::tempdir().unwrap();
    for (rel, body) in files {
        let path = dir.path().join(rel);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, body).unwrap();
    }
    dir
}

#[test]
fn statuses_derive_like_the_reference() {
    let dir = tree(&[
        ("repo-1/a.jsonl", &format!("{HEADER}\n{ASSISTANT}\n{STATS}\n")),
        ("repo-1/b.jsonl", &format!("{HEADER}\n{ASSISTANT}\n")), // no stats: running
        (
            "repo-1/c.jsonl", // stats without reason: derive from stopReason
            &format!("{HEADER}\n{ASSISTANT}\n{}\n", STATS.replace(",\"reason\":\"completed\"", "")),
        ),
    ]);
    let out = scan_sessions(dir.path());
    assert_eq!(out.len(), 3);
    let by = |suffix: &str| out.iter().find(|s| s.key.ends_with(suffix)).unwrap();
    assert_eq!(by("a.jsonl").status, "completed");
    assert_eq!(by("b.jsonl").status, "running");
    assert_eq!(by("c.jsonl").status, "completed");
    assert_eq!(by("a.jsonl").turns, serde_json::json!(2));
    assert_eq!(by("b.jsonl").turns, serde_json::json!(1)); // counted, not recorded
}

#[test]
fn last_gate_entry_outranks_stats_reason() {
    let dir = tree(&[
        // Gate blocked: stats says "completed", the gate's judgment wins (D2).
        ("repo-1/blocked.jsonl", &format!("{HEADER}\n{ASSISTANT}\n{GATE_BLOCKED}\n{STATS}\n")),
        // A retry that finally passed appends a later completed entry: it wins.
        ("repo-1/retried.jsonl", &format!("{HEADER}\n{ASSISTANT}\n{GATE_BLOCKED}\n{GATE_OK}\n{STATS}\n")),
    ]);
    let out = scan_sessions(dir.path());
    let by = |suffix: &str| out.iter().find(|s| s.key.ends_with(suffix)).unwrap();
    assert_eq!(by("blocked.jsonl").status, "blocked");
    assert_eq!(by("retried.jsonl").status, "completed");
}

#[test]
fn torn_tail_is_dropped_and_interior_damage_skips_the_file() {
    let dir = tree(&[
        ("repo-1/torn.jsonl", &format!("{HEADER}\n{ASSISTANT}\n{{\"type\":\"sta")),
        ("repo-1/broken.jsonl", &format!("{HEADER}\nnot json\n{ASSISTANT}\n")),
        ("repo-1/headless.jsonl", &format!("{ASSISTANT}\n")),
    ]);
    let out = scan_sessions(dir.path());
    assert_eq!(out.len(), 1);
    assert!(out[0].key.ends_with("torn.jsonl"));
    assert_eq!(out[0].status, "running"); // the torn stats line never counted
}

#[test]
fn empty_and_missing_roots_scan_to_nothing() {
    let dir = tempfile::tempdir().unwrap();
    assert!(scan_sessions(dir.path()).is_empty());
    assert!(scan_sessions(&dir.path().join("missing")).is_empty());
}

#[test]
fn revert_subjects_open_with_a_revert() {
    assert!(is_failure("Revert \"feat: add widget\""));
    assert!(is_failure("revert: styles rollback"));
    assert!(is_failure("fix(api)!: revert the widget"));
    assert!(!is_failure("feat: add undo button"));
    assert!(!is_failure("fix broken sessions in the agents view"));
    assert!(!is_failure("feat: reverting is not opening with revert")); // revert\b fails
}

#[test]
fn refs_name_what_a_revert_undid() {
    let mut refs = Vec::new();
    collect_refs("This reverts commit abc1234def.", &mut refs);
    collect_refs("Reverts \"feat: styles\"", &mut refs);
    collect_refs("reverted deadbeefcafe earlier", &mut refs);
    assert_eq!(refs, ["abc1234def", "feat: styles", "deadbeefcafe"]);
    let mut none = Vec::new();
    collect_refs("revert abcdef", &mut none); // 6 hex: under the 7-char floor
    collect_refs("unreverted abc1234def", &mut none); // no \b before revert
    assert!(none.is_empty());
}

#[test]
fn cap_text_cuts_where_a_reader_would() {
    assert_eq!(cap_text("hello world", 8), "hello"); // partial "wo" dropped
    assert_eq!(cap_text("hello world", 5), "hello"); // next char is the space
    assert_eq!(cap_text("hello", 5), "hello");
    assert_eq!(cap_text("abcdefghij", 4), "abcd"); // one enormous token: hard cut
    assert_eq!(cap_text("anything", 0), "");
}

#[test]
fn log_args_carry_the_frozen_format() {
    let args = log_args(800, None);
    assert!(args.contains(&"--max-count=800".to_string()));
    assert!(args.contains(&"--name-only".to_string()));
    assert!(args.iter().any(|a| a.starts_with("--format=\u{1e}%H%x00%aI")));
    assert!(log_args(9, Some("2 weeks ago")).contains(&"--since=2 weeks ago".to_string()));
}
