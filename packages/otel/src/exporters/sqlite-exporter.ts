/**
 * Custom OTel SpanExporter that writes GenAI spans directly to SQLite.
 * Eliminates HTTP overhead for local mode.
 */
import type { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ExportResultCode, type ExportResult } from '@opentelemetry/core';
import { createSqliteStorage, closeDb, type StorageAdapter } from '@flusk/resources';
import { createLogger } from '@flusk/logger';
import { parseReadableSpan } from './parse-readable-span.js';

const log = createLogger('sqlite-exporter');

export class SqliteSpanExporter implements SpanExporter {
  private storage: StorageAdapter;

  constructor(dbPath?: string) {
    this.storage = createSqliteStorage(dbPath);
    log.info('SQLite span exporter initialized');
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    try {
      let count = 0;
      for (const span of spans) {
        const parsed = parseReadableSpan(span);
        if (!parsed) continue;
        this.storage.llmCalls.create(parsed);
        count++;
      }
      if (count > 0) log.debug(`Exported ${count} GenAI spans to SQLite`);
      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (err) {
      log.error('Failed to export spans', { error: err });
      resultCallback({ code: ExportResultCode.FAILED });
    }
  }

  async shutdown(): Promise<void> {
    closeDb();
    log.info('SQLite exporter shut down');
  }

  async forceFlush(): Promise<void> {
    /* SQLite writes are synchronous — nothing to flush */
  }

  getStorage(): StorageAdapter {
    return this.storage;
  }
}
