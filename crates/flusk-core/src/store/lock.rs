//! An advisory lock file around the read-modify-append of a transact —
//! src/features/facts/lock.repository.ts, protocol-compatible on disk.
//!
//! INTEROP IS THE POINT: a mixed fleet has TypeScript and Rust writers
//! appending to the same log, so both must contend on the same `<log>.lock`
//! path, the same token file, the same staleness window. A lock is stolen
//! once it is older than STALE_MS, and that trade is bounded ONLY while every
//! removal is a compare-and-delete: a holder whose lock was stolen must not
//! delete the thief's lock on the way out.

use super::rng::uuid_v4;
use std::fs;
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime};

const STALE_MS: u128 = 10_000;
const WAIT_MS: u64 = 15_000;
const RETRY_MS: u64 = 20;

pub fn with_lock<T, E: From<String>>(
    path: &Path,
    work: impl FnOnce() -> Result<T, E>,
) -> Result<T, E> {
    let lock = PathBuf::from(format!("{}.lock", path.display()));
    let token = acquire(&lock).map_err(E::from)?;
    let result = work();
    release(&lock, &token);
    result
}

/// Creates the lock and returns the token that identifies this holder.
fn acquire(lock: &Path) -> Result<String, String> {
    let deadline = Instant::now() + Duration::from_millis(WAIT_MS);
    loop {
        let token = format!("{}:{}", std::process::id(), uuid_v4());
        match fs::OpenOptions::new().write(true).create_new(true).open(lock) {
            Ok(mut handle) => {
                handle
                    .write_all(token.as_bytes())
                    .map_err(|e| format!("store: write lock {}: {e}", lock.display()))?;
                return Ok(token);
            }
            Err(e) if e.kind() == ErrorKind::AlreadyExists => {}
            Err(e) => return Err(format!("store: lock {}: {e}", lock.display())),
        }
        steal_if_stale(lock);
        if Instant::now() > deadline {
            return Err(format!("store: timed out waiting for {}", lock.display()));
        }
        std::thread::sleep(Duration::from_millis(RETRY_MS));
    }
}

/// Remove the lock only while it is still the one this call created. A
/// holder that overran STALE_MS no longer owns the path, and deleting what it
/// finds there would hand the store to a third writer mid-append.
fn release(lock: &Path, token: &str) {
    if token_of(lock).as_deref() != Some(token) {
        return;
    }
    let _ = fs::remove_file(lock);
}

/// Steal an aged-out lock, but only if the token has not changed since it
/// was read: the holder may have released between the read and the unlink,
/// and the lock now on disk would belong to a writer that is not stale.
fn steal_if_stale(lock: &Path) {
    let Some(token) = token_of(lock) else {
        return;
    };
    let Ok(meta) = fs::metadata(lock) else {
        return;
    };
    let Ok(mtime) = meta.modified() else {
        return;
    };
    // An mtime in the future reads as elapsed 0 — not stale, as in JS where
    // a negative Date.now() - mtimeMs never exceeds the window.
    let elapsed = SystemTime::now()
        .duration_since(mtime)
        .unwrap_or(Duration::ZERO);
    if elapsed.as_millis() <= STALE_MS {
        return;
    }
    if token_of(lock).as_deref() != Some(&token) {
        return;
    }
    let _ = fs::remove_file(lock);
}

/// The holder's token, or None when the path is free.
fn token_of(lock: &Path) -> Option<String> {
    fs::read(lock)
        .ok()
        .map(|b| String::from_utf8_lossy(&b).into_owned())
}
