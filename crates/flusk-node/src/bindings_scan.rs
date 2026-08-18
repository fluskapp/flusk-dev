//! N-API surface for the scan stage: session summaries and git history
//! cards, JSON out. Both run as AsyncTasks — each is I/O (hundreds of JSONL
//! transcripts, one `git log` subprocess) that must never block the Electron
//! main thread.

use flusk_core::scan;
use napi::bindgen_prelude::*;
use napi_derive::napi;

pub struct ScanSessionsTask {
    root_dir: String,
}

#[napi]
impl Task for ScanSessionsTask {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> Result<Self::Output> {
        Ok(scan::scan_sessions_json(&self.root_dir))
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

/// SessionSummary[] JSON for every transcript under rootDir, newest first —
/// same field names, order and status derivation as the TS scanner.
#[napi]
pub fn scan_sessions_json(root_dir: String) -> AsyncTask<ScanSessionsTask> {
    AsyncTask::new(ScanSessionsTask { root_dir })
}

/// Scan-stage contract version. 2 = the D2 gate fold (a blocked gate decision
/// entry yields status "blocked"). A prebuilt lacking this export, or
/// answering lower, predates the fold and must not answer session scans.
#[napi]
pub fn scan_contract_version() -> u32 {
    2
}

pub struct GitLogTask {
    repo_root: String,
    opts_json: String,
}

#[napi]
impl Task for GitLogTask {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> Result<Self::Output> {
        Ok(scan::git_log_cards_json(&self.repo_root, &self.opts_json))
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

/// HistoryCard[] JSON for a repo's commits, newest first; "[]" outside a
/// repo. `opts_json` is a GitCardOpts object ({limit?, since?}) or empty.
#[napi]
pub fn git_log_cards(repo_root: String, opts_json: Option<String>) -> AsyncTask<GitLogTask> {
    AsyncTask::new(GitLogTask {
        repo_root,
        opts_json: opts_json.unwrap_or_default(),
    })
}
