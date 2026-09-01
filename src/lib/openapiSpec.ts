// H2 — OpenAPI 3.0 spec for /api/public/v1/*. Now includes API key auth,
// rulesetVersion, schemaVersion, quotas, and deprecation notes.
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "UBoard Asia — Compliance OS Calculation API",
    description:
      "API-as-a-Service for Southeast Asia payroll and compliance. Isolated Rule Engines by CountryPack (Indonesia today; MY/SG/PH on roadmap). Every response carries a `schemaVersion` and a `rulesetVersion` so integrating ERPs (SAP, Workday, SuccessFactors) can pin behaviour deterministically.\n\n**Authentication** — Send `Authorization: Bearer sk_...` on every call. Requests without a key are rate-limited to 30 req/min per IP for demo purposes only. Contact sales for production keys.",
    version: "1.0.0",
    contact: { name: "UBoard Asia" },
  },
  servers: [{ url: "/", description: "Current host" }],
  security: [{ ApiKeyAuth: [] }],
  tags: [
    { name: "Tax Engine", description: "PPh 21 via TER (PP 58/2023)" },
    { name: "BPJS Engine", description: "Social security contributions" },
    { name: "System", description: "Health and observability" },
  ],
  paths: {
    "/api/public/v1/calculate-tax": {
      post: {
        tags: ["Tax Engine"],
        summary: "Calculate PPh 21 (income tax) via TER",
        operationId: "calculateTaxV1",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TaxRequest" },
              examples: {
                withNpwp: {
                  summary: "Married, 1 dependent, with NPWP",
                  value: {
                    monthlyGross: 15000000,
                    maritalStatus: "K/1",
                    hasNpwp: true,
                    country: "ID",
                  },
                },
                withoutNpwp: {
                  summary: "Single, no NPWP (20% surcharge)",
                  value: {
                    monthlyGross: 15000000,
                    maritalStatus: "TK/0",
                    hasNpwp: false,
                    country: "ID",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Calculation result",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/TaxResponse" } },
            },
          },
          "400": { $ref: "#/components/responses/BadJson" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/public/v1/calculate-bpjs": {
      post: {
        tags: ["BPJS Engine"],
        summary: "Calculate BPJS contributions",
        operationId: "calculateBpjsV1",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BpjsRequest" },
              examples: { standard: { value: { salary: 15000000, country: "ID" } } },
            },
          },
        },
        responses: {
          "200": {
            description: "Calculation result",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/BpjsResponse" } },
            },
          },
          "400": { $ref: "#/components/responses/BadJson" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/public/v1/health": {
      get: {
        tags: ["System"],
        summary: "Service health and active rulesets",
        operationId: "healthV1",
        security: [],
        responses: {
          "200": {
            description: "Health payload",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Health" } } },
          },
        },
      },
    },
    "/api/public/calculate-tax": {
      post: {
        tags: ["Tax Engine"],
        summary: "Deprecated — use /v1/calculate-tax",
        deprecated: true,
        operationId: "calculateTaxLegacy",
        responses: { "200": { description: "Deprecated alias." } },
      },
    },
    "/api/public/calculate-bpjs": {
      post: {
        tags: ["BPJS Engine"],
        summary: "Deprecated — use /v1/calculate-bpjs",
        deprecated: true,
        operationId: "calculateBpjsLegacy",
        responses: { "200": { description: "Deprecated alias." } },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "sk_live_...",
        description:
          "Provision a key from the /keys admin surface. Anonymous requests are rate-limited.",
      },
    },
    schemas: {
      TaxRequest: {
        type: "object",
        required: ["monthlyGross"],
        properties: {
          monthlyGross: { type: "number", minimum: 0, example: 15000000 },
          maritalStatus: {
            type: "string",
            enum: ["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"],
            default: "TK/0",
          },
          hasNpwp: { type: "boolean", default: true },
          country: { type: "string", enum: ["ID"], default: "ID" },
        },
      },
      TaxResponse: {
        type: "object",
        properties: {
          schemaVersion: { type: "string", example: "1" },
          engine: { type: "string", example: "PPh21-TER" },
          country: { type: "string", example: "ID" },
          rulesetVersion: { type: "string", example: "ID-2024.1" },
          input: { $ref: "#/components/schemas/TaxRequest" },
          result: {
            type: "object",
            properties: {
              terCategory: { type: "string", enum: ["A", "B", "C"] },
              effectiveRate: { type: "number" },
              npwpSurcharge: { type: "number" },
              tax: { type: "number" },
              currency: { type: "string" },
            },
          },
        },
      },
      BpjsRequest: {
        type: "object",
        required: ["salary"],
        properties: {
          salary: { type: "number", minimum: 0, example: 15000000 },
          country: { type: "string", enum: ["ID"], default: "ID" },
        },
      },
      BpjsResponse: {
        type: "object",
        properties: {
          schemaVersion: { type: "string" },
          engine: { type: "string" },
          country: { type: "string" },
          rulesetVersion: { type: "string" },
          input: { $ref: "#/components/schemas/BpjsRequest" },
          result: {
            type: "object",
            properties: {
              employee: { type: "object", additionalProperties: { type: "number" } },
              employer: { type: "object", additionalProperties: { type: "number" } },
              currency: { type: "string" },
            },
          },
        },
      },
      Health: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ok", "degraded"] },
          uptime_ms: { type: "number" },
          db: {
            type: "object",
            properties: {
              status: { type: "string" },
              latency_ms: { type: "number", nullable: true },
            },
          },
          rulesets: {
            type: "array",
            items: {
              type: "object",
              properties: { code: { type: "string" }, version: { type: "string" } },
            },
          },
          schemaVersion: { type: "string" },
        },
      },
      Error: { type: "object", properties: { error: { type: "string" } } },
    },
    responses: {
      BadJson: {
        description: "Malformed JSON body",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      Unauthorized: {
        description: "Missing/invalid API key",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      RateLimited: {
        description: "Rate limit or monthly quota exceeded",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      ValidationError: {
        description: "Input failed validation",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
  },
} as const;
