// H8-BO — Platform HTTP API. Thin createServerFn wrappers that:
//   1. Validate input with Zod.
//   2. Build a PlatformContext (roles + country scopes + correlation id).
//   3. Delegate to the Application Service.
//
// The UI must import these — never `@/sdk/*` directly. Any future CLI or
// automation reuses these same server fns.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPlatformContext } from "./service/context";
import { packsService } from "./service/packs";
import { releasesService, type ReleaseStatus } from "./service/releases";
import { parametersService } from "./service/parameters";
import { flagsService } from "./service/flags";
import { dashboardService } from "./service/dashboard";
import { auditService } from "./service/audit";

const CountryCode = z.string().regex(/^[A-Z]{2}$/);

// ---------- Dashboard ----------
export const getDashboardSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId);
    return dashboardService.snapshot(platform);
  });

// ---------- Packs ----------
export const listPacks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId);
    return packsService.list(platform);
  });

export const getPackDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { country: string }) => z.object({ country: CountryCode }).parse(data))
  .handler(async ({ data, context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId, {
      targetCountry: data.country,
    });
    return packsService.detail(platform, data.country);
  });

export const runPackHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { country: string }) => z.object({ country: CountryCode }).parse(data))
  .handler(async ({ data, context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId, {
      targetCountry: data.country,
    });
    return packsService.health(platform, data.country);
  });

export const recordPackInstallation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      country: string;
      packVersion: string;
      installedFrom?: "manual" | "pipeline" | "rollback" | "marketplace";
      manifestChecksum?: string | null;
      manifestSignature?: string | null;
      notes?: string;
    }) =>
      z
        .object({
          country: CountryCode,
          packVersion: z.string().min(1),
          installedFrom: z.enum(["manual", "pipeline", "rollback", "marketplace"]).optional(),
          manifestChecksum: z.string().nullable().optional(),
          manifestSignature: z.string().nullable().optional(),
          notes: z.string().max(500).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId, {
      targetCountry: data.country,
    });
    return packsService.recordInstallation(platform, data);
  });

// ---------- Releases ----------
export const listReleases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { country?: string; limit?: number }) =>
    z
      .object({
        country: CountryCode.optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId, {
      targetCountry: data.country,
    });
    return releasesService.list(platform, data);
  });

export const transitionRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; to: ReleaseStatus; notes?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        to: z.enum([
          "draft",
          "candidate",
          "approved",
          "released",
          "deprecated",
          "archived",
          "rolled_back",
        ]),
        notes: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId);
    return releasesService.transition(platform, data);
  });

// ---------- Parameters ----------
export const getRuntimeParameters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { country: string }) => z.object({ country: CountryCode }).parse(data))
  .handler(async ({ data, context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId, {
      targetCountry: data.country,
    });
    return parametersService.runtime(platform, data.country);
  });

export const listRegisterParameters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { country: string }) => z.object({ country: CountryCode }).parse(data))
  .handler(async ({ data, context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId, {
      targetCountry: data.country,
    });
    return parametersService.listRegister(platform, data.country);
  });

export const diffRegisterParameters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { country: string; parameterKey: string; versionA: number; versionB: number }) =>
      z
        .object({
          country: CountryCode,
          parameterKey: z.string().min(1),
          versionA: z.number().int().min(1),
          versionB: z.number().int().min(1),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId, {
      targetCountry: data.country,
    });
    return parametersService.diff(
      platform,
      data.country,
      data.parameterKey,
      data.versionA,
      data.versionB,
    );
  });

export const importParameters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { country: string; parameterKey: string; payload: unknown; notes?: string }) =>
      z
        .object({
          country: CountryCode,
          parameterKey: z.string().min(1),
          payload: z.unknown(),
          notes: z.string().max(500).optional(),
        })
        .parse(data) as { country: string; parameterKey: string; payload: unknown; notes?: string },
  )
  .handler(async ({ data, context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId, {
      targetCountry: data.country,
    });
    return parametersService.importSnapshot(platform, data);
  });

// ---------- Flags ----------
export const listFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { country?: string }) =>
    z.object({ country: CountryCode.optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId, {
      targetCountry: data.country,
    });
    return flagsService.list(platform, data.country);
  });

export const upsertFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      country: string;
      flag: string;
      enabled: boolean;
      rollout_percentage?: number;
      environment?: "preview" | "production" | "all";
      effective_from?: string | null;
      effective_to?: string | null;
    }) =>
      z
        .object({
          country: CountryCode,
          flag: z.string().min(1).max(100),
          enabled: z.boolean(),
          rollout_percentage: z.number().int().min(0).max(100).optional(),
          environment: z.enum(["preview", "production", "all"]).optional(),
          effective_from: z.string().nullable().optional(),
          effective_to: z.string().nullable().optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId, {
      targetCountry: data.country,
    });
    return flagsService.upsert(platform, data);
  });

// ---------- Audit ----------
export const listAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { country?: string; limit?: number; component?: string }) =>
    z
      .object({
        country: CountryCode.optional(),
        limit: z.number().int().min(1).max(500).optional(),
        component: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const platform = await buildPlatformContext(context.supabase, context.userId);
    return auditService.list(platform, data);
  });
