/**
 * Audit log entry for SOC2 compliance
 * Tracks all data access and modifications
 */
export interface AuditLogEntry {
    id: string;
    createdAt: string;
    action: string;
    resource: string;
    resourceId: string | null;
    organizationId: string;
    userId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    success: boolean;
    errorMessage: string | null;
    metadata: Record<string, any> | null;
}
/**
 * Log an audit event for SOC2 compliance
 * @param entry - Audit log entry (id and createdAt auto-generated)
 * @returns Created audit log entry
 */
export declare function logAudit(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry>;
//# sourceMappingURL=audit-log.repository.d.ts.map