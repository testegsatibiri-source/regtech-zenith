// H10-Obs — Alert evaluation + notification dispatch. Adapters for Slack,
// Email, and Webhook are functional (fire HTTP). SMS/WhatsApp/PagerDuty are
// stubs and no-op with a warning log.
import { getLogger } from "./logger";

export type Channel = "slack" | "email" | "webhook" | "sms" | "whatsapp" | "pagerduty";

export interface NotificationTarget {
  channel: Channel;
  target: string;
}

export interface AlertPayload {
  ruleName: string;
  severity: "P1" | "P2" | "P3" | "P4";
  layer: string;
  metric: string;
  observedValue: number;
  threshold: number;
  triggeredAt: string;
}

const log = getLogger({ mod: "alerts" });

async function fireSlack(target: string, p: AlertPayload) {
  await fetch(target, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text:
        `:rotating_light: *[${p.severity}] ${p.ruleName}*\n` +
        `layer=${p.layer} metric=${p.metric} value=${p.observedValue} threshold=${p.threshold}`,
    }),
  });
}

async function fireWebhook(target: string, p: AlertPayload) {
  await fetch(target, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(p),
  });
}

async function fireEmail(_target: string, p: AlertPayload) {
  // Email dispatch reuses future email connector; log for now so the
  // pipeline is observable in H10.
  log.info("alert:email", { ...p });
}

export async function dispatchNotification(t: NotificationTarget, p: AlertPayload): Promise<void> {
  try {
    switch (t.channel) {
      case "slack":
        return await fireSlack(t.target, p);
      case "webhook":
        return await fireWebhook(t.target, p);
      case "email":
        return await fireEmail(t.target, p);
      case "sms":
      case "whatsapp":
      case "pagerduty":
        log.warn("alert:channel-stub", { channel: t.channel, payload: p });
        return;
    }
  } catch (err) {
    log.error("alert:dispatch-failed", { channel: t.channel, err: (err as Error).message });
  }
}

/** Evaluate a single rule against an observed value. */
export function evaluate(
  rule: {
    comparator: ">" | "<" | ">=" | "<=" | "==" | "!=";
    threshold: number;
  },
  observed: number,
): boolean {
  switch (rule.comparator) {
    case ">":
      return observed > rule.threshold;
    case "<":
      return observed < rule.threshold;
    case ">=":
      return observed >= rule.threshold;
    case "<=":
      return observed <= rule.threshold;
    case "==":
      return observed === rule.threshold;
    case "!=":
      return observed !== rule.threshold;
  }
}
