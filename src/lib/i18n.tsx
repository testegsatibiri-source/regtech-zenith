import { createContext, useContext, type ReactNode } from "react";

export type Lang = "en" | "id" | (string & {});

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
  "calc.sub": {
    en: "PPh 21 (TER), BPJS and THR — 2024 parameters.",
    id: "PPh 21 (TER), BPJS dan THR — parameter 2024.",
  },
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

  // H17-ID — Indonesia landing (Bahasa Indonesia only; no language switcher).
  "id.nav.platform": { en: "Platform", id: "Platform" },
  "id.nav.kepatuhan": { en: "Compliance", id: "Kepatuhan" },
  "id.nav.api": { en: "API", id: "API" },
  "id.nav.kontak": { en: "Contact", id: "Kontak" },
  "id.nav.masuk": { en: "Sign in", id: "Masuk" },
  "id.nav.dashboard": { en: "Dashboard", id: "Dashboard" },
  "id.hero.badge": {
    en: "Indonesia Country Pack",
    id: "Infrastruktur Kepatuhan & Penggajian · Indonesia Country Pack",
  },
  "id.hero.title": {
    en: "Payroll compliance engine for Indonesian regulation",
    id: "Mesin Kepatuhan Penggajian untuk Regulasi Indonesia",
  },
  "id.hero.sub": {
    en: "Isolates the complexity of Indonesian labour law into a modular, validated parameter system, with a full audit trail on every calculation.",
    id: "Mengisolasi kompleksitas hukum ketenagakerjaan Indonesia — PPh 21 skema TER, BPJS Ketenagakerjaan & Kesehatan, pesangon PP 35/2021, dan THR — ke dalam sistem parameter modular dan tervalidasi, dengan jejak audit lengkap di setiap kalkulasi.",
  },
  "id.hero.ctaPrimary": { en: "Join pilot validation", id: "Daftar untuk Program Validasi Pilot" },
  "id.hero.ctaSecondary": { en: "Regulatory & API docs", id: "Dokumentasi Regulasi & API" },

  "id.status.title": { en: "Legal compliance commitment", id: "Komitmen Kepatuhan Hukum" },
  "id.status.operational": { en: "Operational status", id: "Status Operasional" },
  "id.status.ruleset": { en: "Ruleset version", id: "Versi ruleset" },
  "id.status.pack": { en: "Pack version", id: "Versi pack" },
  "id.status.body": {
    en: "The Indonesia Country Pack is going through independent verification with certified legal and accounting consultants in Indonesia. We ensure all calculation logic and personal-data handling align with applicable regulations before full commercial implementation.",
    id: "Modul Country Pack Indonesia sedang melalui tahapan verifikasi independen bersama konsultan hukum dan akuntan bersertifikasi di Indonesia. Kami memastikan seluruh logika perhitungan dan penanganan data pribadi selaras dengan regulasi yang berlaku sebelum implementasi komersial penuh.",
  },

  "id.coverage.title": { en: "Local regulatory coverage", id: "Cakupan Regulasi Lokal" },
  "id.coverage.pph21.title": { en: "PPh 21 (TER scheme)", id: "PPh 21 (Skema TER)" },
  "id.coverage.pph21.body": {
    en: "Monthly income-tax withholding using TER A/B/C average effective rates, with full annual reconciliation.",
    id: "Otomatisasi pemotongan pajak penghasilan bulanan berdasarkan Tarif Efektif Rata-Rata (TER A/B/C), dengan rekonsiliasi tahunan penuh (bulanan × tahunan, PTKP, biaya jabatan, dan deduksi).",
  },
  "id.coverage.bpjs.title": {
    en: "Social security (BPJS)",
    id: "Jaminan Sosial Ketenagakerjaan (BPJS)",
  },
  "id.coverage.bpjs.body": {
    en: "Comprehensive calculation for JKK, JKM, JHT, JP and JKP, splitting employer and employee shares.",
    id: "Perhitungan komprehensif untuk JKK (5 tingkat risiko), JKM, JHT, JP (dengan batas atas), dan JKP — dengan pemisahan porsi iuran perusahaan vs karyawan.",
  },
  "id.coverage.separation.title": {
    en: "Severance & PP 35/2021",
    id: "Kompensasi & Pesangon (PP No. 35/2021)",
  },
  "id.coverage.separation.body": {
    en: "Support for 20 termination scenarios under Articles 36–47, computing UP, UPMK and UPH with multipliers aligned to the reason for separation.",
    id: "Dukungan untuk 20 skenario Pemutusan Hubungan Kerja (PHK) sesuai Pasal 36–47, menghitung Uang Pesangon (UP), Uang Penghargaan Masa Kerja (UPMK), dan Uang Penggantian Hak (UPH) dengan pengali sesuai alasan pemutusan.",
  },
  "id.coverage.thr.title": {
    en: "Religious holiday pay (THR)",
    id: "Tunjangan Hari Raya (THR) Keagamaan",
  },
  "id.coverage.thr.body": {
    en: "Pro-rata calculation based on tenure and recorded religious holiday for permanent and PKWT employees.",
    id: "Kalkulasi pro-rata berdasarkan masa kerja dan hari raya sesuai agama yang tercatat, untuk karyawan tetap maupun PKWT.",
  },
  "id.coverage.overtime.title": { en: "Overtime", id: "Lembur" },
  "id.coverage.overtime.body": {
    en: "Calculation using the 1/173 formula for 5×8 and 6×7 work schemes.",
    id: "Perhitungan sesuai formula 1/173 dengan skema kerja 5x8 dan 6x7.",
  },
  "id.coverage.privacy.title": { en: "Personal data protection", id: "Perlindungan Data Pribadi" },
  "id.coverage.privacy.body": {
    en: "Role-based access controls, audit trail on every access to sensitive data, and a lock mechanism for data not yet protected — designed in line with UU PDP No. 27/2022, with an independent legal review in progress.",
    id: "Kontrol akses berbasis peran, jejak audit atas setiap akses ke data sensitif (NIK, NPWP, rekening bank), dan mekanisme penguncian data yang belum terlindungi — dirancang sejalan dengan UU PDP (No. 27/2022), dengan tinjauan hukum independen sedang berjalan.",
  },

  "id.validation.title": {
    en: "Automatic validation, not just calculation",
    id: "Validasi Automatis, Bukan Hanya Kalkulasi",
  },
  "id.validation.body": {
    en: "Every transaction passes through a deterministic validation engine that checks mandatory evidence before any record is confirmed — for example, a separation process is only registered when all legally required documentation is complete.",
    id: "Cada transaksi passa por um motor de validação determinístico que verifica evidências obrigatórias antes de qualquer registro ser confirmado — por exemplo, um processo de rescisão só é registrado quando toda a documentação exigida por lei está completa.",
  },

  "id.architecture.title": { en: "Architecture", id: "Arsitektur" },
  "id.architecture.core.title": { en: "Global Core", id: "Inti Global" },
  "id.architecture.core.body": {
    en: "Cross-module orchestration, employee lifecycle management, API gateway, audit trail and authentication — identical in every country.",
    id: "Orkestrasi lintas-modul, manajemen siklus hidup karyawan, API gateway, jejak audit, dan otentikasi — identik di setiap negara.",
  },
  "id.architecture.pack.title": { en: "Country Pack ID", id: "Country Pack ID" },
  "id.architecture.pack.body": {
    en: "An isolated, cryptographically signed (Ed25519) module containing only Indonesian labour-law logic.",
    id: "Modul terisolasi dan bertanda tangan kriptografis (Ed25519) contendo apenas a lógica específica da legislação trabalhista indonésia.",
  },
  "id.architecture.audit.title": { en: "Audit trail", id: "Jejak Audit" },
  "id.architecture.audit.body": {
    en: "Every calculation references the exact ruleset version that produced it, ready for inspection.",
    id: "Cada cálculo referencia a versão exata do ruleset que o produziu, pronta para inspeção.",
  },

  "id.cta.title": {
    en: "Prepare your payroll operations for Indonesia",
    id: "Siapkan Operasi Penggajian Anda untuk Indonesia",
  },
  "id.cta.body": {
    en: "We are opening a limited collaboration for multi-entity companies, accounting firms and HR consultants in Indonesia who want to validate this infrastructure in a controlled pilot programme.",
    id: "Kami membuka kolaborasi terbatas untuk perusahaan multi-entitas, firma akuntansi, dan konsultan SDM di Indonesia yang ingin memvalidasi infrastruktur ini dalam program pilot terkontrol.",
  },
  "id.form.fullName": { en: "Full name", id: "Nama Lengkap" },
  "id.form.email": { en: "Corporate email", id: "Email Perusahaan" },
  "id.form.companyName": { en: "Entity / company name", id: "Nama Entitas/Perusahaan" },
  "id.form.employeeRange": { en: "Estimated employee count", id: "Jumlah Karyawan (estimasi)" },
  "id.form.role": { en: "Role", id: "Peran" },
  "id.form.consent": {
    en: "I agree to the privacy policy and to be contacted about the pilot programme.",
    id: "Saya setuju dengan Kebijakan Privasi dan dapat dihubungi mengenai program pilot.",
  },
  "id.form.consentLink": { en: "privacy policy", id: "Kebijakan Privasi" },
  "id.form.submit": { en: "Submit pilot access request", id: "Kirim Permohonan Akses Pilot" },
  "id.form.success": {
    en: "Request received. We will contact you soon.",
    id: "Permohonan diterima. Kami akan menghubungi Anda segera.",
  },
  "id.form.error": {
    en: "Could not submit. Please try again.",
    id: "Gagal mengirim. Silakan coba lagi.",
  },

  "id.footer.tagline": {
    en: "B2B infrastructure for payroll compliance.",
    id: "Infrastruktur B2B untuk Kepatuhan Penggajian.",
  },
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof D | string) => string;
  /** Languages offered in this scope. One entry = no language switcher. */
  available: Lang[];
}

const Ctx = createContext<I18nCtx>({
  lang: "en",
  setLang: () => {},
  t: (k) => String(k),
  available: ["en"],
});

function translate(key: string, lang: Lang): string {
  const entry = D[key];
  if (!entry) return key;
  return entry[lang as "en" | "id"] ?? entry.en;
}

/**
 * Global scope. The marketing/global surface is English-only and has no
 * persisted language state: country languages belong to Country Pack pages.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <Ctx.Provider
      value={{ lang: "en", setLang: () => {}, t: (k) => translate(k, "en"), available: ["en"] }}
    >
      {children}
    </Ctx.Provider>
  );
}

/**
 * Locale locked to a single Country Pack language. No switcher is exposed and
 * no global state can change it, so pack copy always renders in the language
 * defined for that jurisdiction.
 */
export function LocaleScope({ lang, children }: { lang: Lang; children: ReactNode }) {
  const fixed: Lang = lang || "en";
  return (
    <Ctx.Provider
      value={{ lang: fixed, setLang: () => {}, t: (k) => translate(k, fixed), available: [fixed] }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useI18n() {
  return useContext(Ctx);
}
