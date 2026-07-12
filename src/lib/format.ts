export function formatIDR(v: number): string {
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}

export function formatCurrency(v: number, currency = "IDR"): string {
  if (currency === "IDR") return formatIDR(v);
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v);
}

export function formatNumber(v: number): string {
  return Math.round(v).toLocaleString("id-ID");
}

export function formatPercent(v: number, digits = 2): string {
  return (v * 100).toFixed(digits) + "%";
}
