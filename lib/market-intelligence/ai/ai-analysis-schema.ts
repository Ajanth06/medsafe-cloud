import { z } from "zod";

const evidenceRefSchema = z.object({
  type: z.enum(["NEWS", "MARKET", "OFFICIAL"]),
  id: z.string(),
  label: z.string().optional(),
});

const watchItemSchema = z.object({
  type: z.enum([
    "OFFICIAL_CONFIRMATION",
    "MARKET_LEVEL",
    "SECONDARY_MARKET_CONFIRMATION",
    "COUNTERPARTY_RESPONSE",
    "SUPPLY_DISRUPTION",
    "MACRO_RELEASE",
    "NEWS_CONFIRMATION",
  ]),
  description: z.string().min(1),
  relatedAsset: z.string().optional(),
  relatedEntity: z.string().optional(),
  priority: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  resolved: z.boolean(),
});

export const aiProviderResponseSchema = z.object({
  summary: z.string().min(1),
  marketRegime: z.enum([
    "RISK_ON",
    "RISK_OFF",
    "INFLATIONARY",
    "DEFLATIONARY",
    "LIQUIDITY_DRIVEN",
    "ENERGY_SHOCK",
    "GEOPOLITICAL_RISK",
    "MACRO_EVENT",
    "MIXED",
    "NEUTRAL",
    "UNCERTAIN",
  ]),
  possibleCauseDescription: z.string().min(1),
  causalityStatus: z.enum([
    "UNKNOWN",
    "POSSIBLE",
    "LIKELY",
    "HIGHLY_LIKELY",
    "CONFIRMED_DIRECT",
  ]),
  alternativeExplanations: z.array(z.string()),
  impactAssessment: z.string().min(1),
  interpretations: z.array(z.string()).min(1),
  sourceAssessment: z.string().min(1),
  keyRisks: z.array(z.string()),
  whatToWatchNext: z.array(watchItemSchema).min(1),
  moveAssessment: z.string(),
});

export type AIProviderResponse = z.infer<typeof aiProviderResponseSchema>;

export function validateAIResponse(data: unknown): {
  success: boolean;
  data?: AIProviderResponse;
  error?: string;
} {
  const result = aiProviderResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((i) => i.message).join("; "),
  };
}

export { evidenceRefSchema, watchItemSchema };
