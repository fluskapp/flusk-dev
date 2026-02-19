/**
 * E2E Anthropic demo with Grafana Cloud export
 * Run: npx tsx examples/e2e-anthropic.ts
 */
import '../packages/otel/src/register.js';
await new Promise(r => setTimeout(r, 500));
await import('./demo-anthropic.js');
// Give exporters time to flush
await new Promise(r => setTimeout(r, 3000));
console.log('\n✅ Traces flushed. Check Grafana Cloud.');
process.exit(0);
