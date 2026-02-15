/**
 * Default configuration values
 */
import type { FluskConfig } from './config.types.js';

export const DEFAULT_CONFIG: FluskConfig = {
  budget: {
    daily: undefined,
    monthly: undefined,
    perCall: undefined,
    duplicateRatio: undefined,
  },
  alerts: {
    webhook: undefined,
    onBudgetExceeded: 'warn',
  },
  agent: undefined,
  storage: {
    path: undefined,
    mode: 'sqlite',
  },
  profiling: {
    enabled: false,
    duration: 60,
  },
};
