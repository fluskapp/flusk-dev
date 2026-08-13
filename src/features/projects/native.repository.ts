/**
 * This feature's door to platform/native — a repository by rule: loading a
 * native binary is machine-facing access, and fronting it here keeps the
 * feature's functions out of the platform layer's namespace.
 */
export { createRenderer } from "../../platform/native/render.js";
export { createSessionScanner } from "../../platform/native/session-scan.js";
