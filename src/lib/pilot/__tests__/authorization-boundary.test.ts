// Boundary tests: prove there is no bypass around the pilot gate.
//
// Two layers are covered here:
//  1. Behavioural — `authorizePilotCountry` against a faked database.
//  2. Structural — the gate is actually wired into `createCompany` and the
//     lifecycle mutations actually demand a platform role. A refactor that
//     silently drops one of those calls must fail the suite.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rolesRows: { role: string }[] = [];
let pilotRow: Record<string, unknown> | null = null;

vi.mock("@/integrations/supabase/client.server", () => {
  const builder = (table: string) => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    Object.assign(chain, {
      select: self,
      eq: self,
      order: self,
      limit: self,
      maybeSingle: async () =>
        table === "pilot_requests" ? { data: pilotRow, error: null } : { data: null, error: null },
      then: undefined,
    });
    // `user_roles` resolves as an awaited query (no .maybeSingle()).
    (chain as { then?: unknown }).then = (res: (v: unknown) => unknown) =>
      res({ data: table === "user_roles" ? rolesRows : [], error: null });
    return chain;
  };
  return {
    supabaseAdmin: {
      from: (table: string) => builder(table),
      auth: { admin: { getUserById: async () => ({ data: { user: null }, error: null }) } },
    },
  };
});

const CLAIMS = { email: "ops@client.ph" };

async function authorize(country: string, now = new Date("2026-09-25T00:00:00Z")) {
  const { authorizePilotCountry } = await import("../authorization.server");
  return authorizePilotCountry({ userId: "user-1", claims: CLAIMS, country, now });
}

beforeEach(() => {
  rolesRows.length = 0;
  pilotRow = null;
});

describe("authorizePilotCountry", () => {
  it("denies a signed-in user with no pilot request", async () => {
    const r = await authorize("PH");
    expect(r.allowed).toBe(false);
  });

  it("denies a request that is only 'new'", async () => {
    pilotRow = { id: "p1", status: "new", authorized_country: null, pilot_expires_at: null };
    const r = await authorize("PH");
    expect(r.allowed).toBe(false);
  });

  it("allows an approved request in its authorized jurisdiction", async () => {
    pilotRow = { id: "p1", status: "approved", authorized_country: "PH", pilot_expires_at: null };
    const r = await authorize("PH");
    expect(r.allowed).toBe(true);
    expect(r.allowed && r.via).toBe("pilot");
  });

  it("denies the same approved request in another jurisdiction", async () => {
    pilotRow = { id: "p1", status: "approved", authorized_country: "PH", pilot_expires_at: null };
    const r = await authorize("ID");
    expect(r.allowed).toBe(false);
    expect(!r.allowed && r.decision.reason).toBe("country_not_authorized");
  });

  it("denies an expired approval", async () => {
    pilotRow = {
      id: "p1",
      status: "approved",
      authorized_country: "BOTH",
      pilot_expires_at: "2026-01-01T00:00:00Z",
    };
    const r = await authorize("PH");
    expect(!r.allowed && r.decision.reason).toBe("expired");
  });

  it("authorizes platform staff as staff, not as a pilot", async () => {
    rolesRows.push({ role: "platform_admin" });
    const r = await authorize("MY");
    expect(r.allowed).toBe(true);
    expect(r.allowed && r.via).toBe("platform_role");
  });

  it("does not treat a customer role as platform staff", async () => {
    rolesRows.push({ role: "manager" });
    const r = await authorize("PH");
    expect(r.allowed).toBe(false);
  });
});

function source(file: string): string {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

describe("no-bypass wiring", () => {
  it("createCompany runs the pilot gate before inserting the company", () => {
    const src = source("src/lib/data.functions.ts");
    const gate = src.indexOf("authorizePilotCountry");
    const insert = src.indexOf('.from("companies")\n      .insert');
    expect(gate).toBeGreaterThan(-1);
    expect(insert).toBeGreaterThan(gate);
  });

  it("createCompany never takes the approving identity from client input", () => {
    const src = source("src/lib/data.functions.ts");
    expect(src).not.toMatch(/data\.(approved_by|approvedBy|authorized_country|authorizedCountry)/);
  });

  it("every pilot lifecycle mutation demands a decision role", () => {
    const src = source("src/lib/pilot.functions.ts");
    for (const fn of [
      "approvePilotRequest",
      "rejectPilotRequest",
      "qualifyPilotRequest",
      "updatePilotNotes",
    ]) {
      const start = src.indexOf(`export const ${fn}`);
      expect(start, `${fn} missing`).toBeGreaterThan(-1);
      const body = src.slice(start, start + 1400);
      expect(body, `${fn} is not role-gated`).toContain("requireDecisionRole");
      expect(body, `${fn} is not authenticated`).toContain("requireSupabaseAuth");
    }
  });

  it("approval derives approved_by from the verified session only", () => {
    const src = source("src/lib/pilot.functions.ts");
    const start = src.indexOf("export const approvePilotRequest");
    const body = src.slice(start, start + 1800);
    expect(body).toContain("approved_by: context.userId");
    expect(body).not.toContain("approved_by: data");
  });

  it("rejection revokes the authorized jurisdiction", () => {
    const src = source("src/lib/pilot.functions.ts");
    const start = src.indexOf("export const rejectPilotRequest");
    const body = src.slice(start, start + 1800);
    expect(body).toContain("authorized_country: null");
  });

  it("backoffice reads of pilot requests are role-gated", () => {
    const src = source("src/lib/pilot.functions.ts");
    for (const fn of ["listPilotRequests", "getPilotRequest"]) {
      const start = src.indexOf(`export const ${fn}`);
      const body = src.slice(start, start + 1600);
      expect(body, `${fn} is not role-gated`).toContain("userHasAnyRole");
    }
  });

  it("the Backoffice screen issues intents only — it holds no decision logic", () => {
    const src = source("src/routes/platform/pilots.tsx");
    expect(src).not.toContain("supabaseAdmin");
    expect(src).not.toContain("approved_by:");
  });
});
