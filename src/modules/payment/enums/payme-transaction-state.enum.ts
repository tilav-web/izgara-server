export enum PaymeTransactionStateEnum {
  CREATED = 1,
  PERFORMED = 2,
  CANCELLED_FROM_CREATED = -1,
  CANCELLED_FROM_PERFORMED = -2,
}
