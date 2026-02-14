/** @generated —
 * Flusk configuration schema
 */

export interface FluskBudgetConfig {
  daily?: number;
  monthly?: number;
  perCall?: number;
  duplicateRatio?: number;
}

export interface FluskAlertsConfig {
  webhook?: string;
  onBudgetExceeded?: 'warn' | 'block';
}

export interface FluskStorageConfig {
  path?: string;
  mode?: 'sqlite' | 'postgres';
}

export interface FluskProfilingConfig {
  enabled?: boolean;
  duration?: number;
}

export interface FluskConfig {
  budget?: FluskBudgetConfig;
  alerts?: FluskAlertsConfig;
  agent?: string;
  storage?: FluskStorageConfig;
  profiling?: FluskProfilingConfig;
}
