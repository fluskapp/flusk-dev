/**
 * Decide whether this call should be A/B tested
 * Pure function — no I/O
 */

export interface ShouldABTestInput {
  /** Running count of calls for this rule */
  callCount: number;
  /** A/B test every N calls (default: 20) */
  testFrequency?: number;
  /** Minimum samples before A/B testing stops for a model+category */
  sampleCount: number;
  /** Stop A/B testing once we have enough samples */
  maxSamples?: number;
}

export interface ShouldABTestOutput {
  shouldTest: boolean;
  reason: string;
}

/**
 * Determine if this call should be A/B tested
 * Tests every Nth call until we have enough samples
 */
export function shouldABTest(input: ShouldABTestInput): ShouldABTestOutput {
  const frequency = input.testFrequency ?? 20;
  const maxSamples = input.maxSamples ?? 100;

  if (input.sampleCount >= maxSamples) {
    return { shouldTest: false, reason: 'sufficient-samples' };
  }

  if (input.callCount % frequency === 0 && input.callCount > 0) {
    return { shouldTest: true, reason: 'periodic-test' };
  }

  if (input.sampleCount < 5) {
    return { shouldTest: true, reason: 'insufficient-data' };
  }

  return { shouldTest: false, reason: 'not-scheduled' };
}
