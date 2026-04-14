export type IikoHttpMethod = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';

export interface IikoAccessTokenResponse {
  correlationId: string;
  token: string;
}

export interface IikoAuthState extends IikoAccessTokenResponse {
  expiresAt: number;
}

export interface IikoOrganizationInfo {
  id: string;
  name: string;
  isDeleted?: boolean;
  isDisabled?: boolean;
  addressFormatType?: 'Legacy' | 'City' | 'International' | 'IntNoPostcode';
}

export interface IikoOrganizationsResponse {
  correlationId: string;
  organizations: IikoOrganizationInfo[];
}

export interface IikoTerminalGroup {
  id: string;
  name: string;
  isDeleted?: boolean;
  isDisabled?: boolean;
}

export interface IikoTerminalGroupsResponse {
  correlationId: string;
  terminalGroups: Array<{
    organizationId: string;
    items: IikoTerminalGroup[];
  }>;
}

export interface IikoNomenclatureGroup {
  id: string;
  name: string;
  parentGroup?: string | null;
  order?: number;
  isIncludedInMenu?: boolean;
  isGroupModifier?: boolean;
  isDeleted?: boolean;
}

export interface IikoProductCategory {
  id: string;
  name: string;
  isDeleted?: boolean;
}

export interface IikoPrice {
  currentPrice?: number | null;
  isIncludedInMenu?: boolean;
}

export interface IikoSizePrice {
  sizeId?: string | null;
  price?: IikoPrice | null;
}

export interface IikoChildModifierInfo {
  id: string;
  minAmount?: number;
  maxAmount?: number;
  defaultAmount?: number | null;
  required?: boolean | null;
}

export interface IikoGroupModifierInfo {
  id: string;
  minAmount: number;
  maxAmount: number;
  required: boolean;
  childModifiers: IikoChildModifierInfo[];
}

export interface IikoSimpleModifierInfo {
  id: string;
  minAmount: number;
  maxAmount: number;
  required?: boolean | null;
}

export interface IikoNomenclatureProduct {
  id: string;
  name: string;
  description?: string | null;
  type?: 'dish' | 'good' | 'modifier' | string | null;
  groupId?: string | null;
  productCategoryId?: string | null;
  parentGroup?: string | null;
  measureUnit?: string | null;
  weight?: number | null;
  order?: number | null;
  sizePrices?: IikoSizePrice[] | null;
  modifiers?: IikoSimpleModifierInfo[] | null;
  groupModifiers?: IikoGroupModifierInfo[] | null;
  isDeleted?: boolean;
}

export interface IikoNomenclatureResponse {
  correlationId: string;
  groups: IikoNomenclatureGroup[];
  productCategories: IikoProductCategory[];
  products: IikoNomenclatureProduct[];
  revision: number;
}

// ── External Menu types ──

export interface IikoExternalMenusResponse {
  correlationId: string;
  externalMenus: Array<{ id: string; name: string }>;
}

export interface IikoExternalMenuModifierGroup {
  itemGroupId?: string | null;
  name: string;
  description?: string;
  restrictions?: {
    minQuantity?: number;
    maxQuantity?: number;
    freeQuantity?: number;
    byDefault?: number;
  } | null;
  canBeDivided?: boolean;
  childModifiersHaveMinMaxRestrictions?: boolean;
  items: IikoExternalMenuModifierItem[];
}

export interface IikoExternalMenuModifierItem {
  itemId: string;
  name: string;
  description?: string;
  restrictions?: Array<{
    minQuantity?: number;
    maxQuantity?: number;
    freeQuantity?: number;
    byDefault?: number;
  }> | null;
  prices: Array<{ price: number }>;
  portionWeightGrams?: number;
}

export interface IikoExternalMenuItemSize {
  sizeId?: string | null;
  sizeName?: string | null;
  isDefault?: boolean;
  portionWeightGrams?: number;
  prices: Array<{ price: number }>;
  itemModifierGroups: IikoExternalMenuModifierGroup[];
}

export interface IikoExternalMenuItem {
  itemId: string;
  name: string;
  description?: string;
  itemSizes: IikoExternalMenuItemSize[];
  measureUnit?: string;
  orderItemType?: string;
}

export interface IikoExternalMenuCategory {
  id?: string | null;
  name: string;
  description?: string;
  buttonImageUrl?: string | null;
  items: IikoExternalMenuItem[];
}

export interface IikoExternalMenuResponse {
  id: number;
  name: string;
  itemCategories: IikoExternalMenuCategory[];
}

export type IikoDeliveryStatus =
  | 'Unconfirmed'
  | 'WaitCooking'
  | 'ReadyForCooking'
  | 'CookingStarted'
  | 'CookingCompleted'
  | 'Waiting'
  | 'OnWay'
  | 'Delivered'
  | 'Closed'
  | 'Cancelled';

export interface IikoCreateDeliveryResponse {
  correlationId: string;
  orderInfo?: {
    id: string;
    posId?: string | null;
    creationStatus?: string;
    order?: {
      id?: string | null;
      number?: string | null;
      externalNumber?: string | null;
      status?: IikoDeliveryStatus;
    } | null;
  };
}

export interface IikoCommandResponse {
  correlationId: string;
}

export interface IikoStopListItem {
  balance: number;
  productId: string;
  sizeId?: string | null;
  sku?: string | null;
}

export interface IikoStopListsResponse {
  correlationId: string;
  terminalGroupStopLists: Array<{
    organizationId: string;
    items: Array<{
      terminalGroupId: string;
      items: IikoStopListItem[];
    }>;
  }>;
}

export interface IikoWebhookEvent {
  eventType: string;
  eventTime?: string;
  organizationId?: string;
  correlationId?: string;
  eventInfo?: {
    id?: string;
    terminalGroupsStopListsUpdates?: Array<{
      id: string;
      isFull: boolean;
    }>;
    order?: {
      id?: string | null;
      number?: string | null;
      externalNumber?: string | null;
      status?: IikoDeliveryStatus;
    } | null;
  };
}
