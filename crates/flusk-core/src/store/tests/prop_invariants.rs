//! Property tests over operation interleavings: whatever order asserts,
//! CAS conflicts, TTL writes, sweeps and mid-write tears arrive in, the
//! store must keep the invariants the format exists for — at most one live
//! row per functional (subject, predicate), expiry by timestamp rather than
//! deletion, CAS writing all-or-nothing, and a torn tail costing only itself.

use super::fixtures::{assert_json, live_on, read_ids, truncated, Store, HOUR, T0};
use crate::store::ops::TransactError;
use crate::store::sweep::sweep_transient;
use crate::store::time::to_iso;
use proptest::prelude::*;

#[derive(Clone, Debug)]
enum Op {
    Assert { s: u8, p: u8, o: u8, conf: u8 },
    Cas { s: u8, p: u8, o: u8, expect: u8 },
    Ttl { s: u8, hours: u8 },
    Advance { ms: u32 },
    Tear { keep_pct: u8 },
    Sweep,
}

fn op() -> impl Strategy<Value = Op> {
    prop_oneof![
        (0..3u8, 0..4u8, 0..3u8, 0..=10u8)
            .prop_map(|(s, p, o, conf)| Op::Assert { s, p, o, conf }),
        (0..3u8, 0..2u8, 0..3u8, 0..3u8).prop_map(|(s, p, o, expect)| Op::Cas { s, p, o, expect }),
        (0..3u8, 1..4u8).prop_map(|(s, hours)| Op::Ttl { s, hours }),
        (1..7_200_000u32).prop_map(|ms| Op::Advance { ms }),
        (10..=99u8).prop_map(|keep_pct| Op::Tear { keep_pct }),
        Just(Op::Sweep),
    ]
}

/// Predicates 0–1 are functional, 2–3 coexist — a fixed vocabulary, because
/// a flag that flips per call is the caller bug types exist to prevent.
fn assert_op(store: &mut Store, s: u8, p: u8, o: u8, conf: u8, now: f64) -> Vec<String> {
    let coexist = if p >= 2 { ",\"coexist\":true" } else { "" };
    let a = format!(
        "[{{\"subject\":\"S{s}\",\"predicate\":\"p{p}\",\"object\":\"o{o}\",\
         \"confidence\":{}{coexist}}}]",
        f64::from(conf) / 10.0
    );
    read_ids(&store.transact(&a, now).expect("assert applies"))
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 48, ..ProptestConfig::default() })]

    #[test]
    fn interleavings_keep_the_store_invariants(ops in prop::collection::vec(op(), 1..40)) {
        let mut store = Store::new();
        let mut clock = T0;
        let mut torn = false;
        let mut durable_ids: Vec<String> = Vec::new();
        for step in &ops {
            match step {
                Op::Assert { s, p, o, conf } => {
                    durable_ids.extend(assert_op(&mut store, *s, *p, *o, *conf, clock));
                }
                Op::Cas { s, p, o, expect } => {
                    let before = store.log_bytes();
                    let compares = format!(
                        "[{{\"subject\":\"S{s}\",\"predicate\":\"p{p}\",\"object\":\"o{expect}\"}}]"
                    );
                    let a = format!("[{}]", assert_json(&format!("S{s}"), &format!("p{p}"), &format!("o{o}"), ""));
                    match store.transact_cas(&a, &compares, clock) {
                        Ok(result) => durable_ids.extend(read_ids(&result)),
                        Err(TransactError::CompareFailed(failures)) => {
                            // CAS atomicity: a lost race writes NOTHING.
                            prop_assert_eq!(failures.len(), 1);
                            prop_assert_eq!(&before, &store.log_bytes());
                        }
                        Err(TransactError::Other(e)) => return Err(TestCaseError::fail(e)),
                    }
                }
                Op::Ttl { s, hours } => {
                    let until = to_iso(clock + f64::from(*hours) * HOUR);
                    let a = assert_json(
                        &format!("Item:{s}"), "cooldown_until", &until,
                        &format!("\"transient\":true,\"validUntil\":\"{until}\""),
                    );
                    store.transact(&format!("[{a}]"), clock).expect("ttl applies");
                }
                Op::Advance { ms } => clock += f64::from(*ms),
                Op::Tear { keep_pct } => {
                    let bytes = store.log_bytes();
                    let keep = bytes.len() * usize::from(*keep_pct) / 100;
                    std::fs::write(&store.path, truncated(&store.path, keep)).expect("tear");
                    torn = true;
                }
                Op::Sweep => {
                    sweep_transient(&store.path, clock).expect("sweep applies");
                }
            }
            // One live row per functional (subject, predicate) — after every
            // op, including right after a tear: the close-before-value write
            // order is what makes this hold on any byte prefix.
            for s in 0..3u8 {
                for p in 0..2u8 {
                    let live = live_on(&store, &format!("S{s}"), &format!("p{p}"), clock);
                    prop_assert!(live.len() <= 1, "two live rows on (S{}, p{})", s, p);
                }
            }
        }
        // Expiry is a timestamp, never a deletion: nothing visible now may
        // carry a validUntil at or before now …
        for f in store.query("{\"limit\":9007199254740991}", clock) {
            if let Some(until) = f.get_str("validUntil") {
                prop_assert!(crate::store::time::parse_ms(until) > clock);
            }
        }
        // … and absent a tear, every durable fact ever accepted is still in
        // the file — sweeps take expired transient rows only.
        if !torn {
            let text = String::from_utf8_lossy(&store.log_bytes()).into_owned();
            for id in &durable_ids {
                prop_assert!(text.contains(id.as_str()), "durable id {} swept away", id);
            }
        }
    }
}
