// H8-BO — Backoffice layout ("Platform" surface).
// Distinct from `/_authenticated` on purpose: this is an admin product for
// operators/auditors/CTOs — not a customer app view.
import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Package, Rocket, Sliders, Flag, ClipboardList, ShieldAlert, LogOut, Activity, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/platform")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Any of the four platform roles unlocks the surface; individual actions
    // are gated server-side by PermissionService. UI hides forbidden CTAs.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const allowed = new Set(["platform_admin", "country_cto", "platform_operator", "platform_auditor"]);
    if (!(roles ?? []).some((r) => allowed.has(r.role))) {
      throw redirect({ to: "/dashboard" });
    }
    return { user: data.user };
  },
  component: PlatformLayout,
});

function PlatformLayout() {
  const { pathname } = useRouterState({ select: (s) => s.location });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const nav = [
    { to: "/platform", label: "Overview", icon: LayoutDashboard },
    { to: "/platform/readiness", label: "Readiness", icon: Activity },
    { to: "/platform/packs", label: "Country Packs", icon: Package },
    { to: "/platform/releases", label: "Release Center", icon: Rocket },
    { to: "/platform/parameters", label: "Parameters", icon: Sliders },
    { to: "/platform/flags", label: "Feature Flags", icon: Flag },
    { to: "/platform/audit", label: "Audit Log", icon: ClipboardList },
    { to: "/platform/uada", label: "UADA", icon: Brain },
  ] as const;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5 font-display text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div>Compliance OS</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Platform Backoffice</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/platform" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
