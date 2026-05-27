// Helper: compute OVERDUE status on read (not stored)
export function computeDisplayStatus(invoice: { status: string; dueDate: Date }): string {
  if (invoice.status === 'SENT' && invoice.dueDate < new Date()) return 'OVERDUE';
  return invoice.status;
}
