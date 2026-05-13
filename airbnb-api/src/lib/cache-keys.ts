// Centralized cache key factory
// All cache keys defined here — never hardcode keys in services
// Changing a key structure means changing it in exactly one place
const buildQueryString = (filters: Record<string, unknown>): string => {
  return new URLSearchParams(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b)) // sort keys = deterministic regardless of insertion order
      .map(([k, v]) => [k, String(v)])
  ).toString();
};

export const CacheKeys = {
  properties: {
    list: (filters: Record<string, unknown>) =>
      `properties:list:${buildQueryString(filters)}`,
    detail: (id: string) =>
      `properties:detail:${id}`,
    byHost: (hostId: string) =>
      `properties:host:${hostId}`,
    patterns: {
      allLists: 'properties:list:*',
      detail: (id: string) => `properties:detail:${id}`,
      byHost: (hostId: string) => `properties:host:${hostId}`,
    },
  },

  bookings: {
    byProperty: (propertyId: string, filters: Record<string, unknown> = {}) =>
      `bookings:property:${propertyId}:${buildQueryString(filters)}`,
    byGuest: (guestId: string, filters: Record<string, unknown> = {}) =>
      `bookings:guest:${guestId}:${buildQueryString(filters)}`,
    detail: (id: string) =>
      `bookings:detail:${id}`,
    patterns: {
      byProperty: (propertyId: string) => `bookings:property:${propertyId}:*`,
      byGuest: (guestId: string) => `bookings:guest:${guestId}:*`,
    },
  },

  reviews: {
    byProperty: (propertyId: string) =>
      `reviews:property:${propertyId}`,
    patterns: {
      byProperty: (propertyId: string) => `reviews:property:${propertyId}`,
    },
  },

  users: {
    profile: (id: string) => `users:profile:${id}`,
    patterns: {
      profile: (id: string) => `users:profile:${id}`,
    },
  },
};
