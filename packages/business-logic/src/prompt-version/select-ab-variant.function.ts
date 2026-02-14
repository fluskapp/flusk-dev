/**
 * Select which prompt version to serve in an A/B test
 * Based on traffic split percentage for the candidate version
 */

export interface ABVariantResult {
  selectedVersionId: string;
  isCandidate: boolean;
}

/**
 * Randomly select active or candidate version based on traffic split
 * @param activeVersionId - Current active version ID
 * @param candidateVersionId - Candidate version being tested
 * @param candidateTrafficPercent - 0-100, percentage of traffic for candidate
 * @param random - Random value 0-1 (injectable for testing)
 */
export function selectABVariant(
  activeVersionId: string,
  candidateVersionId: string,
  candidateTrafficPercent: number,
  random: number = Math.random()
): ABVariantResult {
  const clampedPercent = Math.max(0, Math.min(100, candidateTrafficPercent));
  const isCandidate = random * 100 < clampedPercent;

  return {
    selectedVersionId: isCandidate ? candidateVersionId : activeVersionId,
    isCandidate,
  };
}
