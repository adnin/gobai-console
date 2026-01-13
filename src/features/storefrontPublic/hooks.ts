import { useQuery } from "@tanstack/react-query";
import { getPublicStorefront } from "./api/storefrontPublicApi";
import { storefrontPublicKeys } from "./keys";

export function usePublicStorefront(slug: string) {
  return useQuery({
    queryKey: storefrontPublicKeys.storefront(slug),
    queryFn: () => getPublicStorefront(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes - matches backend caching
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}