export type ProxyResponse = {
  status: number;
  body: string;
  final_url?: string | null;
  response_headers?: string[] | null;
  request_headers?: string[] | null;
};

