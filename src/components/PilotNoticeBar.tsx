import { Info } from "lucide-react";

/**
 * Global Notice Bar — English by decision (global surfaces are English-only).
 * States the controlled-access posture without claiming Asia-wide readiness.
 */
export function PilotNoticeBar() {
  return (
    <div className="border-b border-border/60 bg-muted/60 px-4 py-2 text-center text-xs text-muted-foreground">
      <span className="mx-auto flex max-w-5xl items-center justify-center gap-2">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong className="font-semibold text-foreground">Homologation Pilot Program</strong> —
          UBoardAsia currently operates controlled access for companies validating payroll and
          compliance operations in Indonesia and the Philippines. Access is subject to pilot
          approval and applicable validation scope.
        </span>
      </span>
    </div>
  );
}
