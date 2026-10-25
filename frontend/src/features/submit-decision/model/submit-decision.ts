import { apiRequest } from "@/shared/api";

export type TeamDecisionDraft = {
  sessionId: string;
  round: number;
  teamName: string;
  selections: Record<string, string>;
  marketingBudget: number;
  marketingChannel: "ads_search" | "ads_social";
  rationale: string;
};

export async function saveTeamDecision(decision: TeamDecisionDraft): Promise<{ revision: number; idempotent_replay: boolean }> {
  const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return apiRequest(`/sessions/${encodeURIComponent(decision.sessionId)}/rounds/${decision.round}/decision`, {
    method: "PUT",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      price: Number(decision.selections.price.replace(/[^0-9]/g, "")),
      cms_option: decision.selections.cms === "Расширенная" ? "platform_extended" : "platform_basic",
      payment_option: decision.selections.payment === "С резервом" ? "payment_reserve" : "payment_standard",
      delivery_option: decision.selections.delivery === "Ускоренная" ? "delivery_express" : "delivery_standard",
      marketing_channel: decision.marketingChannel,
      marketing_budget: decision.marketingBudget,
      rationale: decision.rationale,
    }),
  });
}
