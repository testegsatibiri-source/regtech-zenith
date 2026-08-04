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

  "hero.badge": { en: "Global compliance infrastructure", id: "Infrastruktur kepatuhan global" },
  "hero.title": {
    en: "Global payroll compliance infrastructure, built for every jurisdiction",
    id: "Infrastruktur kepatuhan payroll global, dibangun untuk setiap yurisdiksi",
  },
  "hero.sub": {
    en: "One secure core. Independent country packs. Payroll, tax and statutory compliance delivered through modular compliance engines.",
    id: "Satu core yang aman. Country pack independen. Payroll, pajak, dan kepatuhan statutori melalui mesin kepatuhan modular.",
  },
  "hero.cta": { en: "Start free", id: "Mulai gratis" },
  "hero.cta2": { en: "Try the calculator", id: "Coba kalkulator" },
  "hero.ctaPacks": { en: "Explore Country Packs", id: "Jelajahi Country Pack" },
  "hero.ctaCore": { en: "Start with Global Core", id: "Mulai dengan Global Core" },
  "hero.signal1": { en: "Minimum wage floor respected", id: "Batas upah minimum terpenuhi" },
  "hero.signal2": { en: "Statutory contributions enrolled", id: "Iuran statutori terdaftar" },
  "hero.signal3": { en: "Tax ID missing on 3 employees", id: "Nomor pajak hilang pada 3 karyawan" },


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
