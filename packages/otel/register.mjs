// Bootstrap: load OTel register via dynamic import
// Requires: node --import tsx/esm --import ./packages/otel/register.mjs
const registerPath = new URL('./src/register.ts', import.meta.url);
await import(registerPath.href);
