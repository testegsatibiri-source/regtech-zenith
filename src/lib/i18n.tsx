import { createContext, useContext, type ReactNode } from "react";

export type Lang = "en" | "id" | (string & {});

type Dict = Record<string, { en: string; id?: string; fil?: string }>;

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
    id: "Setiap transaksi melewati mesin validasi deterministik yang memeriksa bukti wajib sebelum catatan apa pun dikonfirmasi — misalnya, proses pemutusan hubungan kerja hanya tercatat ketika seluruh dokumentasi yang diwajibkan undang-undang sudah lengkap.",
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
    id: "Modul terisolasi dan bertanda tangan kriptografis (Ed25519) yang hanya berisi logika spesifik peraturan ketenagakerjaan Indonesia.",
  },
  "id.architecture.audit.title": { en: "Audit trail", id: "Jejak Audit" },
  "id.architecture.audit.body": {
    en: "Every calculation references the exact ruleset version that produced it, ready for inspection.",
    id: "Setiap perhitungan mereferensikan versi ruleset yang persis menghasilkannya, siap untuk inspeksi.",
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

  // H25-PH — Philippines landing (Filipino/Taglish only; no language switcher).
  "ph.nav.platform": { en: "Platform", fil: "Platform" },
  "ph.nav.compliance": { en: "Compliance", fil: "Pagsunod" },
  "ph.nav.api": { en: "API", fil: "API" },
  "ph.nav.contact": { en: "Contact", fil: "Kontak" },
  "ph.nav.signin": { en: "Sign in", fil: "Mag-sign in" },
  "ph.nav.dashboard": { en: "Dashboard", fil: "Dashboard" },

  "ph.hero.badge": {
    en: "Philippines Country Pack",
    fil: "Imprastraktura ng Payroll Compliance · Philippines Country Pack",
  },
  "ph.hero.title": {
    en: "Payroll compliance engine for Philippine regulation",
    fil: "Payroll compliance engine para sa regulasyon ng Pilipinas",
  },
  "ph.hero.sub": {
    en: "Philippine statutory payroll logic — SSS, PhilHealth, Pag-IBIG, BIR withholding, 13th month pay and separation pay — in one modular, versioned parameter system with a full audit trail.",
    fil: "Inilalagay namin ang statutory payroll logic ng Pilipinas — SSS, PhilHealth, Pag-IBIG, BIR withholding, 13th month pay at separation pay — sa iisang modular at versioned na sistema ng parameters, na may kumpletong audit trail sa bawat kalkulasyon.",
  },
  "ph.hero.ctaPrimary": {
    en: "Join pilot validation",
    fil: "Sumali sa Pilot Validation Program",
  },
  "ph.hero.ctaSecondary": {
    en: "Regulatory & API docs",
    fil: "Dokumentasyon ng Regulasyon at API",
  },

  "ph.status.title": { en: "Legal compliance commitment", fil: "Kompromiso sa Pagsunod sa Batas" },
  "ph.status.operational": { en: "Operational status", fil: "Operational status" },
  "ph.status.ruleset": { en: "Ruleset version", fil: "Bersyon ng ruleset" },
  "ph.status.pack": { en: "Pack version", fil: "Bersyon ng pack" },
  "ph.status.body": {
    en: "The Philippines Country Pack is under independent verification with licensed labour and tax counsel in the Philippines. Status, ruleset and pack version above are read live from the runtime. The pack is not yet released for commercial use.",
    fil: "Ang Philippines Country Pack ay dumadaan sa independent na beripikasyon kasama ang lisensyadong labor at tax counsel sa Pilipinas. Ang status, ruleset at bersyon ng pack sa itaas ay direktang binabasa mula sa runtime. Hindi pa ito inilalabas para sa komersyal na paggamit — pilot validation muna.",
  },

  "ph.coverage.title": { en: "Local regulatory coverage", fil: "Saklaw ng Lokal na Regulasyon" },
  "ph.coverage.contrib.title": {
    en: "Statutory contributions",
    fil: "Statutory contributions (SSS, PhilHealth, Pag-IBIG)",
  },
  "ph.coverage.contrib.body": {
    en: "Employer and employee shares computed from versioned contribution tables, with a full change history for every parameter.",
    fil: "Kalkulasyon ng share ng employer at employee mula sa versioned na contribution tables, na may kumpletong kasaysayan ng mga pagbabago sa parameters at pinagmulan ng bawat talahanayan.",
  },
  "ph.coverage.tax.title": { en: "BIR withholding tax", fil: "BIR withholding tax" },
  "ph.coverage.tax.body": {
    en: "Monthly withholding under the TRAIN schedule, including the exemption ceiling for 13th month pay and other benefits.",
    fil: "Buwanang withholding batay sa TRAIN schedule, kasama ang exemption ceiling para sa 13th month pay at iba pang benepisyo.",
  },
  "ph.coverage.thirteenth.title": { en: "13th month pay", fil: "13th month pay (PD 851)" },
  "ph.coverage.thirteenth.body": {
    en: "Pro-rata computation on basic earnings within the calendar year.",
    fil: "Pro-rata na kalkulasyon batay sa basic na kinita sa loob ng taon, kasama ang pagsubaybay sa deadline ng pagbabayad.",
  },
  "ph.coverage.leave.title": { en: "Leave entitlements", fil: "Mga leave entitlement" },
  "ph.coverage.leave.body": {
    en: "Service incentive leave and the statutory special leaves, tracked per employee.",
    fil: "Service incentive leave at ang mga statutory special leave, sinusubaybayan bawat empleyado ayon sa haba ng serbisyo.",
  },
  "ph.coverage.separation.title": {
    en: "Separation pay & due process",
    fil: "Separation pay at due process",
  },
  "ph.coverage.separation.body": {
    en: "Separation pay by ground for termination, with the notice and final-pay requirements surfaced as checks.",
    fil: "Separation pay ayon sa dahilan ng termination, kasama ang twin-notice at final pay bilang mga awtomatikong pagsusuri bago makumpirma ang rekord.",
  },
  "ph.coverage.filings.title": { en: "Deadlines & filings", fil: "Mga deadline at filing" },
  "ph.coverage.filings.body": {
    en: "Filing calendar and internally generated layouts — still pending validation against the official portals. Submission to government portals is done by your team, not automatically by the platform.",
    fil: "Kalendaryo ng mga deadline at mga layout na ginagawa sa loob ng sistema — hinihintay pa ang validation laban sa mga opisyal na portal. Ang aktwal na pagsusumite sa mga government portal ay ginagawa ng inyong team — hindi ito awtomatikong ipinapasa ng plataporma.",
  },

  "ph.validation.title": {
    en: "Automatic validation, not just calculation",
    fil: "Awtomatikong validation, hindi lang kalkulasyon",
  },
  "ph.validation.body": {
    en: "Every transaction passes through a deterministic validation engine that checks the required evidence before a record is confirmed — a separation is only recorded when the documentation required by law is complete.",
    fil: "Bawat transaksyon ay dumadaan sa deterministic validation engine na sinusuri ang kinakailangang ebidensya bago makumpirma ang anumang rekord — halimbawa, naitatala lang ang isang separation kapag kumpleto na ang dokumentasyong hinihingi ng batas.",
  },

  "ph.architecture.title": { en: "Architecture", fil: "Arkitektura" },
  "ph.architecture.core.title": { en: "Global Core", fil: "Global Core" },
  "ph.architecture.core.body": {
    en: "Cross-module orchestration, employee lifecycle, API gateway, audit trail and authentication — identical in every country.",
    fil: "Orkestrasyon ng mga modyul, employee lifecycle, API gateway, audit trail at authentication — pareho sa lahat ng bansa.",
  },
  "ph.architecture.pack.title": { en: "Country Pack PH", fil: "Country Pack PH" },
  "ph.architecture.pack.body": {
    en: "An isolated, cryptographically signed (Ed25519) module containing only Philippine labour and tax logic.",
    fil: "Hiwalay at cryptographically signed (Ed25519) na modyul na naglalaman lamang ng lohika ng batas paggawa at buwis ng Pilipinas.",
  },
  "ph.architecture.audit.title": { en: "Audit trail", fil: "Audit trail" },
  "ph.architecture.audit.body": {
    en: "Every calculation references the exact ruleset version that produced it, ready for inspection.",
    fil: "Bawat kalkulasyon ay may kaugnay na eksaktong bersyon ng ruleset na gumawa nito, handa para sa inspeksyon.",
  },

  "ph.cta.title": {
    en: "Prepare your payroll operations for the Philippines",
    fil: "Ihanda ang inyong payroll operations para sa Pilipinas",
  },
  "ph.cta.body": {
    en: "We are opening a limited collaboration with multi-entity employers, accounting firms and HR consultants in the Philippines who want to validate this infrastructure in a controlled pilot.",
    fil: "Nagbubukas kami ng limitadong kolaborasyon para sa mga multi-entity na employer, accounting firm at HR consultant sa Pilipinas na nais mag-validate ng imprastrukturang ito sa isang kontroladong pilot program.",
  },
  "ph.form.fullName": { en: "Full name", fil: "Buong pangalan" },
  "ph.form.email": { en: "Corporate email", fil: "Email ng kumpanya" },
  "ph.form.companyName": { en: "Entity / company name", fil: "Pangalan ng entity/kumpanya" },
  "ph.form.employeeRange": { en: "Estimated employee count", fil: "Tantyang bilang ng empleyado" },
  "ph.form.employeeRangePlaceholder": { en: "Select a range", fil: "Pumili ng saklaw" },
  "ph.form.role": { en: "Role", fil: "Posisyon" },
  "ph.form.rolePlaceholder": { en: "Select a role", fil: "Pumili ng posisyon" },
  "ph.form.consent": {
    en: "I agree to the privacy policy and to be contacted about the pilot programme.",
    fil: "Sumasang-ayon ako sa Patakaran sa Privacy at maaari akong kontakin tungkol sa pilot program.",
  },
  "ph.form.consentLink": { en: "privacy policy", fil: "Patakaran sa Privacy" },
  "ph.form.submit": { en: "Submit pilot access request", fil: "Ipadala ang request sa pilot" },
  "ph.form.success": {
    en: "Request received. We will contact you soon.",
    fil: "Natanggap ang inyong request. Makikipag-ugnayan kami sa lalong madaling panahon.",
  },
  "ph.form.error": {
    en: "Could not submit. Please try again.",
    fil: "Hindi naipadala. Pakisubukan muli.",
  },

  "ph.footer.tagline": {
    en: "B2B infrastructure for payroll compliance.",
    fil: "Imprastrakturang B2B para sa payroll compliance.",
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
  return (entry as Record<string, string | undefined>)[String(lang)] ?? entry.en;
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
