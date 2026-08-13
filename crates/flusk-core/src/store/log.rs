//! The file layer — src/features/facts/log.repository.ts.
//!
//! A batch is written with one append so the operating system takes it as a
//! single O_APPEND write: either the whole transact is in the file or its
//! tail is torn, and a torn tail is exactly the case the reader is built to
//! skip. Skipping it is only safe because of the order transact.rs builds the
//! batch in — a supersession is written BEFORE the value that replaces it, so
//! the prefix a tear leaves behind is always a state the store can express.

use super::record::{encode, parse_record, StoreRecord};
use std::fs;
use std::io::{ErrorKind, Read, Seek, SeekFrom, Write};
use std::path::Path;

fn io_err(what: &str, path: &Path, e: &std::io::Error) -> String {
    format!("store: {what} {}: {e}", path.display())
}

/// Every readable record, in append order. A missing log is an empty one.
/// Invalid UTF-8 is replaced, not fatal, as Node's utf8 decode does — a tear
/// mid-multibyte-character must cost that line only.
pub fn read_log(path: &Path) -> Result<Vec<StoreRecord>, String> {
    let bytes = match fs::read(path) {
        Ok(b) => b,
        Err(e) if e.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(e) => return Err(io_err("read", path, &e)),
    };
    let text = String::from_utf8_lossy(&bytes);
    let mut out = Vec::new();
    for line in text.split('\n') {
        if line.trim().is_empty() {
            continue;
        }
        if let Some(record) = parse_record(line) {
            out.push(record);
        }
    }
    Ok(out)
}

pub fn append_log(path: &Path, records: &[StoreRecord]) -> Result<(), String> {
    if records.is_empty() {
        return Ok(());
    }
    mkdirs(path)?;
    // A previous process killed mid-write leaves a line with no newline. The
    // batch has to start on a line of its own, or it would be glued onto that
    // fragment and skipped as unreadable — one crash silently eating the next
    // write as well.
    let prefix = if ends_with_newline(path)? { "" } else { "\n" };
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|e| io_err("open", path, &e))?;
    file.write_all(format!("{prefix}{}", encode(records)).as_bytes())
        .map_err(|e| io_err("append", path, &e))
}

fn ends_with_newline(path: &Path) -> Result<bool, String> {
    let mut file = match fs::File::open(path) {
        Ok(f) => f,
        Err(e) if e.kind() == ErrorKind::NotFound => return Ok(true),
        Err(e) => return Err(io_err("open", path, &e)),
    };
    let size = file.metadata().map_err(|e| io_err("stat", path, &e))?.len();
    if size == 0 {
        return Ok(true);
    }
    file.seek(SeekFrom::End(-1)).map_err(|e| io_err("seek", path, &e))?;
    let mut tail = [0u8; 1];
    file.read_exact(&mut tail).map_err(|e| io_err("read", path, &e))?;
    Ok(tail[0] == b'\n')
}

/// Replace the log wholesale, via a temp file and a rename. Only compaction
/// uses this: a partial rewrite would lose durable history the append path
/// can never reconstruct, so the new content must land in one atomic step.
pub fn write_log(path: &Path, records: &[StoreRecord]) -> Result<(), String> {
    mkdirs(path)?;
    let tmp = format!("{}.{}.tmp", path.display(), std::process::id());
    fs::write(&tmp, encode(records)).map_err(|e| io_err("write", Path::new(&tmp), &e))?;
    fs::rename(&tmp, path).map_err(|e| io_err("rename", path, &e))
}

fn mkdirs(path: &Path) -> Result<(), String> {
    match path.parent() {
        Some(dir) if !dir.as_os_str().is_empty() => {
            fs::create_dir_all(dir).map_err(|e| io_err("mkdir", dir, &e))
        }
        _ => Ok(()),
    }
}
