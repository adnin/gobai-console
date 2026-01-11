import { apiFetch } from "@/lib/http";

export type MyOnboarding = {
  data: {
    role?: string | null;
    driver_profile?: { id: number; status: string; rejection_reason?: string | null } | null;
    merchant_profile?: { id: number; status: string; rejection_reason?: string | null } | null;
    partner_profile?: { id: number; status: string; rejection_reason?: string | null } | null;
  };
};

export type PartnerApplyInput = {
  business_name: string;
  facebook_page_url?: string;
  service_area?: string;
};

export async function getMyOnboarding(token: string): Promise<MyOnboarding> {
  return apiFetch<MyOnboarding>("/me/onboarding", { method: "GET", token });
}

export async function partnerApply(token: string, input: PartnerApplyInput): Promise<any> {
  return apiFetch("/onboarding/partner/apply", {
    method: "POST",
    token,
    body: JSON.stringify({
      business_name: input.business_name,
      facebook_page_url: input.facebook_page_url ?? "",
      service_area: input.service_area ?? "",
    }),
  });
}
