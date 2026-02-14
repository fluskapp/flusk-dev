/**
 * Multi-destination span exporter
 * Fans out spans to multiple exporters in parallel
 */
import type { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ExportResultCode, type ExportResult } from '@opentelemetry/core';
import { createLogger } from '@flusk/logger';

const log = createLogger('multi-exporter');

export class MultiSpanExporter implements SpanExporter {
  private exporters: SpanExporter[];

  constructor(exporters: SpanExporter[]) {
    this.exporters = exporters;
    log.info(`Multi-exporter initialized with ${exporters.length} targets`);
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const promises = this.exporters.map(
      (exp) =>
        new Promise<ExportResult>((resolve) => {
          exp.export(spans, (result) => resolve(result));
        }),
    );

    Promise.all(promises).then((results) => {
      const failed = results.some((r) => r.code === ExportResultCode.FAILED);
      resultCallback({ code: failed ? ExportResultCode.FAILED : ExportResultCode.SUCCESS });
    });
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.exporters.map((e) => e.shutdown()));
  }

  async forceFlush(): Promise<void> {
    await Promise.all(this.exporters.map((e) => e.forceFlush?.() || Promise.resolve()));
  }
}
