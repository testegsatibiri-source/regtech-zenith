// OpenAPI 3.0 spec for the UBoard Asia public calculation API.
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "UBoard Asia — Calculation Engine API",
    description:
      "API-as-a-Service for Indonesia payroll calculations. Isolated Rule Engines (PPh 21 / TER and BPJS) that global ERPs (SAP, Workday, SuccessFactors) can call to localize Southeast Asian payroll. Parameters follow Indonesia Country Pack v2024.1.",
    version: "1.0.0",
    contact: { name: "UBoard Asia" },
  },
  servers: [
    { url: "/", description: "Current host" },
  ],
  tags: [
    { name: "Tax Engine", description: "PPh 21 via TER (PP 58/2023)" },
    { name: "BPJS Engine", description: "Social security contributions" },
  ],
  paths: {
    "/api/public/calculate-tax": {
      post: {
        tags: ["Tax Engine"],
        summary: "Calculate PPh 21 (income tax) via TER",
        description:
          "Returns the monthly PPh 21 using the Tarif Efektif Rata-rata (TER) method. TER category is derived from marital/dependent status. A 20% surcharge is applied when the employee has no NPWP.",
        operationId: "calculateTax",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TaxRequest" },
              examples: {
                withNpwp: {
                  summary: "Married, 1 dependent, with NPWP",
                  value: { monthlyGross: 15000000, maritalStatus: "K/1", hasNpwp: true },
                },
                withoutNpwp: {
                  summary: "Single, no NPWP (20% surcharge)",
                  value: { monthlyGross: 15000000, maritalStatus: "TK/0", hasNpwp: false },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Calculation result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaxResponse" },
                example: {
                  engine: "PPh21-TER",
                  country: "ID",
                  input: { monthlyGross: 15000000, maritalStatus: "K/1", hasNpwp: true },
                  result: {
                    terCategory: "B",
                    effectiveRate: 0.06,
                    npwpSurcharge: 0,
                    tax: 900000,
                    currency: "IDR",
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadJson" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/public/calculate-bpjs": {
      post: {
        tags: ["BPJS Engine"],
        summary: "Calculate BPJS contributions",
        description:
          "Returns employee and employer BPJS contributions (Health, JHT, JP, JKK, JKM) applying the configured salary caps from the Indonesia Country Pack.",
        operationId: "calculateBpjs",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BpjsRequest" },
              examples: {
                standard: {
                  summary: "Salary of IDR 15,000,000",
                  value: { salary: 15000000 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Calculation result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BpjsResponse" },
                example: {
                  engine: "BPJS",
                  country: "ID",
                  input: { salary: 15000000 },
                  result: {
                    employee: { health: 120000, jht: 300000, jp: 105474, total: 525474 },
                    employer: { health: 480000, jht: 555000, jp: 210948, jkk: 36000, jkm: 45000, total: 1326948 },
                    currency: "IDR",
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadJson" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
  },
  components: {
    schemas: {
      TaxRequest: {
        type: "object",
        required: ["monthlyGross"],
        properties: {
          monthlyGross: { type: "number", minimum: 0, description: "Monthly gross salary in IDR", example: 15000000 },
          maritalStatus: {
            type: "string",
            enum: ["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"],
            default: "TK/0",
            description: "PTKP marital/dependent status",
          },
          hasNpwp: { type: "boolean", default: true, description: "Whether the employee has a tax ID (NPWP)" },
        },
      },
      TaxResponse: {
        type: "object",
        properties: {
          engine: { type: "string", example: "PPh21-TER" },
          country: { type: "string", example: "ID" },
          input: { $ref: "#/components/schemas/TaxRequest" },
          result: {
            type: "object",
            properties: {
              terCategory: { type: "string", enum: ["A", "B", "C"] },
              effectiveRate: { type: "number", example: 0.06 },
              npwpSurcharge: { type: "number", example: 0 },
              tax: { type: "number", example: 900000 },
              currency: { type: "string", example: "IDR" },
            },
          },
        },
      },
      BpjsRequest: {
        type: "object",
        required: ["salary"],
        properties: {
          salary: { type: "number", minimum: 0, description: "Monthly base salary in IDR", example: 15000000 },
        },
      },
      BpjsResponse: {
        type: "object",
        properties: {
          engine: { type: "string", example: "BPJS" },
          country: { type: "string", example: "ID" },
          input: { $ref: "#/components/schemas/BpjsRequest" },
          result: {
            type: "object",
            properties: {
              employee: { $ref: "#/components/schemas/BpjsEmployee" },
              employer: { $ref: "#/components/schemas/BpjsEmployer" },
              currency: { type: "string", example: "IDR" },
            },
          },
        },
      },
      BpjsEmployee: {
        type: "object",
        properties: {
          health: { type: "number", example: 120000 },
          jht: { type: "number", example: 300000 },
          jp: { type: "number", example: 105474 },
          total: { type: "number", example: 525474 },
        },
      },
      BpjsEmployer: {
        type: "object",
        properties: {
          health: { type: "number", example: 480000 },
          jht: { type: "number", example: 555000 },
          jp: { type: "number", example: 210948 },
          jkk: { type: "number", example: 36000 },
          jkm: { type: "number", example: 45000 },
          total: { type: "number", example: 1326948 },
        },
      },
      ValidationErrorBody: {
        type: "object",
        properties: {
          error: { type: "string", example: "Invalid input" },
          details: { type: "object", description: "Zod flattened field errors" },
        },
      },
      BadJsonBody: {
        type: "object",
        properties: { error: { type: "string", example: "Invalid JSON body" } },
      },
    },
    responses: {
      BadJson: {
        description: "Malformed JSON body",
        content: { "application/json": { schema: { $ref: "#/components/schemas/BadJsonBody" } } },
      },
      ValidationError: {
        description: "Input failed validation",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationErrorBody" } } },
      },
    },
  },
} as const;
