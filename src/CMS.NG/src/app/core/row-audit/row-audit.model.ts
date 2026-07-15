// One record's audit-trail entry as returned by GET /api/rowaudit. dateTime is the raw
// server timestamp string; format it for display with the DatePipe.
export interface RowAuditEntry {
  dateTime: string;
  userName: string;
  actionType: string;
  actionDesc: string | null;
}
