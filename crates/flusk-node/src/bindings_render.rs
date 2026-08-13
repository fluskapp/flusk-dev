//! N-API surface for the render stage: markdown → HTML and highlighting.
//!
//! Strings in, strings out — no JSON here, the values already ARE strings.
//! The sync forms serve the common small input (a card, a snippet); the
//! async forms run as AsyncTask so a 600KB paste renders off the main
//! thread. The seam (src/platform/native/render.ts) routes inputs past 64KB
//! through the async form.

use flusk_core::render::{highlight_code, render_markdown};
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi]
pub fn render_markdown_html(text: String) -> String {
    render_markdown(&text)
}

#[napi]
pub fn highlight_html(code: String, lang: String) -> String {
    highlight_code(&code, &lang)
}

pub struct MarkdownTask {
    text: String,
}

#[napi]
impl Task for MarkdownTask {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> Result<String> {
        Ok(render_markdown(&self.text))
    }

    fn resolve(&mut self, _env: Env, output: String) -> Result<String> {
        Ok(output)
    }
}

/// Render off the main thread; resolves to the same HTML the sync form emits.
#[napi]
pub fn render_markdown_html_async(text: String) -> AsyncTask<MarkdownTask> {
    AsyncTask::new(MarkdownTask { text })
}

pub struct HighlightTask {
    code: String,
    lang: String,
}

#[napi]
impl Task for HighlightTask {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> Result<String> {
        Ok(highlight_code(&self.code, &self.lang))
    }

    fn resolve(&mut self, _env: Env, output: String) -> Result<String> {
        Ok(output)
    }
}

/// Highlight off the main thread — the 600KB-paste path.
#[napi]
pub fn highlight_html_async(code: String, lang: String) -> AsyncTask<HighlightTask> {
    AsyncTask::new(HighlightTask { code, lang })
}
