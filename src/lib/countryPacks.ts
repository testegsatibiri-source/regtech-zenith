// Country Pack parameters — "Regulatory Update Service" layer.
// In production these values live in a config DB / edge config and are updated
// without a code deploy. Here they are versioned constants per country.

export interface IndonesiaParams {
  version: string;
  effectiveFrom: string;
  // Minimum wage (UMP) by province — IDR/month
  minimumWage: Record<string, number>;
  bpjs: {
    healthCap: number;
    health: { employee: number; employer: number };
    jht: { employee: number; employer: number }; // old age
    jp: { employee: number; employer: number }; // pension
    jpCap: number;
    jkk: number; // work accident (employer)
    jkm: number; // death (employer)
  };
  // Omnibus Law overtime limits
  overtime: { maxPerDay: number; maxPerWeek: number };
}

export const ID_PARAMS: IndonesiaParams = {
  version: "2024.1",
  effectiveFrom: "2024-01-01",
  minimumWage: {
    "DKI Jakarta": 5067381,
    "Jawa Barat": 2057495,
    "Jawa Tengah": 2036947,
    "Jawa Timur": 2165244,
    Banten: 2727812,
    Bali: 2813672,
    Other: 2000000,
  },
  bpjs: {
    healthCap: 12000000,
    health: { employee: 0.01, employer: 0.04 },
    jht: { employee: 0.02, employer: 0.037 },
    jp: { employee: 0.01, employer: 0.02 },
    jpCap: 10547400,
    jkk: 0.0024,
    jkm: 0.003,
  },
  overtime: { maxPerDay: 4, maxPerWeek: 18 },
};

export const COUNTRIES = [
  {
    code: "ID",
    name: "Indonesia",
    nameLocal: "Indonesia",
    currency: "IDR",
    flag: "🇮🇩",
    active: true,
  },
  {
    code: "MY",
    name: "Malaysia",
    nameLocal: "Malaysia",
    currency: "MYR",
    flag: "🇲🇾",
    active: false,
  },
  {
    code: "SG",
    name: "Singapore",
    nameLocal: "Singapura",
    currency: "SGD",
    flag: "🇸🇬",
    active: false,
  },
  {
    code: "PH",
    name: "Philippines",
    nameLocal: "Filipina",
    currency: "PHP",
    flag: "🇵🇭",
    active: false,
  },
  { code: "VN", name: "Vietnam", nameLocal: "Vietnam", currency: "VND", flag: "🇻🇳", active: false },
  {
    code: "TH",
    name: "Thailand",
    nameLocal: "Thailand",
    currency: "THB",
    flag: "🇹🇭",
    active: false,
  },
] as const;

// PTKP marital/dependent status options
export const MARITAL_STATUS = ["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"] as const;

export const RELIGIONS = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"] as const;
