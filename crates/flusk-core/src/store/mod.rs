//! The fact store and the session file — the two places flusk must never
//! lose data. Every module here is a port of src/features/facts/* and
//! src/features/session/session.repository.ts, and the bar is stricter than
//! behavior parity: the JSONL these write must be BYTE-identical to what the
//! TypeScript reference writes (same key order, same number formatting, same
//! line framing), because a mixed fleet appends to the same files and the
//! differential durability harness compares logs byte for byte.
//!
//! Unlike the other stages, this port does NOT become the default when the
//! prebuilt exists: the seam (src/platform/native/fact-store.ts) ships with
//! the TypeScript path as default and this one behind FLUSK_NATIVE=1 until
//! the harness has proven equivalence in the field.

pub mod guards;
pub mod jval;
mod jval_de;
pub mod lock;
pub mod log;
pub mod materialize;
pub mod ops;
pub mod query;
pub mod record;
pub mod rng;
pub mod session;
pub mod sweep;
pub mod time;
pub mod transact;
pub mod visibility;

#[cfg(test)]
mod tests;

pub use ops::{query_json, transact_json, TransactError};
pub use session::{read_session_lines, SessionFile};
pub use sweep::sweep_transient;
