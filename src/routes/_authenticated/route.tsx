import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { listCompanies } from "@/lib/data.functions";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // H18.4 — a user without a company must complete onboarding first. The
    // rule lives here only; never replicate it per route.
    const companies = await listCompanies();
    if (companies.length === 0) throw redirect({ to: "/onboarding" });
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
