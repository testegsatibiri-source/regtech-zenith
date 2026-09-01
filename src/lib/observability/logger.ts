// H4 — Structured JSON logger with trace correlation.
export interface Logger {
  info: (msg: string, fields?: Record<string, unknown>) => void;
  warn: (msg: string, fields?: Record<string, unknown>) => void;
  error: (msg: string, fields?: Record<string, unknown>) => void;
  child: (bindings: Record<string, unknown>) => Logger;
}

function make(bindings: Record<string, unknown>): Logger {
  const write = (
    level: "info" | "warn" | "error",
    msg: string,
    fields?: Record<string, unknown>,
  ) => {
    const payload = {
      level,
      ts: new Date().toISOString(),
      msg,
      ...bindings,
      ...(fields ?? {}),
    };
    const line = JSON.stringify(payload);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };
  return {
    info: (m, f) => write("info", m, f),
    warn: (m, f) => write("warn", m, f),
    error: (m, f) => write("error", m, f),
    child: (b) => make({ ...bindings, ...b }),
  };
}

const rootLogger = make({ svc: "compliance-os" });

export function getLogger(bindings?: Record<string, unknown>): Logger {
  return bindings ? rootLogger.child(bindings) : rootLogger;
}
