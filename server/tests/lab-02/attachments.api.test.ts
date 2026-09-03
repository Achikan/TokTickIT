import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import {
  seedRequesters,
  seedCategories,
  seedRelatedSystems,
} from "../../prisma/seed.js";

let ticketId: number;
let aliceId: number;
let bobId: number;
let attachmentId: number;

beforeAll(async () => {
  const prisma = getPrisma();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  await seedCategories(prisma);
  await seedRelatedSystems(prisma);
  await seedRequesters(prisma);

  const alice = await prisma.developmentRequester.findFirst({
    where: { email: "alice.anderson@example.com" },
  });
  const bob = await prisma.developmentRequester.findFirst({
    where: { email: "bob.brown@example.com" },
  });
  aliceId = alice!.id;
  bobId = bob!.id;

  const category = await prisma.category.findFirst({ where: { name: "Hardware" } });
  const system = await prisma.relatedSystem.findFirst({ where: { name: "ERP System" } });

  const res = await request(app)
    .post("/api/tickets")
    .set("X-Requester-Id", String(aliceId))
    .send({
      requesterId: aliceId,
      summary: "Test ticket for attachments",
      description: "Description for attachment testing.",
      categoryId: category!.id,
      relatedSystemId: system!.id,
      requestedPriority: "MEDIUM",
    });
  ticketId = res.body.ticket.id;
});

afterAll(async () => {
  const prisma = getPrisma();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  await seedCategories(prisma);
  await seedRelatedSystems(prisma);
  await seedRequesters(prisma);
});

describe("Attachment lifecycle (API-11..14)", () => {
  // --- API-11: Upload valid and invalid attachments ---

  it("API-11: uploads a valid PNG attachment and returns 201", async () => {
    const fakePng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(aliceId))
      .attach("file", fakePng, { filename: "pixel.png", contentType: "image/png" });

    expect(res.status).toBe(201);
    expect(res.body.attachment).toBeDefined();
    expect(res.body.attachment.originalName).toBe("pixel.png");
    expect(res.body.attachment.mimeType).toBe("image/png");
    expect(res.body.attachment.ticketId).toBe(ticketId);
    expect(res.body.attachment.removedAt).toBeNull();
    expect(res.body.attachment.removedReason).toBeNull();
    attachmentId = res.body.attachment.id;
  });

  it("API-11: rejects an unsupported file type with 400 and no row created", async () => {
    const exeBuffer = Buffer.from("MZ\u0000\u0000");

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(aliceId))
      .attach("file", exeBuffer, { filename: "malware.exe", contentType: "application/x-msdownload" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("INVALID_FILE");

    const count = await getPrisma().attachment.count({
      where: { ticketId, originalName: "malware.exe" },
    });
    expect(count).toBe(0);
  });

  it("API-11: rejects an oversized file with 400 and no row created", async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 0x41);

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(aliceId))
      .attach("file", bigBuffer, { filename: "huge.txt", contentType: "text/plain" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_FILE");

    const count = await getPrisma().attachment.count({
      where: { ticketId, originalName: "huge.txt" },
    });
    expect(count).toBe(0);
  });

  // --- API-12: Download an active attachment ---

  it("API-12: downloads an active attachment with 200 and file content", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(aliceId));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\/png/);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // --- API-13: Soft-remove with reason ---

  it("API-13: soft-removes an attachment with a reason and returns 200", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("X-Requester-Id", String(aliceId))
      .send({ removedReason: "Uploaded the wrong file" });

    expect(res.status).toBe(200);
    expect(res.body.attachment.removedAt).toBeTruthy();
    expect(res.body.attachment.removedReason).toBe("Uploaded the wrong file");

    const row = await getPrisma().attachment.findUnique({ where: { id: attachmentId } });
    expect(row!.removedAt).toBeTruthy();
    expect(row!.removedReason).toBe("Uploaded the wrong file");
  });

  it("API-13: blocks download of a removed attachment with 410 Gone", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(aliceId));

    expect(res.status).toBe(410);
  });

  it("API-13: returns 400 when soft-remove has no reason", async () => {
    const fakePng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const upRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(aliceId))
      .attach("file", fakePng, { filename: "temp.png", contentType: "image/png" });
    const newId = upRes.body.attachment.id;

    const res = await request(app)
      .delete(`/api/attachments/${newId}`)
      .set("X-Requester-Id", String(aliceId))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  // --- API-14: Ownership enforcement ---

  it("API-14: rejects upload to a non-owned ticket with 404", async () => {
    const fakePng = Buffer.from("fake", "utf-8");

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(bobId))
      .attach("file", fakePng, { filename: "hack.png", contentType: "image/png" });

    expect(res.status).toBe(404);
  });

  it("API-14: rejects download of another requester's attachment with 404", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(bobId));

    expect(res.status).toBe(404);
  });

  it("API-14: rejects soft-remove of another requester's attachment with 404", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("X-Requester-Id", String(bobId))
      .send({ removedReason: "Trying to delete someone else's file" });

    expect(res.status).toBe(404);
  });

  // --- List metadata (§8) ---

  it("lists all attachments for an owned ticket including removed ones (BR-09)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(aliceId));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    const removed = res.body.items.find((a: { id: number }) => a.id === attachmentId);
    expect(removed).toBeTruthy();
    expect(removed.removedAt).toBeTruthy();
  });

  it("rejects listing attachments of a non-owned ticket with 404", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(bobId));

    expect(res.status).toBe(404);
  });

  // --- Allowed types (§4.5: JPG/JPEG, PNG, WEBP, PDF) ---

  it("accepts a PDF upload (allowed type)", async () => {
    const pdfBuffer = Buffer.from("%PDF-1.4 fake pdf", "utf-8");

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(aliceId))
      .attach("file", pdfBuffer, { filename: "doc.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(201);
    expect(res.body.attachment.mimeType).toBe("application/pdf");
  });

  it("accepts a WEBP upload (allowed type)", async () => {
    const webpBuffer = Buffer.from("RIFF....WEBPVP8 ", "utf-8");

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(aliceId))
      .attach("file", webpBuffer, { filename: "pic.webp", contentType: "image/webp" });

    expect(res.status).toBe(201);
    expect(res.body.attachment.mimeType).toBe("image/webp");
  });

  // --- Max active attachments (§4.5: five per Ticket) ---

  it("rejects an upload when the ticket already has five active attachments (BR-07)", async () => {
    // This ticket already has: pixel.png (removed later), doc.pdf, pic.webp and
    // one active temp.png from an earlier soft-remove test. Ensure we have 5 active.
    const prisma = getPrisma();
    const existing = await prisma.attachment.findMany({
      where: { ticketId, removedAt: null },
    });
    // Add attachments until we reach the 5-active limit.
    while (existing.length < 5) {
      const upd = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("X-Requester-Id", String(aliceId))
        .attach("file", Buffer.from("x", "utf-8"), { filename: "fill.png", contentType: "image/png" });
      expect(upd.status).toBe(201);
      existing.push(upd.body.attachment);
    }

    // Now the 6th active upload should be rejected.
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(aliceId))
      .attach("file", Buffer.from("y", "utf-8"), { filename: "overflow.png", contentType: "image/png" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TOO_MANY_ATTACHMENTS");

    const overflowCount = await prisma.attachment.count({
      where: { ticketId, originalName: "overflow.png" },
    });
    expect(overflowCount).toBe(0);
  });
});
