/**
 * E2E Anthropic demo with Grafana Cloud export
 * Run: npx tsx examples/e2e-anthropic.ts
 */
import '../packages/otel/src/register.js';
await new Promise(r => setTimeout(r, 500));
await import('./demo-anthropic.js');
// Wait for BatchSpanProcessor to flush (default scheduledDelayMillis = 5000)
console.log('\nWaiting for span export...');
await new Promise(r => setTimeout(r, 7000));
console.log('✅ Traces flushed. Check Grafana Cloud.');
process.exit(0);
