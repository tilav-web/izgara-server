import { OrderStatusEnum } from '../../order/enums/order-status.enum';
import { IikoDeliveryStatus } from '../types/iiko.types';

export const IIKO_API_BASE_URL = 'https://api-ru.iiko.services';
export const IIKO_AUTH_TOKEN_TTL_MS = 14 * 60 * 1000;

export const IIKO_API_ENDPOINTS = {
  AUTH: {
    token: '/api/1/access_token',
  },
  ORGANIZATIONS: {
    findAll: '/api/1/organizations',
  },
  TERMINAL_GROUPS: {
    findAll: '/api/1/terminal_groups',
  },
  NOMENCLATURE: {
    findAll: '/api/1/nomenclature',
  },
  EXTERNAL_MENUS: {
    findAll: '/api/2/menu',
    findById: '/api/2/menu/by_id',
  },
  PAYMENT_TYPES: {
    findAll: '/api/1/payment_types',
  },
  ORDER_TYPES: {
    findAll: '/api/1/deliveries/order_types',
  },
  DELIVERIES: {
    create: '/api/1/deliveries/create',
    cancel: '/api/1/deliveries/cancel',
  },
  STOP_LISTS: {
    findAll: '/api/1/stop_lists',
  },
  WEBHOOKS: {
    settings: '/api/1/webhooks/settings',
    updateSettings: '/api/1/webhooks/update_settings',
  },
  COMMANDS: {
    status: '/api/1/commands/status',
  },
} as const;

export const IIKO_SOURCE_KEY = 'IZGARA_MOBILE';

export const IIKO_DELIVERY_STATUS_TO_ORDER_STATUS: Partial<
  Record<IikoDeliveryStatus, OrderStatusEnum>
> = {
  Unconfirmed: OrderStatusEnum.NEW,
  WaitCooking: OrderStatusEnum.IN_PROGRESS,
  ReadyForCooking: OrderStatusEnum.IN_PROGRESS,
  CookingStarted: OrderStatusEnum.IN_PROGRESS,
  CookingCompleted: OrderStatusEnum.READY,
  Waiting: OrderStatusEnum.READY,
  OnWay: OrderStatusEnum.ON_WAY,
  Delivered: OrderStatusEnum.DELIVERED,
  Closed: OrderStatusEnum.DELIVERED,
  Cancelled: OrderStatusEnum.CANCELLED,
};
