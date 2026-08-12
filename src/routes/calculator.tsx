import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy global calculator URL. The calculator is a Country Pack tool, so it
 * now lives under the pack it belongs to. Kept as a permanent redirect.
 */
export const Route = createFileRoute("/calculator")({
  beforeLoad: () => {
    throw redirect({
      to: "/packs/$country/calculator",
      params: { country: "indonesia" },
      statusCode: 301,
￼    });
  },
});
