//! ISO-8601 parsing that agrees with JS Date.parse for the timestamps this
//! corpus actually contains ("2026-06-27T09:12:00.000Z" and date-only
//! "2026-06-27"). Anything else returns None, exactly where Date.parse would
//! return NaN and the recency part falls back to 1.

fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    // Howard Hinnant's algorithm; days since 1970-01-01.
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = (m + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

/// Milliseconds since the epoch for a UTC ISO timestamp, or None.
pub fn parse_iso_ms(s: &str) -> Option<f64> {
    let b = s.as_bytes();
    if b.len() < 10 || b[4] != b'-' || b[7] != b'-' {
        return None;
    }
    let num = |from: usize, to: usize| -> Option<i64> { s.get(from..to)?.parse().ok() };
    let (y, mo, d) = (num(0, 4)?, num(5, 7)?, num(8, 10)?);
    if !(1..=12).contains(&mo) || !(1..=31).contains(&d) {
        return None;
    }
    let mut ms = days_from_civil(y, mo, d) as f64 * 86_400_000.0;
    if b.len() == 10 {
        return Some(ms);
    }
    if b[10] != b'T' || b.len() < 19 || b[13] != b':' || b[16] != b':' {
        return None;
    }
    let (h, mi, sec) = (num(11, 13)?, num(14, 16)?, num(17, 19)?);
    ms += (h * 3_600_000 + mi * 60_000 + sec * 1_000) as f64;
    let mut i = 19;
    if b.get(19) == Some(&b'.') {
        let end = 20 + s[20..].bytes().take_while(u8::is_ascii_digit).count();
        let frac = &s[20..end];
        let scale = 10_f64.powi(3 - frac.len() as i32);
        ms += frac.parse::<f64>().ok()? * scale;
        i = end;
    }
    match s.get(i..) {
        Some("Z") | Some("") => Some(ms),
        Some(tz) if tz.len() == 6 && (tz.starts_with('+') || tz.starts_with('-')) => {
            let sign = if tz.starts_with('-') { 1.0 } else { -1.0 };
            let oh: f64 = tz[1..3].parse().ok()?;
            let om: f64 = tz[4..6].parse().ok()?;
            Some(ms + sign * (oh * 3_600_000.0 + om * 60_000.0))
        }
        _ => None,
    }
}
