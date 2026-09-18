// H25-PH — Dynamic status label mapping for the Philippines landing.
// These labels are the only hardcoded status strings; components bind the
// value returned here from the runtime pack status.
export function phStatusLabel(status: string): string {
  switch (status) {
    case "production":
      return "Nasa Produksyon";
    case "beta":
    case "validation":
    case "preview":
      return "Nasa Validation";
    case "experimental":
      return "Eksperimental";
    case "unavailable":
      return "Hindi available ang status";
    case "deprecated":
      return "Hindi na ginagamit";
    default:
      return "Nasa Validation";
  }
}

export function phStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "production":
      return "default";
    case "beta":
    case "validation":
    case "preview":
      return "secondary";
    case "experimental":
      return "outline";
    case "unavailable":
      return "outline";
    case "deprecated":
      return "destructive";
    default:
      return "secondary";
  }
}
