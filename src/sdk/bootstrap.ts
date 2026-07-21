// H5 — Bootstrap: register built-in country packs with the Runtime.
import { CountryRuntime } from "@/sdk";
import { indonesiaPack } from "@/packs/indonesia";
import { malaysiaPack } from "@/packs/malaysia";
import { philippinesPack } from "@/packs/philippines";

let bootstrapped = false;

export function bootstrapPacks(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  CountryRuntime.tryInstall(indonesiaPack);
  CountryRuntime.tryInstall(malaysiaPack);
  CountryRuntime.tryInstall(philippinesPack);
}

bootstrapPacks();
