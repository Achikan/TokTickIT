import { describe, it, expect } from "vitest";
import { formatTicketNumber } from "../../src/ticketNumber.js";

describe("Ticket Number generator (UNIT-01)", () => {
  it("formats a number as TK- followed by six padded digits", () => {
    expect(formatTicketNumber(42)).toBe("TK-000042");
  });

  it("supports numbers beyond six digits", () => {
    expect(formatTicketNumber(1234567)).toBe("TK-1234567");
  });

  it("starts at TK-000001", () => {
    expect(formatTicketNumber(1)).toBe("TK-000001");
  });
});