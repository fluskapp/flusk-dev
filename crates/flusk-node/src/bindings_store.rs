//! N-API surface for the store stage: the fact store's three verbs and the
//! session file. JSON in, JSON out, like every stage — but here the strings
//! are also the durability format, so the core is what guarantees the bytes.
//!
//! The clock and the namespace→path convention stay in TypeScript: every call
//! takes the resolved log path and an explicit `nowMs`, so one seam owns
//! naming and one transact stamps every timestamp from a single reading.
//! Store verbs run as AsyncTasks — a transact can sit on the lock file for
//! seconds, and the Electron main process must never wait with it. Session
//! appends stay sync: the reference is fsyncSync, and callers rely on the
//! entry being durable when the call returns.
//!
//! (dead_code: these are reached from JS via napi's cdylib registration; the
//! rust test target cannot see that and would flag every entry point.)
#![allow(dead_code)]

use flusk_core::store::{self, SessionFile, TransactError};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::path::Path;
use std::sync::{Arc, Mutex};

type Job = Box<dyn FnOnce() -> Result<String> + Send>;

pub struct StoreTask {
    job: Option<Job>,
}

#[napi]
impl Task for StoreTask {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> Result<Self::Output> {
        (self.job.take().expect("a task computes once"))()
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

fn task(job: impl FnOnce() -> Result<String> + Send + 'static) -> AsyncTask<StoreTask> {
    AsyncTask::new(StoreTask { job: Some(Box::new(job)) })
}

/// One store instance = one monotonic `nextTx` floor shared across
/// namespaces, exactly the reference's closed-over counter.
#[napi(js_name = "FactStore")]
pub struct JsFactStore {
    next_tx: Arc<Mutex<f64>>,
}

#[napi]
pub fn create_fact_store() -> JsFactStore {
    JsFactStore { next_tx: Arc::new(Mutex::new(0.0)) }
}

#[napi]
impl JsFactStore {
    /// Facts visible at `asOf` (default `nowMs`) as a JSON array. Lock-free,
    /// like the reference's reads.
    #[napi]
    pub fn query(&self, path: String, params_json: String, now_ms: f64) -> AsyncTask<StoreTask> {
        task(move || {
            store::query_json(Path::new(&path), &params_json, now_ms).map_err(Error::from_reason)
        })
    }

    /// `{"tx":n,"ids":[…]}`, or `{"compareFailed":[…]}` for a lost race — a
    /// data result, not a rejection, so the seam can rebuild the reference's
    /// typed CompareFailedError. Anything else rejects with the reference's
    /// message.
    #[napi]
    pub fn transact(
        &self,
        path: String,
        asserts_json: String,
        compares_json: String,
        now_ms: f64,
    ) -> AsyncTask<StoreTask> {
        let next_tx = self.next_tx.clone();
        task(move || {
            let mut tx = next_tx.lock().expect("tx counter lock is never poisoned");
            match store::transact_json(Path::new(&path), &asserts_json, &compares_json, now_ms, &mut tx)
            {
                Ok(result) => Ok(result),
                Err(TransactError::CompareFailed(failures)) => {
                    let parts: Vec<String> = failures.iter().map(|f| f.to_json()).collect();
                    Ok(format!("{{\"compareFailed\":[{}]}}", parts.join(",")))
                }
                Err(TransactError::Other(msg)) => Err(Error::from_reason(msg)),
            }
        })
    }

    /// Hard-deletes expired transient rows; resolves to how many went.
    #[napi]
    pub fn sweep(&self, path: String, at_ms: f64) -> AsyncTask<StoreTask> {
        task(move || {
            store::sweep_transient(Path::new(&path), at_ms)
                .map(|n| n.to_string())
                .map_err(Error::from_reason)
        })
    }
}

/// The session file: append + fsync, and nothing else — serialization stays
/// on the JS side so the bytes are the reference's by construction.
#[napi(js_name = "SessionFile")]
pub struct JsSessionFile {
    inner: Option<SessionFile>,
}

#[napi]
pub fn open_session_file(path: String) -> Result<JsSessionFile> {
    let inner = SessionFile::open(Path::new(&path)).map_err(Error::from_reason)?;
    Ok(JsSessionFile { inner: Some(inner) })
}

#[napi]
impl JsSessionFile {
    #[napi]
    pub fn append_line(&mut self, json_line: String) -> Result<()> {
        match self.inner.as_mut() {
            Some(file) => file.append_line(&json_line).map_err(Error::from_reason),
            None => Err(Error::from_reason("session: file is closed".to_string())),
        }
    }

    #[napi]
    pub fn close(&mut self) {
        self.inner = None; // drop closes the descriptor
    }
}

/// The surviving raw lines of a session file: torn tail dropped, interior
/// damage rejected with the reference's exact message.
#[napi]
pub fn read_session_lines(path: String) -> Result<Vec<String>> {
    store::read_session_lines(Path::new(&path)).map_err(Error::from_reason)
}
