export const ORDER_SOCKET_EVENTS = {
  HANDLE_ORDER: 'handle_order',
  HANDLE_NOTIFICATION: 'handle_notification',
};

export enum OrderNotificationStatusEnum {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type OrderNotificationPayload = {
  title: string;
  order_id: string;
  message: string;
  status: OrderNotificationStatusEnum;
  time: string;
};
