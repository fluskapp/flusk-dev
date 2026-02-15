/**
 * E2E test: imports OTel register, then runs demo app.
 * Run from packages/otel context for dep resolution.
 */
import '../../packages/otel/src/register.ts';

// Wait for OTel to initialize
await new Promise(r => setTimeout(r, 500));

// Now run the demo
await import('./demo-app.js');
