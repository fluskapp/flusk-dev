/**
 * Track provider health with sliding window metrics.
 */

interface HealthEntry {
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
  requestCount: number;
  rateLimitedUntil: number;
  disabledUntil: number;
}

const WINDOW_SIZE = 100;
const FAILURE_THRESHOLD = 0.5;
const DISABLE_DURATION_MS = 60_000;

export class HealthTracker {
  private entries = new Map<string, HealthEntry>();
  private cooldownMs: number;

  constructor(cooldownMs = 30_000) {
    this.cooldownMs = cooldownMs;
  }

  private key(provider: string, model: string): string {
    return `${provider}:${model}`;
  }

  private getOrCreate(k: string): HealthEntry {
    if (!this.entries.has(k)) {
      this.entries.set(k, {
        successCount: 0, failureCount: 0,
        totalLatencyMs: 0, requestCount: 0,
        rateLimitedUntil: 0, disabledUntil: 0,
      });
    }
    return this.entries.get(k)!;
  }

  report(
    provider: string, model: string,
    latencyMs: number, success: boolean, statusCode: number,
  ): void {
    const entry = this.getOrCreate(this.key(provider, model));
    if (success) { entry.successCount++; }
    else { entry.failureCount++; }
    entry.totalLatencyMs += latencyMs;
    entry.requestCount++;
    if (statusCode === 429) {
      entry.rateLimitedUntil = Date.now() + this.cooldownMs;
    }
    const total = entry.successCount + entry.failureCount;
    if (total >= WINDOW_SIZE) { this.resetWindow(entry); }
    if (total > 5 && entry.failureCount / total > FAILURE_THRESHOLD) {
      entry.disabledUntil = Date.now() + DISABLE_DURATION_MS;
    }
  }

  isHealthy(provider: string, model: string): boolean {
    const entry = this.entries.get(this.key(provider, model));
    if (!entry) return true;
    const now = Date.now();
    if (entry.rateLimitedUntil > now) return false;
    if (entry.disabledUntil > now) return false;
    return true;
  }

  avgLatency(provider: string, model: string): number {
    const entry = this.entries.get(this.key(provider, model));
    if (!entry || entry.requestCount === 0) return 0;
    return entry.totalLatencyMs / entry.requestCount;
  }

  successRate(provider: string, model: string): number {
    const entry = this.entries.get(this.key(provider, model));
    if (!entry) return 1;
    const total = entry.successCount + entry.failureCount;
    return total === 0 ? 1 : entry.successCount / total;
  }

  private resetWindow(entry: HealthEntry): void {
    entry.successCount = 0;
    entry.failureCount = 0;
    entry.totalLatencyMs = 0;
    entry.requestCount = 0;
  }
}
