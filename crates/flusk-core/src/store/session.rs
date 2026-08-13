//! The session file — src/features/session/session.repository.ts. Append is
//! fsynced so a crash mid-run loses at most the entry being written, never a
//! synced one; the read drops a malformed FINAL line as the torn tail that
//! design promises to survive, and rejects a malformed interior line loudly,
//! with the reference's exact message.
//!
//! Serialization stays on the JS side: the seam hands this file the already
//! JSON.stringify-ed line, so the bytes on disk are the reference's bytes by
//! construction and this module owns only durability — append, fsync, and
//! the tear-tolerant read.

use std::fs;
use std::io::Write;
use std::path::Path;

pub struct SessionFile {
    file: fs::File,
}

impl SessionFile {
    pub fn open(path: &Path) -> Result<SessionFile, String> {
        if let Some(dir) = path.parent() {
            if !dir.as_os_str().is_empty() {
                fs::create_dir_all(dir)
                    .map_err(|e| format!("session: mkdir {}: {e}", dir.display()))?;
            }
        }
        let file = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|e| format!("session: open {}: {e}", path.display()))?;
        Ok(SessionFile { file })
    }

    /// One line, one fsync — the write is not durable until fsync returns,
    /// and the caller's contract ("at most the entry being written is lost")
    /// only holds if every append pays that cost.
    pub fn append_line(&mut self, json_line: &str) -> Result<(), String> {
        self.file
            .write_all(format!("{json_line}\n").as_bytes())
            .map_err(|e| format!("session: write: {e}"))?;
        self.file.sync_all().map_err(|e| format!("session: fsync: {e}"))
    }
}

/// The surviving lines of a session file, still raw JSON: parsing into typed
/// entries stays in TypeScript, but WHICH lines survive is decided here,
/// identically to the reference — malformed interior lines throw with their
/// 1-based line number, a malformed final content line is the torn tail of a
/// crashed append and is dropped.
pub fn read_session_lines(path: &Path) -> Result<Vec<String>, String> {
    let bytes = fs::read(path).map_err(|e| format!("session: read {}: {e}", path.display()))?;
    let text = String::from_utf8_lossy(&bytes);
    let lines: Vec<&str> = text.split('\n').collect();
    let mut last_content: i64 = -1;
    for (i, line) in lines.iter().enumerate() {
        if !line.trim().is_empty() {
            last_content = i as i64;
        }
    }
    let mut out = Vec::new();
    for (i, line) in lines.iter().enumerate() {
        if i as i64 > last_content {
            break;
        }
        if line.trim().is_empty() {
            continue;
        }
        if serde_json::from_str::<serde::de::IgnoredAny>(line).is_ok() {
            out.push((*line).to_string());
        } else if i as i64 == last_content {
            break; // torn final append from a crash
        } else {
            return Err(format!(
                "Malformed session entry at line {} in {}",
                i + 1,
                path.display()
            ));
        }
    }
    Ok(out)
}
