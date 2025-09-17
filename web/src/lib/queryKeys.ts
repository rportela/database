export const queryKeys = {
  clientProfile: (clientId: string) => ["clientProfile", clientId] as const,
  usageHistory: (clientId: string) => ["usageHistory", clientId] as const,
  planCatalog: ["planCatalog"] as const,
};
