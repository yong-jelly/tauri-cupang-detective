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

