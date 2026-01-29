export const ALIPOST_API_ENDPOINTS = {
    CATEGORY: {
        findAll: (restaurantId: string) => `api/Integration/v1/menu/${restaurantId}/composition`
    },
    PRODUCT: {
        findAll: (restaurantId: string) => `api/Integration/v1/menu/${restaurantId}/composition`
    }
}