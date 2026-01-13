import { apiFetch } from "@/lib/http";
import type { PublicStorefrontResponse } from "../types/storefrontPublic";

export async function getPublicStorefront(slug: string): Promise<PublicStorefrontResponse> {
  return apiFetch<PublicStorefrontResponse>(`/v1/public-storefronts/${encodeURIComponent(slug)}`, {
    method: "GET",
  });
}