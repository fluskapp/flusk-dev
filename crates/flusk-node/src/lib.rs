//! N-API bindings for flusk-core, loaded by src/platform/native/.
//!
//! JSON in, JSON out: the value boundary is small enough (a few MB of cards
//! once per corpus stamp, a few KB per search) that string marshalling is
//! cheaper than maintaining a field-by-field binding that could drift from
//! the TS types. Building the index can exceed 1ms, so it runs as an
//! AsyncTask — the Electron main process must never block on it.

use flusk_core::index::HistoryEngine;
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(js_name = "HistoryEngine")]
pub struct JsHistoryEngine {
    inner: HistoryEngine,
}

pub struct BuildTask {
    cards_json: String,
}

#[napi]
impl Task for BuildTask {
    type Output = HistoryEngine;
    type JsValue = JsHistoryEngine;

    fn compute(&mut self) -> Result<Self::Output> {
        HistoryEngine::from_json(&self.cards_json)
            .map_err(|e| Error::from_reason(format!("bad cards JSON: {e}")))
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(JsHistoryEngine { inner: output })
    }
}

/// Build an engine off the main thread; resolves to a handle searches reuse.
#[napi]
pub fn build_history_engine(cards_json: String) -> AsyncTask<BuildTask> {
    AsyncTask::new(BuildTask { cards_json })
}

/// Synchronous build for callers already off the hot path (CLI, tests).
#[napi]
pub fn build_history_engine_sync(cards_json: String) -> Result<JsHistoryEngine> {
    Ok(JsHistoryEngine {
        inner: HistoryEngine::from_json(&cards_json)
            .map_err(|e| Error::from_reason(format!("bad cards JSON: {e}")))?,
    })
}

#[napi]
impl JsHistoryEngine {
    /// Search stays sync: p95 must be under 10ms, well below the 1ms rule's
    /// concern once the index exists — and measured, it is microseconds.
    #[napi]
    pub fn search_json(&self, query_json: String, opts_json: Option<String>) -> Result<String> {
        self.inner
            .search_json(&query_json, opts_json.as_deref().unwrap_or(""))
            .map_err(|e| Error::from_reason(format!("bad query JSON: {e}")))
    }

    #[napi(getter)]
    pub fn cards(&self) -> u32 {
        self.inner.len() as u32
    }
}
