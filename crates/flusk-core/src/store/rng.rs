//! Fact ids and lock tokens. The reference uses crypto.randomUUID; here the
//! bytes come from /dev/urandom (no crate budget for `uuid`/`rand`), with a
//! time-and-pid-seeded splitmix64 fallback so an exotic sandbox degrades to
//! weaker uniqueness rather than a panic. Uniqueness is load-bearing:
//! materialize folds the log by id, so a collision would silently merge two
//! facts' histories.

use std::io::Read;
use std::sync::atomic::{AtomicU64, Ordering};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn fill_urandom(bytes: &mut [u8; 16]) -> bool {
    let Ok(mut f) = std::fs::File::open("/dev/urandom") else {
        return false;
    };
    f.read_exact(bytes).is_ok()
}

fn splitmix64(state: &mut u64) -> u64 {
    *state = state.wrapping_add(0x9e37_79b9_7f4a_7c15);
    let mut z = *state;
    z = (z ^ (z >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
    z ^ (z >> 31)
}

fn fill_splitmix(bytes: &mut [u8; 16]) {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.as_nanos() as u64);
    let mut state = nanos
        ^ (u64::from(std::process::id()) << 32)
        ^ COUNTER.fetch_add(0x0100_0000_0001, Ordering::Relaxed);
    bytes[..8].copy_from_slice(&splitmix64(&mut state).to_le_bytes());
    bytes[8..].copy_from_slice(&splitmix64(&mut state).to_le_bytes());
}

/// RFC-4122 v4 layout, lowercase — 36 bytes, the same width as the
/// reference's ids, which keeps byte offsets aligned across the two
/// implementations' logs (the differential harness truncates both at the
/// same offset to simulate the same crash).
pub fn uuid_v4() -> String {
    let mut bytes = [0u8; 16];
    if !fill_urandom(&mut bytes) {
        fill_splitmix(&mut bytes);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    let hex: Vec<String> = bytes.iter().map(|b| format!("{b:02x}")).collect();
    format!(
        "{}-{}-{}-{}-{}",
        hex[0..4].join(""),
        hex[4..6].join(""),
        hex[6..8].join(""),
        hex[8..10].join(""),
        hex[10..16].join("")
    )
}
