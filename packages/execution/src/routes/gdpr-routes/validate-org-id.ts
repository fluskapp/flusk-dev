/** @generated — Org ID must be alphanumeric with hyphens/underscores, 1-128 chars */
const ORG_ID_PATTERN = /^[\w-]{1,128}$/;

interface ValidationError {
  status: number;
  message: string;
}

/** Validate orgId format and ownership. Returns null if valid. */
export function validateOrgId(
  orgId: string,
  authenticatedOrgId: string | undefined,
): ValidationError | null {
  if (!ORG_ID_PATTERN.test(orgId)) {
    return { status: 400, message: 'Invalid orgId format' };
  }
  if (!authenticatedOrgId || authenticatedOrgId !== orgId) {
    return { status: 403, message: 'Forbidden: org mismatch' };
  }
  return null;
}
