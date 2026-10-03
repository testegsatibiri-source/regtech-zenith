export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[UBoardAsia] client error", {
    error,
    route: window.location.pathname,
    ...context,
  });
}
