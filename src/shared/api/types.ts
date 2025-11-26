export type ProxyResponse = {
  status: number;
  body: string;
  final_url?: string | null;
  response_headers?: string[] | null;
  request_headers?: string[] | null;
};

export type DbStatus = {
  configured: boolean;
  path: string;
  exists: boolean;
  sizeBytes?: number | null;
  tables: string[];
};

export type HasUsersResponse = {
  hasUsers: boolean;
};

export type User = {
  id: string;
  provider: AccountProvider;
  alias: string;
  curl: string;
  createdAt: string;
  updatedAt: string;
};

export type UserListResponse = {
  users: User[];
};

export type AccountProvider = "naver" | "coupang";

export type CredentialMap = Record<string, string>;

export type PaymentItem = {
  lineNo: number;
  productName: string;
  imageUrl?: string | null;
  infoUrl?: string | null;
  quantity: number;
  unitPrice?: number | null;
  lineAmount?: number | null;
  restAmount?: number | null;
  memo?: string | null;
};

export type NaverPaymentListItem = {
  id: number;
  payId: string;
  externalId?: string | null;
  serviceType?: string | null;
  statusCode?: string | null;
  statusText?: string | null;
  statusColor?: string | null;
  paidAt: string;
  purchaserName?: string | null;
  merchantName: string;
  productName?: string | null;
  productCount?: number | null;
  totalAmount: number;
  discountAmount?: number | null;
  items: PaymentItem[];
};

export type CoupangPaymentItem = {
  lineNo: number;
  productId?: string | null;
  vendorItemId?: string | null;
  productName: string;
  imageUrl?: string | null;
  infoUrl?: string | null;
  brandName?: string | null;
  quantity: number;
  unitPrice?: number | null;
  discountedUnitPrice?: number | null;
  combinedUnitPrice?: number | null;
  lineAmount?: number | null;
  restAmount?: number | null;
  memo?: string | null;
};

export type CoupangPaymentListItem = {
  id: number;
  orderId: string;
  externalId?: string | null;
  statusCode?: string | null;
  statusText?: string | null;
  statusColor?: string | null;
  orderedAt: string;
  paidAt?: string | null;
  merchantName: string;
  merchantTel?: string | null;
  merchantUrl?: string | null;
  merchantImageUrl?: string | null;
  productName?: string | null;
  productCount?: number | null;
  totalAmount: number;
  totalOrderAmount?: number | null;
  totalCancelAmount?: number | null;
  discountAmount?: number | null;
  restAmount?: number | null;
  mainPayType?: string | null;
  items: CoupangPaymentItem[];
};

