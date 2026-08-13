//! The two timestamp directions the store needs: Date.parse for the ISO
//! strings it reads (shared with the history index, so there is exactly one
//! parser that must agree with JS), and toISOString for the ones it writes.
//! The written form is load-bearing bytes — "YYYY-MM-DDTHH:mm:ss.sssZ",
//! milliseconds always present — because it lands verbatim in the log.

/// Date.parse: milliseconds since epoch, or NaN where JS would say NaN.
pub fn parse_ms(s: &str) -> f64 {
    crate::index::time::parse_iso_ms(s).unwrap_or(f64::NAN)
}

/// Days since 1970-01-01 → (year, month, day); Howard Hinnant's algorithm,
/// the inverse of `days_from_civil` in the index's parser.
fn civil_from_days(z: i64) -> (i64, i64, i64) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (if m <= 2 { y + 1 } else { y }, m, d)
}

/// new Date(ms).toISOString() for the integral epoch milliseconds the store's
/// clock produces. Years outside 0000–9999 (which toISOString prints in an
/// expanded form) cannot occur here and are not supported.
pub fn to_iso(ms: f64) -> String {
    let t = ms as i64;
    let days = t.div_euclid(86_400_000);
    let msod = t.rem_euclid(86_400_000);
    let (y, mo, d) = civil_from_days(days);
    let (h, mi, s, mil) = (
        msod / 3_600_000,
        msod / 60_000 % 60,
        msod / 1_000 % 60,
        msod % 1_000,
    );
    format!("{y:04}-{mo:02}-{d:02}T{h:02}:{mi:02}:{s:02}.{mil:03}Z")
}
