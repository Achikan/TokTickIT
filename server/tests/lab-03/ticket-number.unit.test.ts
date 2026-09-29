import { describe, it, expect } from "vitest";
import { formatTicketNumber } from "../../src/ticketNumber.js";

describe("UNIT-04: Ticket Number generator regression (BR-02, api-spec §4)", () => {
  it("formats small sequences with leading zeros", () => {
    expect(formatTicketNumber(1)).toBe("TK-000001");
    expect(formatTicketNumber(7)).toBe("TK-000007");
  });

  it("formats large sequences without overflow", () => {
    expect(formatTicketNumber(123456)).toBe("TK-123456");
    expect(formatTicketNumber(999999)).toBe("TK-999999");
  });

  it("keeps the Lab 2 prefix/length contract", () => {
    const out = formatTicketNumber(0);
    expect(out.startsWith("TK-")).toBe(true);
    expect(out).toMatch(/^TK-\d{6}$/);
  });
});