/**
 * The history feature's door to platform/native: a repository by rule —
 * loading a native binary is exactly the kind of machine-facing access the
 * boundary exists to corral — and one line of substance, so the feature's
 * callers never name the platform layer themselves.
 */
export { createHistorySearcher, type HistorySearcher } from "../../platform/native/history-search.js";
