//! Semantics the store must keep under damage and maintenance: torn tails,
//! dedup, the Candidate threshold, CAS rejection, sweep discipline, and the
//! session file's tear tolerance.

use super::fixtures::{assert_json, live_on, read_ids, truncated, Store, HOUR, T0};
use crate::store::log::read_log;
use crate::store::ops::TransactError;
use crate::store::session::{read_session_lines, SessionFile};
use crate::store::sweep::sweep_transient;
use crate::store::time::to_iso;

#[test]
fn identical_reassert_returns_the_existing_id_and_grows_nothing() {
    let mut store = Store::new();
    let a = format!("[{}]", assert_json("Repo:x", "test_cmd", "vitest", ""));
    let first = read_ids(&store.transact(&a, T0).expect("t1"));
    let before = store.log_bytes();
    let second = read_ids(&store.transact(&a, T0 + 1000.0).expect("t2"));
    assert_eq!(first, second);
    assert_eq!(before, store.log_bytes());
}

#[test]
fn a_candidate_supersedes_nothing_and_hides_from_default_reads() {
    let mut store = Store::new();
    store
        .transact(&format!("[{}]", assert_json("G", "status", "done", "")), T0)
        .expect("observed");
    store
        .transact(
            &format!("[{}]", assert_json("G", "status", "failed", "\"confidence\":0.5")),
            T0 + 1000.0,
        )
        .expect("guess");
    let live = live_on(&store, "G", "status", T0 + 2000.0);
    assert_eq!(live.len(), 1);
    assert_eq!(live[0].get_str("object"), Some("done"));
}

#[test]
fn cas_failure_rejects_the_whole_batch_and_writes_nothing() {
    let mut store = Store::new();
    store
        .transact(&format!("[{}]", assert_json("T", "status", "pending", "")), T0)
        .expect("seed");
    let before = store.log_bytes();
    let result = store.transact_cas(
        &format!("[{}]", assert_json("T", "status", "running", "")),
        "[{\"subject\":\"T\",\"predicate\":\"status\",\"object\":\"done\"}]",
        T0 + 1000.0,
    );
    assert!(matches!(result, Err(TransactError::CompareFailed(f)) if f.len() == 1));
    assert_eq!(before, store.log_bytes());
}

#[test]
fn a_torn_tail_costs_the_tail_only_and_the_close_lands_before_the_value() {
    let mut store = Store::new();
    store
        .transact(&format!("[{}]", assert_json("S", "p", "v1", "")), T0)
        .expect("t1");
    store
        .transact(&format!("[{}]", assert_json("S", "p", "v2", "")), T0 + 1000.0)
        .expect("t2");
    let whole = store.log_bytes();
    // Tear at EVERY byte boundary: whatever prefix a crash leaves, the store
    // must never show two live values on the functional (S, p).
    for cut in 0..=whole.len() {
        std::fs::write(&store.path, truncated(&store.path, cut)).expect("truncate");
        let records = read_log(&store.path).expect("read survives");
        assert!(records.len() <= 3, "cut {cut}");
        let live = live_on(&store, "S", "p", T0 + 2000.0);
        assert!(live.len() <= 1, "two live values after tear at byte {cut}");
        std::fs::write(&store.path, &whole).expect("restore");
    }
}

#[test]
fn sweep_takes_expired_transient_rows_only_and_their_closes() {
    let mut store = Store::new();
    let until = to_iso(T0 + HOUR);
    let cool = assert_json(
        "Item:x",
        "cooldown_until",
        &until,
        &format!("\"transient\":true,\"validUntil\":\"{until}\""),
    );
    store.transact(&format!("[{cool}]"), T0).expect("cooldown");
    store
        .transact(&format!("[{}]", assert_json("Run:1", "outcome", "completed", "")), T0)
        .expect("durable");
    assert_eq!(sweep_transient(&store.path, T0 + HOUR / 2.0), Ok(0));
    assert_eq!(sweep_transient(&store.path, T0 + 2.0 * HOUR), Ok(1));
    let text = String::from_utf8(store.log_bytes()).expect("utf8");
    assert!(!text.contains("cooldown_until"));
    assert!(text.contains("outcome"));
}

#[test]
fn session_read_drops_the_torn_tail_but_rejects_interior_damage() {
    let dir = tempfile::tempdir().expect("dir");
    let path = dir.path().join("s.jsonl");
    let mut file = SessionFile::open(&path).expect("open");
    file.append_line("{\"type\":\"header\",\"version\":1}").expect("a1");
    file.append_line("{\"type\":\"message\",\"id\":1}").expect("a2");
    std::fs::write(&path, [std::fs::read(&path).expect("read"), b"{\"type\":\"mess".to_vec()].concat())
        .expect("tear");
    let lines = read_session_lines(&path).expect("torn tail tolerated");
    assert_eq!(lines.len(), 2);
    std::fs::write(&path, "{\"type\":\"header\"}\nnot json\n{\"type\":\"stats\"}\n").expect("mid");
    let err = read_session_lines(&path).expect_err("interior damage is loud");
    assert_eq!(err, format!("Malformed session entry at line 2 in {}", path.display()));
}
