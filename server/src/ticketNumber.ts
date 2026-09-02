// Official Ticket Number format (api-spec.md §4): "TK-<six-digit sequential>".
export function formatTicketNumber(sequence: number): string {
  return `TK-${String(sequence).padStart(6, "0")}`;
}