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
  companies: [], company: null, companyId: null, setCompanyId: () => {}, loading: true, refetch: () => {},
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const fetchCompanies = useServerFn(listCompanies);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["companies"],
    queryFn: () => fetchCompanies(),
  });
  const companies = (data ?? []) as Company[];
  const [companyId, setCompanyIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!companies.length) return;
    const saved = localStorage.getItem("uboard.company");
    const valid = companies.find((c) => c.id === saved);
    setCompanyIdState(valid ? valid.id : companies[0].id);
  }, [companies]);

  const setCompanyId = (id: string) => {
    setCompanyIdState(id);
    localStorage.setItem("uboard.company", id);
  };

  const company = companies.find((c) => c.id === companyId) ?? null;

  return (
    <CompanyCtx.Provider value={{ companies, company, companyId, setCompanyId, loading: isLoading, refetch }}>
      {children}
    </CompanyCtx.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyCtx);
}
