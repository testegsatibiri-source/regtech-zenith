import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, Users, Calculator, ShieldCheck, LogOut, Plus, Building2, Sparkles, CalendarClock,
  CalendarDays, FileSignature, FileDown, UserX, FolderOpen } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { CompanyProvider, useCompany } from "@/lib/companyContext";
import { createCompany } from "@/lib/data.functions";
import { getAvailableCountryPacks } from "@/lib/packs/packs.functions";
import { CountryPackSelector } from "@/components/packs/CountryPackSelector";
import type { AvailablePack } from "@/lib/packs/onboarding-contract";

import { useI18n } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <CompanyProvider>
      <ShellInner>{children}</ShellInner>
    </CompanyProvider>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pathname } = useRouterState({ select: (s) => s.location });

  const nav = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/employees", label: t("nav.employees"), icon: Users },
    { to: "/personnel", label: "201 File", icon: FolderOpen },
    { to: "/payroll", label: t("nav.payroll"), icon: Calculator },
    { to: "/calendar", label: "Calendar", icon: CalendarClock },
    { to: "/contracts", label: "Contracts", icon: FileSignature },
    { to: "/filings", label: "Filings", icon: FileDown },
    { to: "/leave", label: "Leave", icon: CalendarDays },
    { to: "/separations", label: "Separations", icon: UserX },
    { to: "/privacy", label: "Data Privacy", icon: Lock },
    { to: "/audit", label: "AI Audit", icon: Sparkles },
    { to: "/company", label: "Employer registry", icon: Building2 },
  ];



  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
        <Link to="/" className="flex h-16 items-center gap-2 border-b border-border px-5 font-display text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          UBoard<span className="text-accent">Asia</span>
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                  (active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")
                }
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> {t("nav.signout")}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-card px-4">
          <CompanySwitcher />
          <div className="flex items-center gap-2">
            <LangToggle />
            <Button variant="ghost" size="sm" className="md:hidden" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function CompanySwitcher() {
  const { companies, companyId, setCompanyId, refetch } = useCompany();
  const createCo = useServerFn(createCompany);
  const fetchPacks = useServerFn(getAvailableCountryPacks);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(null);

  // Same availability source as /onboarding and /packs (ADR-0033).
  const { data: packs = [] } = useQuery({
    queryKey: ["available-country-packs"],
    queryFn: () => fetchPacks() as Promise<AvailablePack[]>,
    enabled: open,
  });

  async function add() {
    if (!name.trim() || !countryCode) return;
    try {
      await createCo({ data: { name: name.trim(), tax_id: taxId || null, country_code: countryCode } });
      toast.success("Company created");
      setOpen(false); setName(""); setTaxId(""); setCountryCode(null);
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      {companies.length > 0 ? (
        <Select value={companyId ?? undefined} onValueChange={setCompanyId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select company" /></SelectTrigger>
          <SelectContent>
            {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-sm text-muted-foreground">No company yet</span>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4" /></Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>New company</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Tax ID</Label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Country pack</Label>
              <CountryPackSelector packs={packs} value={countryCode} onSelect={setCountryCode} />
            </div>
          </div>
          <DialogFooter><Button onClick={add} disabled={!name.trim() || !countryCode}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

