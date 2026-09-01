// H8-BO — PermissionService. Single entry point for authorization decisions.
// UI, HTTP handlers, and Application Services all call `check(...)` — never
// inline `if (role === 'x')` logic.
import type { Decision, PlatformAction, PolicyContext } from "./policy/types";
import { POLICIES } from "./policy/policies";

export class ForbiddenError extends Error {
  code = "FORBIDDEN" as const;
  constructor(
    public action: PlatformAction,
    public reason: string,
  ) {
    super(`Forbidden: ${action} — ${reason}`);
  }
}

export const permissionService = {
  check(action: PlatformAction, ctx: PolicyContext): Decision {
    const policy = POLICIES[action];
    if (!policy) return { allow: false, reason: `unknown action: ${action}` };
    return policy.decide(ctx);
  },
  ensure(action: PlatformAction, ctx: PolicyContext): void {
    const decision = this.check(action, ctx);
    if (!decision.allow) throw new ForbiddenError(action, decision.reason);
  },
};
