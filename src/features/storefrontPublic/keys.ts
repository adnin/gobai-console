export const storefrontPublicKeys = {
  all: ["storefrontPublic"] as const,
  storefront: (slug: string) => [...storefrontPublicKeys.all, "storefront", slug] as const,
};