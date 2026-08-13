//! Byte-level checks: the exact lines a plan encodes to, and the timestamp
//! format those lines carry. These are the assertions the differential
//! harness depends on being cheap to localize when it fails.

use super::fixtures::{assert_json, Store, T0};
use crate::store::jval::JVal;
use crate::store::materialize::materialize;
use crate::store::record::{encode, parse_record};
use crate::store::time::{parse_ms, to_iso};
use crate::store::transact::plan_transact;

#[test]
fn to_iso_matches_date_to_iso_string() {
    assert_eq!(to_iso(0.0), "1970-01-01T00:00:00.000Z");
    assert_eq!(to_iso(T0), "2026-01-01T00:00:00.000Z");
    assert_eq!(to_iso(1_754_993_045_123.0), "2025-08-12T10:04:05.123Z");
    for ms in [T0, T0 + 1.0, T0 + 86_399_999.0, 951_827_696_789.0] {
        assert_eq!(parse_ms(&to_iso(ms)), ms);
    }
}

#[test]
fn a_plan_encodes_the_reference_bytes_key_for_key() {
    let mut n = 0;
    let mut ids = move || {
        n += 1;
        format!("id-{n}")
    };
    let input: JVal =
        serde_json::from_str("{\"subject\":\"Repo:x\",\"predicate\":\"test_cmd\",\"object\":\"vitest\",\"confidence\":1}")
            .expect("input");
    let plan = plan_transact(&[], &[input], "2026-01-01T00:00:00.000Z", 1.0, &mut ids);
    assert_eq!(
        encode(&plan.records),
        "{\"k\":\"fact\",\"tx\":1,\"transient\":false,\"fact\":{\"id\":\"id-1\",\
         \"subject\":\"Repo:x\",\"predicate\":\"test_cmd\",\"object\":\"vitest\",\
         \"confidence\":1,\"status\":\"active\",\
         \"validFrom\":\"2026-01-01T00:00:00.000Z\",\"validUntil\":null}}\n"
    );
}

#[test]
fn integer_confidence_never_grows_a_fraction_and_floats_stay_shortest() {
    let mut store = Store::new();
    store
        .transact(&format!("[{}]", assert_json("A", "p", "v1", "\"confidence\":1")), T0)
        .expect("t1");
    store
        .transact(
            &format!("[{}]", assert_json("A", "q", "v2", "\"confidence\":0.8")),
            T0 + 1000.0,
        )
        .expect("t2");
    let text = String::from_utf8(store.log_bytes()).expect("utf8");
    assert!(text.contains("\"confidence\":1,"), "log: {text}");
    assert!(text.contains("\"confidence\":0.8,"), "log: {text}");
    assert!(!text.contains("\"confidence\":1.0"), "no float-widened integers: {text}");
}

#[test]
fn properties_key_order_survives_a_parse_encode_round_trip() {
    // The sweep path re-encodes parsed lines; JSON.stringify would keep the
    // document order of `properties`, so ours must too — this is the case
    // serde_json's sorted map would silently break.
    let line = "{\"k\":\"fact\",\"tx\":3,\"transient\":false,\"fact\":{\"id\":\"a\",\
                \"subject\":\"S\",\"predicate\":\"p\",\"object\":\"o\",\"confidence\":1,\
                \"status\":\"active\",\"validFrom\":\"2026-01-01T00:00:00.000Z\",\
                \"validUntil\":null,\"properties\":{\"zeta\":1,\"alpha\":{\"b\":2,\"a\":\"x\"}}}}";
    let record = parse_record(line).expect("parses");
    assert_eq!(encode(&[record]), format!("{line}\n"));
}

#[test]
fn a_close_shadows_but_never_extends_and_keeps_the_earlier_until() {
    let lines = [
        "{\"k\":\"fact\",\"tx\":1,\"transient\":false,\"fact\":{\"id\":\"a\",\"subject\":\"S\",\
         \"predicate\":\"p\",\"object\":\"o\",\"confidence\":1,\"status\":\"active\",\
         \"validFrom\":\"2026-01-01T00:00:00.000Z\",\"validUntil\":\"2026-01-01T01:00:00.000Z\"}}",
        "{\"k\":\"close\",\"tx\":2,\"id\":\"a\",\"validUntil\":\"2026-01-01T02:00:00.000Z\"}",
    ];
    let records: Vec<_> = lines.iter().filter_map(|l| parse_record(l)).collect();
    let rows = materialize(&records);
    assert_eq!(rows[0].fact.get_str("status"), Some("superseded"));
    // The stored until (01:00) is earlier than the close (02:00): it stays.
    assert_eq!(
        rows[0].fact.get_str("validUntil"),
        Some("2026-01-01T01:00:00.000Z")
    );
}
