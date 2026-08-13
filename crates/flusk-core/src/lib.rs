//! flusk-core: the CPU-bound floor of the flusk engine, in Rust.
//!
//! Every module here is a PORT of a TypeScript reference implementation that
//! stays in the tree (src/features/history/*, behind src/platform/native).
//! Differential tests run both over the same fixtures; behavior parity is the
//! contract, so a deviation here is a bug even when it is an improvement.

pub mod index;
