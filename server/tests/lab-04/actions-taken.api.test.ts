import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { getPrisma } from "../../src/prisma.js";
import { app } from "../../src/app.js";
import { formatTicketNumber } from "../../src/ticketNumber.js";
import {
  resetDatabase,
  seedReferenceAndUsers,
  loginRequester,
  loginStaff,
  loginAdmin,
  CSRF_HEADER,
  REQUESTERS,
  STAFF,
  ADMIN,
  type ApiClient,
} from "../helpers.js";

// Lab 4 (Issue 30) — Actions Taken REST API + authorization
// (tests.md API-TA-01..API-TA-10, API-AUTH-01; specification.md FR-01..FR-08,
// BR-01..BR-07, BR-12, BR-13; api-spec.md §1).
//
// Every test goes through the HTTP surface so backend authorization is what is
// actually proven: a hidden UI control is never a security control (BR-04).

const DAY = 24 * 3_600_000;

let aliceId: number;
let bobId: number;
let danId: number;
let eileenId: number;
let henriId: number;
let categoryId: number;
let systemId: number;

let alice: ApiClient;
let bob: ApiClient;
let dan: ApiClient;
let eileen: ApiClient;
let admin: ApiClient;

let aliceTicket: { id: number };
let bobTicket: { id: number };

async function seedTicket(
  requesterId: number,
  sequence: number,
  overrides: { ownerId?: number; status?: "NEW" | "IN_PROGRESS"; createdAt?: Date } = {}
) {
  const prisma = getPrisma();
  const createdAt = overrides.createdAt ?? new Date(Date.now() - 10 * DAY);
  return prisma.ticket.create({
    data: {
      ticketNumber: formatTicketNumber(sequence),
      summary: "Actions Taken test ticket",
      description: "Used by the Actions Taken suite.",
      requesterId,
      ownerId: overrides.ownerId ?? null,
      categoryId,
      relatedSystemId: systemId,
      requestedPriority: "MEDIUM",
      currentStatus: overrides.status ?? "IN_PROGRESS",
      createdAt,
      updatedAt: createdAt,
    },
    select: { id: true },
  });
}

async function seedAction(
  ticketId: number,
  performedById: number,
  overrides: Partial<{
    actionDateTime: Date;
    actionDescription: string;
    result: string | null;
    followUpRequired: boolean;
    followUpNote: string | null;
    attachmentNotes: string | null;
    createdAt: Date;
  }> = {}
) {
  const prisma = getPrisma();
  return prisma.actionTaken.create({
    data: {
      ticketId,
      performedById,
      actionDateTime: overrides.actionDateTime ?? new Date(Date.now() - DAY),
      actionDescription: overrides.actionDescription ?? "Seeded action for the suite.",
      result: overrides.result ?? null,
      followUpRequired: overrides.followUpRequired ?? false,
      followUpNote: overrides.followUpNote ?? null,
      attachmentNotes: overrides.attachmentNotes ?? null,
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
    select: {
      id: true,
      updatedAt: true,
      actionDescription: true,
      result: true,
      followUpRequired: true,
      followUpNote: true,
    },
  });
}

const validCreate = (overrides: Record<string, unknown> = {}) => ({
  actionDescription: "Replaced the battery and ran diagnostics for 30 minutes.",
  result: "Battery health now 94%.",
  followUpRequired: false,
  attachmentNotes: "battery-report.png — final diagnostic tab",
  ...overrides,
});

beforeEach(async () => {
  const prisma = getPrisma();
  await resetDatabase();
  await seedReferenceAndUsers(prisma);

  const idOf = async (email: string, role?: "REQUESTER" | "IT_STAFF" | "ADMIN") =>
    (
      await prisma.user.findFirstOrThrow({
        where: { email, ...(role ? { role } : {}) },
        select: { id: true },
      })
    ).id;

  aliceId = await idOf(REQUESTERS.alice);
  bobId = await idOf(REQUESTERS.bob);
  danId = await idOf(STAFF.dan);
  eileenId = await idOf(STAFF.eileen);
  henriId = await idOf(ADMIN.henri);

  categoryId = (await prisma.category.findFirstOrThrow({ where: { name: "Hardware" } })).id;
  systemId = (await prisma.relatedSystem.findFirstOrThrow({ where: { name: "ERP System" } })).id;

  alice = await loginRequester(app, REQUESTERS.alice);
  bob = await loginRequester(app, REQUESTERS.bob);
  dan = await loginStaff(app, STAFF.dan);
  eileen = await loginStaff(app, STAFF.eileen);
  admin = await loginAdmin(app);

  aliceTicket = await seedTicket(aliceId, 1, { ownerId: danId, status: "NEW" });
  bobTicket = await seedTicket(bobId, 2, { ownerId: danId, status: "IN_PROGRESS" });
});

afterAll(async () => {
  await resetDatabase();
  await seedReferenceAndUsers();
});

// ---------------------------------------------------------------------------
describe("API-TA-01: create a valid Action as permitted IT Staff (AC-01, BR-01)", () => {
  it("saves under the correct Ticket with the session user as performer and the owner preserved", async () => {
    const before = await getPrisma().ticket.findUniqueOrThrow({ where: { id: aliceTicket.id } });

    const res = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate());

    expect(res.status).toBe(201);
    expect(res.body.action).toMatchObject({
      ticketId: aliceTicket.id,
      actionDescription: "Replaced the battery and ran diagnostics for 30 minutes.",
      result: "Battery health now 94%.",
      followUpRequired: false,
      attachmentNotes: "battery-report.png — final diagnostic tab",
      performedBy: { id: danId, name: "Dan Das", role: "IT_STAFF" },
    });
    expect(res.body.action.createdAt).toBeTruthy();
    expect(res.body.ticket).toMatchObject({
      id: aliceTicket.id,
      currentStatus: "NEW",
      actionsCount: 1,
    });
    expect(new Date(res.body.ticket.updatedAt).getTime()).toBeGreaterThanOrEqual(
      before.updatedAt.getTime()
    );

    // The Ticket Owner is untouched (BR-02 / D-13.1): creating an Action is work
    // logging, not coordination.
    const detail = await dan.get(`/api/staff/tickets/${aliceTicket.id}`);
    expect(detail.body.ticket.owner).toMatchObject({ id: danId });
  });

  it("trims text, defaults the action date to now, and stores null for omitted optional fields", async () => {
    const res = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send({ actionDescription: "   Ran a full disk check.   " });

    expect(res.status).toBe(201);
    expect(res.body.action.actionDescription).toBe("Ran a full disk check.");
    expect(res.body.action.result).toBeNull();
    expect(res.body.action.followUpNote).toBeNull();
    expect(res.body.action.attachmentNotes).toBeNull();
    expect(Math.abs(new Date(res.body.action.actionDateTime).getTime() - Date.now())).toBeLessThan(
      10_000
    );
  });

  it("stores a Follow-up Note and the date when Follow-Up Required is Yes", async () => {
    const actionDateTime = new Date(Date.now() + 2 * 3_600_000);
    const res = await dan.post(`/api/staff/tickets/${aliceTicket.id}/actions`).send(
      validCreate({
        followUpRequired: true,
        followUpNote: "Check with the requester in 3 days.",
        actionDateTime: actionDateTime.toISOString(),
      })
    );

    expect(res.status).toBe(201);
    expect(res.body.action.followUpRequired).toBe(true);
    expect(res.body.action.followUpNote).toBe("Check with the requester in 3 days.");
    expect(new Date(res.body.action.actionDateTime).getTime()).toBe(actionDateTime.getTime());
  });
});

// ---------------------------------------------------------------------------
describe("API-TA-02: client-supplied performer is ignored (AC-03, BR-03)", () => {
  it("records the session user even when the body supplies another performer", async () => {
    const res = await dan.post(`/api/staff/tickets/${aliceTicket.id}/actions`).send(
      validCreate({
        performedById: henriId,
        performedBy: { id: henriId, name: "Henri Ito", role: "ADMIN" },
        performerId: eileenId,
      })
    );

    expect(res.status).toBe(201);
    expect(res.body.action.performedBy.id).toBe(danId);
    expect(res.body.action.performedById).toBeUndefined();

    const row = await getPrisma().actionTaken.findFirstOrThrow({
      where: { ticketId: aliceTicket.id },
      select: { performedById: true },
    });
    expect(row.performedById).toBe(danId);
  });
});

// ---------------------------------------------------------------------------
describe("API-TA-03: follow-up gate and field validation (AC-04, BR-05, BR-06)", () => {
  it("rejects Follow-Up Required with a missing or blank note and saves nothing", async () => {
    for (const followUpNote of [undefined, "", "   "]) {
      const res = await dan
        .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
        .send(validCreate({ followUpRequired: true, followUpNote }));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields).toHaveProperty("followUpNote");
    }
    expect(await getPrisma().actionTaken.count()).toBe(0);
  });

  it("rejects a blank or over-length Action Description", async () => {
    for (const actionDescription of ["", "   "]) {
      const res = await dan
        .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
        .send(validCreate({ actionDescription }));
      expect(res.status).toBe(400);
      expect(res.body.error.fields).toHaveProperty("actionDescription");
    }

    const tooLong = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ actionDescription: "x".repeat(2001) }));
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.fields).toHaveProperty("actionDescription");

    expect(await getPrisma().actionTaken.count()).toBe(0);
  });

  it("rejects over-length result, follow-up note and attachment notes", async () => {
    const long = "y".repeat(2001);
    const badResult = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ result: long }));
    expect(badResult.status).toBe(400);
    expect(badResult.body.error.fields).toHaveProperty("result");

    const badNote = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ followUpRequired: true, followUpNote: long }));
    expect(badNote.status).toBe(400);
    expect(badNote.body.error.fields).toHaveProperty("followUpNote");

    const badAttachment = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ attachmentNotes: long }));
    expect(badAttachment.status).toBe(400);
    expect(badAttachment.body.error.fields).toHaveProperty("attachmentNotes");
  });

  it("enforces the Action Date/Time bounds (D-6)", async () => {
    const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: aliceTicket.id } });

    const tooOld = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ actionDateTime: new Date(ticket.createdAt.getTime() - 31 * DAY).toISOString() }));
    expect(tooOld.status).toBe(400);
    expect(tooOld.body.error.fields).toHaveProperty("actionDateTime");

    const tooFar = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ actionDateTime: new Date(Date.now() + 25 * 3_600_000).toISOString() }));
    expect(tooFar.status).toBe(400);
    expect(tooFar.body.error.fields).toHaveProperty("actionDateTime");

    const invalid = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ actionDateTime: "not-a-date" }));
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.fields).toHaveProperty("actionDateTime");

    expect(await getPrisma().actionTaken.count()).toBe(0);
  });

  it("accepts the outer edges of the allowed window", async () => {
    const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: aliceTicket.id } });

    const oldest = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(
        validCreate({
          actionDescription: "Backdated work entry.",
          actionDateTime: new Date(ticket.createdAt.getTime() - 29 * DAY).toISOString(),
        })
      );
    expect(oldest.status).toBe(201);

    const newest = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(
        validCreate({
          actionDescription: "Near-future scheduled entry.",
          actionDateTime: new Date(Date.now() + 23 * 3_600_000).toISOString(),
        })
      );
    expect(newest.status).toBe(201);
  });

  it("drops a Follow-up Note sent with Follow-Up Required No (BR-05 iff)", async () => {
    const res = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ followUpRequired: false, followUpNote: "Should not be stored." }));

    expect(res.status).toBe(201);
    expect(res.body.action.followUpRequired).toBe(false);
    expect(res.body.action.followUpNote).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("API-TA-04: Requesters can never write Actions (AC-05, BR-04)", () => {
  it("returns 403 on create and update with no row written", async () => {
    const createRes = await alice
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate());
    expect(createRes.status).toBe(403);
    expect(createRes.body.error.code).toBe("FORBIDDEN");
    expect(createRes.body.action).toBeUndefined();

    const existing = await seedAction(aliceTicket.id, danId);
    const patchRes = await alice
      .patch(`/api/staff/tickets/${aliceTicket.id}/actions/${existing.id}`)
      .send({ result: "Requester edit attempt", expectedUpdatedAt: existing.updatedAt.toISOString() });
    expect(patchRes.status).toBe(403);

    const row = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: existing.id } });
    expect(row.result).toBeNull();
    expect(await getPrisma().actionTaken.count()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
describe("API-TA-05: list Actions with correct access and ordering (AC-06, BR-04, BR-07)", () => {
  it("returns an empty list for a Ticket with zero Actions (zero-record contract)", async () => {
    const res = await alice.get(`/api/tickets/${aliceTicket.id}/actions`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it("orders newest Action Date/Time first and breaks ties by id descending", async () => {
    const tie = new Date(Date.now() - 2 * DAY);
    const older = await seedAction(aliceTicket.id, danId, {
      actionDateTime: new Date(Date.now() - 3 * DAY),
      actionDescription: "Older action",
    });
    const tieFirst = await seedAction(aliceTicket.id, danId, {
      actionDateTime: tie,
      actionDescription: "Tie first",
    });
    const tieSecond = await seedAction(aliceTicket.id, eileenId, {
      actionDateTime: tie,
      actionDescription: "Tie second",
    });

    const res = await dan.get(`/api/tickets/${aliceTicket.id}/actions`);
    expect(res.status).toBe(200);
    expect(res.body.items.map((a: { id: number }) => a.id)).toEqual([
      tieSecond.id,
      tieFirst.id,
      older.id,
    ]);
    expect(res.body.items[0].performedBy).toMatchObject({ id: eileenId, role: "IT_STAFF" });
  });

  it("lets a Requester read owned Tickets only; foreign and missing are non-disclosing 404", async () => {
    await seedAction(aliceTicket.id, danId, { actionDescription: "Visible to Alice" });

    const own = await alice.get(`/api/tickets/${aliceTicket.id}/actions`);
    expect(own.status).toBe(200);
    expect(own.body.items).toHaveLength(1);
    expect(own.body.items[0].actionDescription).toBe("Visible to Alice");

    const foreign = await alice.get(`/api/tickets/${bobTicket.id}/actions`);
    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe("NOT_FOUND");
    expect(JSON.stringify(foreign.body)).not.toContain("Visible");

    const missing = await alice.get(`/api/tickets/999999/actions`);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual(foreign.body);
  });

  it("lets IT Staff and Administrators read any accessible Ticket", async () => {
    await seedAction(bobTicket.id, danId);

    const staffRes = await eileen.get(`/api/tickets/${bobTicket.id}/actions`);
    expect(staffRes.status).toBe(200);
    expect(staffRes.body.items).toHaveLength(1);

    const adminRes = await admin.get(`/api/tickets/${bobTicket.id}/actions`);
    expect(adminRes.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
describe("API-TA-06: a different IT Staff member may perform an Action (AC-07, BR-02)", () => {
  it("saves with that performer while the Ticket Owner is unchanged", async () => {
    const res = await eileen
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ actionDescription: "Second engineer follow-up." }));

    expect(res.status).toBe(201);
    expect(res.body.action.performedBy).toMatchObject({ id: eileenId });

    const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: aliceTicket.id } });
    expect(ticket.ownerId).toBe(danId);
  });
});

// ---------------------------------------------------------------------------
describe("API-TA-07: a deactivated account cannot record Actions (AC-08, BR-03)", () => {
  it("rejects the write and saves nothing (Lab 3 session semantics: 403 ACCOUNT_INACTIVE)", async () => {
    await getPrisma().user.update({ where: { id: eileenId }, data: { active: false } });

    const res = await eileen
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate());

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
    expect(await getPrisma().actionTaken.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe("API-TA-08: update permitted fields only (AC-09, BR-06)", () => {
  it("updates fields, keeps the performer, and never lets the client change it", async () => {
    const created = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ followUpRequired: true, followUpNote: "Call back Friday." }));
    expect(created.status).toBe(201);

    const res = await dan
      .patch(`/api/staff/tickets/${aliceTicket.id}/actions/${created.body.action.id}`)
      .send({
        result: "Confirmed fixed after retest.",
        followUpRequired: false,
        followUpNote: null,
        performedById: henriId,
        expectedUpdatedAt: created.body.action.updatedAt,
      });

    expect(res.status).toBe(200);
    expect(res.body.action).toMatchObject({
      result: "Confirmed fixed after retest.",
      followUpRequired: false,
      followUpNote: null,
      performedBy: { id: danId },
    });
    expect(res.body.action.attachmentNotes).toBe("battery-report.png — final diagnostic tab");
  });

  it("clears a stored Follow-up Note when the flag is turned off without sending the note", async () => {
    const created = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ followUpRequired: true, followUpNote: "Needs a trial replacement." }));
    expect(created.status).toBe(201);
    expect(created.body.action.followUpNote).toBe("Needs a trial replacement.");

    // Only the flag is sent: the stale Note must not survive it (BR-05 "iff").
    const res = await dan
      .patch(`/api/staff/tickets/${aliceTicket.id}/actions/${created.body.action.id}`)
      .send({ followUpRequired: false, expectedUpdatedAt: created.body.action.updatedAt });

    expect(res.status).toBe(200);
    expect(res.body.action.followUpRequired).toBe(false);
    expect(res.body.action.followUpNote).toBeNull();

    const stored = await getPrisma().actionTaken.findUniqueOrThrow({
      where: { id: created.body.action.id },
    });
    expect(stored.followUpNote).toBeNull();
  });

  it("requires a non-empty note when the merged follow-up flag stays true", async () => {
    const created = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ followUpRequired: true, followUpNote: "Initial note." }));

    const res = await dan
      .patch(`/api/staff/tickets/${aliceTicket.id}/actions/${created.body.action.id}`)
      .send({ followUpNote: "  ", expectedUpdatedAt: created.body.action.updatedAt });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty("followUpNote");

    const row = await getPrisma().actionTaken.findUniqueOrThrow({
      where: { id: created.body.action.id },
    });
    expect(row.followUpNote).toBe("Initial note.");
  });

  it("returns 400 for invalid updates and 404 for an Action on another Ticket", async () => {
    const created = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate());

    const invalid = await dan
      .patch(`/api/staff/tickets/${aliceTicket.id}/actions/${created.body.action.id}`)
      .send({ actionDescription: "   ", expectedUpdatedAt: created.body.action.updatedAt });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.fields).toHaveProperty("actionDescription");

    const wrongTicket = await dan
      .patch(`/api/staff/tickets/${bobTicket.id}/actions/${created.body.action.id}`)
      .send({ result: "Steal", expectedUpdatedAt: created.body.action.updatedAt });
    expect(wrongTicket.status).toBe(404);
    expect(wrongTicket.body.error.code).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
describe("API-TA-09: duplicate-submit guard (AC-10, BR-13)", () => {
  it("rejects a repeat create inside the 5-minute window and keeps exactly one row", async () => {
    const first = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate());
    expect(first.status).toBe(201);

    const second = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate());
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("DUPLICATE_ACTION");
    expect(await getPrisma().actionTaken.count()).toBe(1);
  });

  it("allows a different actor, a different description, and a retry after the window closes", async () => {
    const description = "Replaced the thermal paste.";
    const first = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ actionDescription: description }));
    expect(first.status).toBe(201);

    // A different actor (BR-02) with the same description is not a duplicate.
    const otherActor = await eileen
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ actionDescription: description }));
    expect(otherActor.status).toBe(201);

    // A different description by the same actor is not a duplicate.
    const otherText = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ actionDescription: "Checked the fan curve." }));
    expect(otherText.status).toBe(201);

    // Age the rows beyond the 5-minute window: the same actor may log the same
    // description again (a genuine repeat later, not a double-click retry).
    await getPrisma().actionTaken.updateMany({
      where: { ticketId: aliceTicket.id, performedById: danId },
      data: { createdAt: new Date(Date.now() - 6 * 60 * 1000) },
    });
    const afterWindow = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate({ actionDescription: description }));
    expect(afterWindow.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
describe("API-TA-10: stale Action update (AC-14, BR-12)", () => {
  it("returns 409 STALE_UPDATE without changing the stored row", async () => {
    const created = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate());

    const res = await dan
      .patch(`/api/staff/tickets/${aliceTicket.id}/actions/${created.body.action.id}`)
      .send({
        result: "Attempted overwrite",
        expectedUpdatedAt: new Date(Date.now() - 60_000).toISOString(),
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("STALE_UPDATE");

    const row = await getPrisma().actionTaken.findUniqueOrThrow({
      where: { id: created.body.action.id },
    });
    expect(row.result).toBe("Battery health now 94%.");
  });

  it("requires expectedUpdatedAt (400 when missing or invalid)", async () => {
    const created = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate());

    for (const expectedUpdatedAt of [undefined, "", "not-a-date"]) {
      const res = await dan
        .patch(`/api/staff/tickets/${aliceTicket.id}/actions/${created.body.action.id}`)
        .send({ result: "Retry", expectedUpdatedAt });
      expect(res.status).toBe(400);
      expect(res.body.error.fields).toHaveProperty("expectedUpdatedAt");
    }
  });

  it("accepts the current updatedAt exactly", async () => {
    const created = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate());

    const res = await dan
      .patch(`/api/staff/tickets/${aliceTicket.id}/actions/${created.body.action.id}`)
      .send({ result: "Retested and confirmed.", expectedUpdatedAt: created.body.action.updatedAt });
    expect(res.status).toBe(200);
    expect(res.body.action.result).toBe("Retested and confirmed.");
  });
});

// ---------------------------------------------------------------------------
describe("API-AUTH-01: direct-API authorization sweep for Action routes (AC-05, BR-04)", () => {
  it("401 for anonymous callers on every Action route", async () => {
    const created = await seedAction(aliceTicket.id, danId);

    const post = await request(app)
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .set(CSRF_HEADER, "1")
      .send(validCreate());
    expect(post.status).toBe(401);

    const patch = await request(app)
      .patch(`/api/staff/tickets/${aliceTicket.id}/actions/${created.id}`)
      .set(CSRF_HEADER, "1")
      .send({ result: "Anon", expectedUpdatedAt: created.updatedAt.toISOString() });
    expect(patch.status).toBe(401);

    const list = await request(app).get(`/api/tickets/${aliceTicket.id}/actions`);
    expect(list.status).toBe(401);

    expect(await getPrisma().actionTaken.count()).toBe(1);
  });

  it("403 for Requesters on writes and 2xx for Staff/Admin writes", async () => {
    const requesterPost = await alice
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate());
    expect(requesterPost.status).toBe(403);

    const requesterList = await alice.get(`/api/tickets/${aliceTicket.id}/actions`);
    expect(requesterList.status).toBe(200);

    const staffPost = await dan
      .post(`/api/staff/tickets/${aliceTicket.id}/actions`)
      .send(validCreate());
    expect(staffPost.status).toBe(201);

    const staffPatch = await dan
      .patch(`/api/staff/tickets/${aliceTicket.id}/actions/${staffPost.body.action.id}`)
      .send({ result: "Staff edited.", expectedUpdatedAt: staffPost.body.action.updatedAt });
    expect(staffPatch.status).toBe(200);

    const adminPost = await admin
      .post(`/api/staff/tickets/${bobTicket.id}/actions`)
      .send(validCreate({ actionDescription: "Admin recorded this." }));
    expect(adminPost.status).toBe(201);
  });
});
