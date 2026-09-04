import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCompanies } from "@/lib/data.functions";

type Company = { id: string; name: string; country_code: string; currency: string };

interface Ctx {
  companies: Company[];
  company: Company | null;
  companyId: string | null;
  setCompanyId: (id: string) => void;
  loading: boolean;
  refetch: () => void;
}

const CompanyCtx = createContext<Ctx>({
  companies: [],
  company: null,
  companyId: null,
  setCompanyId: () => {},
  loading: true,
  refetch: () => {},
});

// Perf audit (2026-09-04), finding P1-3: the active company used to be resolved
// in a post-mount effect, so every screen query waited one extra render before
// it could start. This subtree is client-only (`ssr: false`), so reading the
// stored id in the initializer is safe and removes that hop.
function storedCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("uboard.company");
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const fetchCompanies = useServerFn(listCompanies);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["companies"],
    queryFn: () => fetchCompanies(),
  });
  const companies = (data ?? []) as Company[];
  const [companyId, setCompanyIdState] = useState<string | null>(storedCompanyId);

  useEffect(() => {
    if (!companies.length) return;
    setCompanyIdState((current) => {
      if (current && companies.some((c) => c.id === current)) return current;
      return companies[0].id;
    });
  }, [companies]);

  const setCompanyId = (id: string) => {
    setCompanyIdState(id);
    localStorage.setItem("uboard.company", id);
  };


  const company = companies.find((c) => c.id === companyId) ?? null;

  return (
    <CompanyCtx.Provider
      value={{ companies, company, companyId, setCompanyId, loading: isLoading, refetch }}
    >
      {children}
    </CompanyCtx.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyCtx);
}
