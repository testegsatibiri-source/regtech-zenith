import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "id";

type Dict = Record<string, { en: string; id: string }>;

// Hybrid EN / Bahasa Indonesia dictionary.
const D: Dict = {
  "nav.product": { en: "Product", id: "Produk" },
  "nav.pricing": { en: "Pricing", id: "Harga" },
  "nav.calculator": { en: "Calculator", id: "Kalkulator" },
  "nav.signin": { en: "Sign in", id: "Masuk" },
  "nav.dashboard": { en: "Dashboard", id: "Dasbor" },
  "nav.employees": { en: "Employees", id: "Karyawan" },
  "nav.payroll": { en: "Payroll", id: "Penggajian" },
  "nav.companies": { en: "Companies", id: "Perusahaan" },
  "nav.signout": { en: "Sign out", id: "Keluar" },

  "hero.badge": { en: "Compliance & Payroll for Southeast Asia", id: "Kepatuhan & Penggajian untuk Asia Tenggara" },
  "hero.title": { en: "Payroll that stays compliant while the law keeps changing", id: "Penggajian yang tetap patuh saat regulasi berubah" },
  "hero.sub": {
    en: "UBoard Asia decouples your Core ERP from Country Packs and Rule Engines — so a single config update keeps thousands of companies compliant. See your Compliance Score before the auditor does.",
    id: "UBoard Asia memisahkan Core ERP dari Country Pack dan Rule Engine — satu pembaruan konfigurasi menjaga kepatuhan ribuan perusahaan. Lihat Skor Kepatuhan Anda sebelum auditor.",
  },
  "hero.cta": { en: "Start free", id: "Mulai gratis" },
  "hero.cta2": { en: "Try the calculator", id: "Coba kalkulator" },

  "score.title": { en: "Compliance Score", id: "Skor Kepatuhan" },
  "score.audit": { en: "Audit readiness", id: "Kesiapan audit" },

  "calc.title": { en: "Indonesia Payroll Calculator", id: "Kalkulator Penggajian Indonesia" },
  "calc.sub": { en: "PPh 21 (TER), BPJS and THR — 2024 parameters.", id: "PPh 21 (TER), BPJS dan THR — parameter 2024." },
  "calc.base": { en: "Base salary (IDR/month)", id: "Gaji pokok (IDR/bulan)" },
  "calc.allow": { en: "Allowances (IDR)", id: "Tunjangan (IDR)" },
  "calc.status": { en: "Marital status (PTKP)", id: "Status (PTKP)" },
  "calc.npwp": { en: "Has NPWP", id: "Memiliki NPWP" },
  "calc.months": { en: "Months of service (for THR)", id: "Masa kerja (bulan, untuk THR)" },
  "calc.gross": { en: "Gross", id: "Bruto" },
  "calc.tax": { en: "PPh 21 (tax)", id: "PPh 21 (pajak)" },
  "calc.bpjsEmp": { en: "BPJS (employee)", id: "BPJS (karyawan)" },
  "calc.bpjsEmployer": { en: "BPJS (employer)", id: "BPJS (perusahaan)" },
  "calc.net": { en: "Net take-home", id: "Gaji bersih" },
  "calc.employerCost": { en: "Total employer cost", id: "Total biaya perusahaan" },
  "calc.thr": { en: "THR (13th pay)", id: "THR (gaji ke-13)" },
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof D | string) => string;
}

const Ctx = createContext<I18nCtx>({ lang: "en", setLang: () => {}, t: (k) => String(k) });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("uboard.lang") as Lang | null;
    if (saved === "en" || saved === "id") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("uboard.lang", l);
  };

  const t = (key: string) => {
    const entry = D[key];
    if (!entry) return key;
    return entry[lang];
  };

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
