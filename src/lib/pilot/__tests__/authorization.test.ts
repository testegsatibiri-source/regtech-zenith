import { describe, it, expect } from "vitest";
import {
  evaluatePilotAuthorization,
  countryIsCovered,
  DENIAL_MESSAGES,
  type PilotAuthorizationRecord,
} from "../authorization";

const NOW = new Date("2026-09-25T00:00:00.000Z");

function rec(over: Partial<PilotAuthorizationRecord> = {}): PilotAuthorizationRecord {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    status: "approved",
    authorized_country: "PH",
    pilot_expires_at: null,
    ...over,
  };
}

describe("pilot authorization boundary", () => {
  it("denies when there is no pilot request at all", () => {
    const d = evaluatePilotAuthorization(null, "PH", NOW);
    expect(d).toEqual({ allowed: false, reason: "no_request", requestId: null });
  });

  it.each(["new", "qualified", "rejected"] as const)(
    "denies a request in status %s",
    (status) => {
      const d = evaluatePilotAuthorization(rec({ status }), "PH", NOW);
      expect(d.allowed).toBe(false);
      expect(d.allowed === false && d.reason).toBe("not_approved");
    },
  );

  it("allows an approved request for its authorized country", () => {
    const d = evaluatePilotAuthorization(rec(), "PH", NOW);
    expect(d.allowed).toBe(true);
  });

  it("keeps a converted request entitled (second workspace, same country)", () => {
    const d = evaluatePilotAuthorization(rec({ status: "converted" }), "PH", NOW);
    expect(d.allowed).toBe(true);
  });

  it("denies a country the approval does not cover", () => {
    const d = evaluatePilotAuthorization(rec({ authorized_country: "PH" }), "ID", NOW);
    expect(d.allowed === false && d.reason).toBe("country_not_authorized");
  });

  it("BOTH covers ID and PH and nothing else", () => {
    expect(countryIsCovered("BOTH", "id")).toBe(true);
    expect(countryIsCovered("BOTH", "PH")).toBe(true);
    expect(countryIsCovered("BOTH", "MY")).toBe(false);
  });

  it("denies an approval with no authorized country", () => {
    const d = evaluatePilotAuthorization(rec({ authorized_country: null }), "PH", NOW);
    expect(d.allowed === false && d.reason).toBe("no_authorized_country");
  });

  it("denies an expired authorization even when approved", () => {
    const d = evaluatePilotAuthorization(
      rec({ pilot_expires_at: "2026-09-24T23:59:59.000Z" }),
      "PH",
      NOW,
    );
    expect(d.allowed === false && d.reason).toBe("expired");
  });

  it("treats the expiry instant itself as expired", () => {
    const d = evaluatePilotAuthorization(
      rec({ pilot_expires_at: NOW.toISOString() }),
      "PH",
      NOW,
    );
    expect(d.allowed === false && d.reason).toBe("expired");
  });

  it("still allows before the expiry instant", () => {
    const d = evaluatePilotAuthorization(
      rec({ pilot_expires_at: "2026-12-31T00:00:00.000Z" }),
      "PH",
      NOW,
    );
    expect(d.allowed).toBe(true);
  });

  it("is case-insensitive on the requested country code", () => {
    expect(evaluatePilotAuthorization(rec({ authorized_country: "ID" }), "id", NOW).allowed).toBe(
      true,
    );
  });

  it("is deterministic: same input, same decision", () => {
    const a = evaluatePilotAuthorization(rec(), "PH", NOW);
    const b = evaluatePilotAuthorization(rec(), "PH", NOW);
    expect(a).toEqual(b);
  });

  it("every denial reason has user-facing copy that leaks no third-party data", () => {
    for (const [reason, message] of Object.entries(DENIAL_MESSAGES)) {
      expect(message.length).toBeGreaterThan(10);
      expect(message).not.toMatch(/@/);
      expect(reason).toBeTruthy();
    }
  });
});
