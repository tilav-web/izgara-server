export const ALIPOST_API_ENDPOINTS = {
  ALIPOST: {
    findAll: (restaurantId: string) =>
      `api/Integration/v1/menu/${restaurantId}/composition`,
  },
  CATEGORY: {
    findAll: (restaurantId: string) =>
      `api/Integration/v1/menu/${restaurantId}/composition`,
  },
  PRODUCT: {
    findAll: (restaurantId: string) =>
      `api/Integration/v1/menu/${restaurantId}/composition`,
  },
};
