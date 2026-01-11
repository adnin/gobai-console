import { apiFetch } from "@/lib/http";

export type MerchantAiGenerateRequest = {
  task: string;
  store_id?: number;
  locale?: string;
  tone?: string;
  constraints?: {
    max_chars?: number;
    include_hashtags?: boolean;
    avoid?: string[];
  };
  payload?: Record<string, any>;
};

export type MerchantAiGenerateResponse = {
  task?: string;
  result?: Record<string, any>;
  ai_meta?: Record<string, any>;
  rid?: string;
};

export async function merchantAiGenerate(
  token: string,
  payload: MerchantAiGenerateRequest
): Promise<MerchantAiGenerateResponse> {
  return apiFetch(`/merchant/ai/generate`, { method: "POST", token, body: JSON.stringify(payload) });
}
