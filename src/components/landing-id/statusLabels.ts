// H17-ID — Dynamic status label mapping for the Indonesia landing.
// These labels are the only hardcoded status strings; components bind the
// value returned here from the runtime pack status.
export function idStatusLabel(status: string): string {
  switch (status) {
    case "production":
      return "Produksi";
    case "beta":
    case "validation":
    case "preview":
      return "Dalam Validasi";
    case "experimental":
      return "Eksperimental";
    case "deprecated":
      return "Usang";
    default:
      return "Dalam Validasi";
  }
}

export function idStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "production":
      return "default";
    case "beta":
    case "validation":
    case "preview":
      return "secondary";
    case "experimental":
      return "outline";
    case "deprecated":
      return "destructive";
    default:
      return "secondary";
  }
}
