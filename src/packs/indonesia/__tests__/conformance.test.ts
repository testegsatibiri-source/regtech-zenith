// H6 — Indonesia conformance suite. Run: `bun test src/packs/`.
import * as path from "node:path";
import { indonesiaPack } from "@/packs/indonesia";
import {
  runManifestSuite,
  runTaxProviderSuite,
  runBenefitsProviderSuite,
  runIsolationSuite,
  ID_TAX_CASES,
  ID_BENEFITS_CASES,
} from "@/sdk/testkit";

runManifestSuite(indonesiaPack);
runTaxProviderSuite(indonesiaPack, ID_TAX_CASES);
runBenefitsProviderSuite(indonesiaPack, ID_BENEFITS_CASES);
runIsolationSuite(indonesiaPack, path.resolve(__dirname, ".."));
