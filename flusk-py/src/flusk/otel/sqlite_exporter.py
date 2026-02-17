# --- BEGIN GENERATED ---
"""SQLite span exporter — writes OTel spans to local database."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Sequence

from opentelemetry.sdk.trace import ReadableSpan
from opentelemetry.sdk.trace.export import SpanExporter, SpanExportResult

DB_PATH = Path.home() / ".flusk" / "data.db"
SENSITIVE_ATTRS = {"http.request.header.authorization", "http.request.header.x-api-key"}


class SqliteSpanExporter(SpanExporter):
    """Export OTel spans to a local SQLite database."""

    def __init__(self, *, session_id: str, redact: bool = True) -> None:
        self._session_id = session_id
        self._redact = redact
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(DB_PATH))
        self._ensure_tables()

    def _ensure_tables(self) -> None:
        self._conn.executescript(_SCHEMA_SQL)

    def export(self, spans: Sequence[ReadableSpan]) -> SpanExportResult:
        try:
            for span in spans:
                self._write_span(span)
                if self._is_llm_span(span):
                    self._write_llm_call(span)
            self._conn.commit()
            return SpanExportResult.SUCCESS
        except Exception:
            return SpanExportResult.FAILURE

    def shutdown(self) -> None:
        self._conn.close()

    def _write_span(self, span: ReadableSpan) -> None:
        attrs = dict(span.attributes or {})
        if self._redact:
            for k in SENSITIVE_ATTRS:
                attrs.pop(k, None)
        tid = format(span.context.trace_id, "032x")
        sid = format(span.context.span_id, "016x")
        kind = span.kind.name if span.kind else "INTERNAL"
        self._conn.execute(
            "INSERT OR IGNORE INTO spans (trace_id,span_id,name,kind,"
            "start_time,end_time,attributes,session_id) VALUES(?,?,?,?,?,?,?,?)",
            (tid, sid, span.name, kind, span.start_time, span.end_time,
             json.dumps(attrs), self._session_id),
        )

    def _is_llm_span(self, span: ReadableSpan) -> bool:
        return "gen_ai.system" in (span.attributes or {})

    def _write_llm_call(self, span: ReadableSpan) -> None:
        a = dict(span.attributes or {})
        sid = format(span.context.span_id, "016x")
        dur = (span.end_time - span.start_time) // 1_000_000 if span.end_time else 0
        self._conn.execute(
            "INSERT OR IGNORE INTO llm_calls (span_id,session_id,provider,"
            "model,input_tokens,output_tokens,duration_ms,cost) VALUES(?,?,?,?,?,?,?,?)",
            (sid, self._session_id, a.get("gen_ai.system", "unknown"),
             a.get("gen_ai.request.model", "unknown"),
             int(a.get("gen_ai.usage.input_tokens", 0)),
             int(a.get("gen_ai.usage.output_tokens", 0)), dur, 0.0),
        )


_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS spans (
    trace_id TEXT NOT NULL, span_id TEXT PRIMARY KEY, name TEXT NOT NULL,
    kind TEXT NOT NULL, start_time INTEGER, end_time INTEGER,
    attributes TEXT, session_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS llm_calls (
    span_id TEXT PRIMARY KEY, session_id TEXT NOT NULL, provider TEXT NOT NULL,
    model TEXT NOT NULL, input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
    cost REAL DEFAULT 0.0);
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, created_at TEXT DEFAULT (datetime('now')),
    span_count INTEGER DEFAULT 0);
"""
# --- END GENERATED ---
