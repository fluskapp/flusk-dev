/**
 * Auto-detection of @platformatic/flame availability
 * Dynamically imports flame; gracefully returns false if not installed
 */

let cached: boolean | null = null;

export async function isFlameAvailable(): Promise<boolean> {
  if (cached !== null) return cached;

  try {
    await import('@platformatic/flame');
    cached = true;
  } catch {
    cached = false;
  }

  return cached;
}

/** Reset cache — used in tests */
export function resetFlameDetectionCache(): void {
  cached = null;
}
