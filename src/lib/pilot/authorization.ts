// Pilot authorization — pure decision layer.
//
// This module holds NO I/O. It answers a single question from an already
// fetched pilot request record: may this person create a company in this
// jurisdiction, right now? Keeping it pure is what makes the acceptance
// matrix (expired / new / rejected / cross-country) provable in tests without
// a database.
//
// Naming follows the `pilot_*` taxonomy on purpose (see the Country Pack
// maturity model: VALIDATED / PILOT). "Beta" is a UI word only.

export type PilotStatus = "new" | "qualified" | "approved" | "converted" | "rejected";
export type AuthorizedCountry = "ID" | "PH" | "BOTH";

/** The minimum projection the decision needs. */
export interface PilotAuthorizationRecord {
  id: string;
  status: PilotStatus;
  authorized_country: AuthorizedCountry | null;
  pilot_expires_at: string | null;
}

export type PilotDenialReason =
  | "no_request"
  | "not_approved"
  | "no_authorized_country"
  | "expired"
  | "country_not_authorized";

export type PilotAuthorizationDecision =
  | { allowed: true; requestId: string; authorizedCountry: AuthorizedCountry }
  | { allowed: false; reason: PilotDenialReason; requestId: string | null };

/** Statuses that represent a live pilot entitlement. */
const ENTITLED: readonly PilotStatus[] = ["approved", "converted"];

export function countryIsCovered(authorized: AuthorizedCountry, country: string): boolean {
  const target = country.trim().toUpperCase();
  return authorized === "BOTH" ? target === "ID" || target === "PH" : authorized === target;
}

/**
 * Decide whether `record` entitles its holder to operate in `country` at `now`.
 * `record` must already be the row matching the authenticated user's e-mail —
 * identity resolution is the caller's job, never this function's.
 */
export function evaluatePilotAuthorization(
  record: PilotAuthorizationRecord | null,
  country: string,
  now: Date,
): PilotAuthorizationDecision {
  if (!record) return { allowed: false, reason: "no_request", requestId: null };

  if (!ENTITLED.includes(record.status)) {
    return { allowed: false, reason: "not_approved", requestId: record.id };
  }

  if (!record.authorized_country) {
    return { allowed: false, reason: "no_authorized_country", requestId: record.id };
  }

  if (record.pilot_expires_at && new Date(record.pilot_expires_at).getTime() <= now.getTime()) {
    return { allowed: false, reason: "expired", requestId: record.id };
  }

  if (!countryIsCovered(record.authorized_country, country)) {
    return { allowed: false, reason: "country_not_authorized", requestId: record.id };
  }

  return { allowed: true, requestId: record.id, authorizedCountry: record.authorized_country };
}

/** Operator-facing copy for a denial. Never leaks other people's data. */
export const DENIAL_MESSAGES: Record<PilotDenialReason, string> = {
  no_request:
    "Access to UBoardAsia is limited to approved Pilot Program participants. Apply for the pilot to continue.",
  not_approved: "Your pilot application is still under review by the compliance team.",
  no_authorized_country:
    "Your pilot application has no approved jurisdiction yet. The compliance team will confirm it.",
  expired: "Your pilot authorization has expired. Contact the compliance team to renew it.",
  country_not_authorized:
    "Your pilot authorization does not cover this jurisdiction. Contact the compliance team to extend it.",
};
