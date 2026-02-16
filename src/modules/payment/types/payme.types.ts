import { PaymeMethodEnum } from '../enums/payme-method.enum';

export type PaymeLocalizedMessage = {
  uz: string;
  ru: string;
  en: string;
};

export type PaymeError = {
  code: number;
  message: string | PaymeLocalizedMessage;
  data?: string;
};

export type PaymeSuccessResponse<T> = {
  result: T;
  id: number | null;
};

export type PaymeErrorResponse = {
  error: PaymeError;
  id: number | null;
};

export type PaymeRpcResponse<T = Record<string, unknown>> =
  | PaymeSuccessResponse<T>
  | PaymeErrorResponse;

export type ParsedRpcRequest = {
  method: PaymeMethodEnum;
  params: unknown;
  id: number | null;
};

export type AccountWithOrderId = {
  order_id: string;
};

export type CheckPerformParams = {
  amount: number;
  account: AccountWithOrderId;
};

export type CreateTransactionParams = {
  id: string;
  time: number;
  amount: number;
  account: AccountWithOrderId;
};

export type TransactionIdParams = {
  id: string;
};

export type CancelTransactionParams = {
  id: string;
  reason?: number;
};

export type GetStatementParams = {
  from: number;
  to: number;
};

export type SetFiscalDataParams = {
  id: string;
  type: 'PERFORM' | 'CANCEL';
  fiscal_data: Record<string, unknown>;
};
