export type ClickWebhookResponse = {
  error: string;
  error_note: string;
  click_trans_id?: string;
  merchant_trans_id?: string;
  merchant_prepare_id?: string;
  merchant_confirm_id?: string;
};
