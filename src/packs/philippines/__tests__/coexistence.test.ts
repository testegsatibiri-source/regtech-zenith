// Coexistence — proves no shared global state between packs on a single Runtime.
import { describe, expect, it } from "vitest";
import { CountryRuntime } from "@/sdk";
import "@/sdk/bootstrap"; // registers ID + MY
import { philippinesPack } from "..";

// Install PH once; other packs are already installed by bootstrap.
CountryRuntime.tryInstall(philippinesPack);

describe("[Runtime] multi-pack coexistence", () => {
  it("ID, MY and PH all coexist on the same Runtime instance", () => {
    const list = CountryRuntime.list().map((r) => r.pack.manifest.country).sort();
    expect(list).toEqual(["ID", "MY", "PH"]);
    expect(CountryRuntime.find("ID")).toBeTruthy();
    expect(CountryRuntime.find("PH")).toBeTruthy();
    expect(CountryRuntime.find("MY")).toBeTruthy(); // stub degraded but resolvable
  });

  it("Interleaved tax calls: ID → PH → ID produce identical ID output", () => {
    const idTax = CountryRuntime.get("ID").providers.tax!;
    const phTax = CountryRuntime.get("PH").providers.tax!;
    const idInput = { monthlyGross: 10_000_000, maritalStatus: "TK/0", hasNpwp: true };

    const a = idTax.calculate(idInput);
    phTax.calculate({ monthlyGross: 30_000, maritalStatus: "single", hasNpwp: true });
    const b = idTax.calculate(idInput);

    expect(b).toEqual(a);
  });

  it("Interleaved payroll calls: ID → PH → ID produce identical ID output", () => {
    const idPay = CountryRuntime.get("ID").providers.payroll!;
    const phPay = CountryRuntime.get("PH").providers.payroll!;
    const idInput = { baseSalary: 15_000_000, maritalStatus: "TK/0", hasNpwp: true };

    const a = idPay.buildPayslip(idInput);
    phPay.buildPayslip({ baseSalary: 50_000, maritalStatus: "single", hasNpwp: true });
    const b = idPay.buildPayslip(idInput);

    expect(b).toEqual(a);
  });

  it("MY.health() (stub) does not affect ID/PH health", async () => {
    await CountryRuntime.health("MY");
    const idH = await CountryRuntime.health("ID");
    const phH = await CountryRuntime.health("PH");
    expect(idH.status === "ok" || idH.status === "warn").toBe(true);
    expect(phH.status === "ok" || phH.status === "warn").toBe(true);
  });

  it("ProviderContext for PH does not leak ID providers", () => {
    const ctx = CountryRuntime.contextFor("PH");
    expect(ctx.country).toBe("PH");
    // PH siblings are PH's providers only — not ID's tax
    const phTax = ctx.siblings.tax;
    const idTax = CountryRuntime.get("ID").providers.tax;
    expect(phTax).not.toBe(idTax);
    // Foreign lookup available on demand, still opt-in
    const foreignIdTax = ctx.foreign?.("ID", "tax");
    expect(foreignIdTax).toBe(idTax);
  });

  it("PH payroll composed via ctx.siblings uses PH tax (not ID tax)", () => {
    const ctx = CountryRuntime.contextFor("PH");
    const phPay = CountryRuntime.get("PH").providers.payroll!;
    const slip = phPay.buildPayslip({ baseSalary: 50_000, maritalStatus: "single", hasNpwp: true }, ctx);
    // PH tax for ₱50k gross is in the 20% bracket, roughly ₱5,208
    expect(slip.tax.tax).toBeGreaterThan(5_000);
    expect(slip.tax.tax).toBeLessThan(5_400);
  });
});
