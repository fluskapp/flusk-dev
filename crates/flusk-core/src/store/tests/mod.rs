//! In-crate tests for the store port. The differential harness against the
//! TypeScript reference lives in test/native-store-*.test.ts; what lives
//! here is what Rust can prove alone — exact bytes for known inputs, and
//! property tests over operation interleavings for the invariants the log
//! format exists to keep.

mod fixtures;
mod prop_invariants;
mod unit_bytes;
mod unit_durability;
