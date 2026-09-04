import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { listCompanies } from "@/lib/data.functions";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    // Perf audit (2026-09-04), finding P1-2: this gate used to run a network
    // `getUser()` and a fresh `listCompanies()` in series on EVERY navigation
    // inside the app shell. Both now go through the router's query cache, so a
    // navigation between authenticated routes costs zero round-trips while the
    // entries are fresh. Auth is still validated server-side on every protected
    // server fn via `requireSupabaseAuth`.
    const user = await context.queryClient.ensureQueryData({
      queryKey: ["auth", "user"],
      queryFn: async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) return null;
        return data.user;
      },
      staleTime: 60_000,
    });
    if (!user) throw redirect({ to: "/auth" });

    // H18.4 — a user without a company must complete onboarding first. The
    // rule lives here only; never replicate it per route.
    // Same query key as CompanyProvider, so the shell reuses this fetch.
    const companies = await context.queryClient.ensureQueryData({
      queryKey: ["companies"],
      queryFn: () => listCompanies(),
    });
    if (companies.length === 0) throw redirect({ to: "/onboarding" });
    return { user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
