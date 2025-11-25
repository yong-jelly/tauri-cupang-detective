import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type ProxyResponse = {
  status: number;
  body: string;
  final_url?: string | null;
  response_headers?: string[] | null;
  request_headers?: string[] | null;
};

const DEFAULT_CURL = `curl 'https://orders.pay.naver.com/orderApi/payment/detail/category?paymentId=20221230NP5141271741' \\
  -H 'accept: application/json, text/plain, */*' \\
  -H 'accept-language: ko,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7,zh;q=0.6,lus;q=0.5' \\
  -H 'baggage: sentry-environment=real,sentry-release=instant-pay%4025.11.12%2Be7de901-real,sentry-public_key=64e735322b4247dfaaf3ea0834715c04,sentry-trace_id=0cee1dba728b48699b237378bfdd3e66,sentry-sample_rate=0.2,sentry-sampled=false' \\
  -b 'NNB=GXI7O2DD75SGO; nstore_session=ssAtk+AbZ0yt7mf+2uEW1n9n; nstore_pagesession=jvgoFsqQibXI1ssKAKZ-077114; ASID=7958f64f000001970ead142400000023; NAC=HJLgBcAIz06h; m_loc=6f49fa71ff9eae5e5f2328d20c78a4c1915a0b9db1e58db5bdef74ef411fdde2; NV_WETR_LAST_ACCESS_RGN_M="MDkyMDA1MjA="; NV_WETR_LOCATION_RGN_M="MDkyMDA1MjA="; SRT30=1764027852; nid_inf=1446589520; NID_AUT=48qvM+vEWe3Ovp8VGhe5wVXBt7iJb4lTfz41BSu+31Nmne4DpB4wKIK0kG3O7skR; NACT=1; SRT5=1764028654; NID_SES=AAABwmmItBZRd/dPXv7BbGLQGZ5D1kqLflEzNCSJHVae7NjP6CMGd6vBFoK3aVVK9A/pqjj93u5ysNCbJqtJG7mAAxHLKkkA4F1IhvuJbcZ1DybrZDPcMJSImqLuolpDTLBzJt3dTGXg30iKUy5V1KxmcrvkO4pljKxMLp04O4VkhNTpp3HcT0ila8ag9dNJHicd5dgFgOGe/jvyFBjWJatz0LdYWkrG73qVZ2pHqGH48Uwa1rS4HKyXHVuVaeHr/1CoTx8Xj6MDbFEkKMZPpQaXaH4gFXrXifdNrCK9SiVfpLeePbAWq+K6VjjY5ptflBvsFXgJt3kup/HgNFPpWBUkWhkNpf+BlZ9D143V17q6i2Aa7z4lOnS8iVXcToUK9+xHPi9hMck6tCAk1RnyLmPjuIsCxkJRDZuSrFrBvS6NARnjyaRdQF4uWfpoeuK/pdeoWZNYVqtfUhHgcX3XNs3TEZJ0ZGDUPBeIA01g2W81ab57b2Z8ucdxvIJ3OzIOA79+dq/6Ar0WLpAJqk543uueOgdVb/9HbHKxMrNuqHuXPAIUM5M8L51lAUfXGC9oai9WaAu/+oG6Yk83zhnbXjdD1UhB24Yg7c6DJR+rUU+mOZXa; BUC=VwJatVPrZyG-oRiWNI4F4HUhDU9iKGXphOQZiu2MmNM=' \\
  -H 'priority: u=1, i' \\
  -H 'referer: https://orders.pay.naver.com/instantPay/detail/20221230NP5141271741?backUrl=https%3A%2F%2Fpay.naver.com%2Fpc%2Fhistory' \\
  -H 'sec-ch-ua: "Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"' \\
  -H 'sec-ch-ua-mobile: ?0' \\
  -H 'sec-ch-ua-platform: "macOS"' \\
  -H 'sec-fetch-dest: empty' \\
  -H 'sec-fetch-mode: cors' \\
  -H 'sec-fetch-site: same-origin' \\
  -H 'sentry-trace: 0cee1dba728b48699b237378bfdd3e66-8167513219738630-0' \\
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'`;

export const PlaygroundPage = () => {
  const [curlCommand, setCurlCommand] = useState(DEFAULT_CURL);
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<string[]>([]);
  const [requestHeaders, setRequestHeaders] = useState<string[]>([]);

  // Helper to parse curl command
  const parseCurl = (curl: string) => {
    let url = "";
    let method = "GET";
    const headers: Record<string, string> = {};

    // Normalize curl command: remove newlines and backslashes
    const normalizedCurl = curl.replace(/\\\n/g, " ").replace(/[\r\n]+/g, " ").trim();

    // Extract URL (first quoted string after 'curl')
    // Supports both single and double quotes
    const urlMatch = normalizedCurl.match(/curl\s+(?:-X\s+\w+\s+)?['"]([^'"]+)['"]/);
    if (urlMatch) {
      url = urlMatch[1];
    }

    // Extract Method (-X POST or implied by -d)
    const methodMatch = normalizedCurl.match(/-X\s+([A-Z]+)/);
    if (methodMatch) {
      method = methodMatch[1];
    } else if (normalizedCurl.includes(" -d ") || normalizedCurl.includes(" --data ")) {
      method = "POST";
    }

    // Extract Headers (-H 'Key: Value')
    // Handles both single and double quotes, and ignores whitespace around colon
    // Using global flag with exec loop to handle multiple matches correctly
    const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = headerRegex.exec(normalizedCurl)) !== null) {
      const headerContent = match[1];
      const colonIndex = headerContent.indexOf(":");
      if (colonIndex > -1) {
        const key = headerContent.substring(0, colonIndex).trim();
        const value = headerContent.substring(colonIndex + 1).trim();
        if (key && value) {
          headers[key] = value;
        }
      }
    }

    // Extract Cookie (-b 'CookieString')
    const cookieMatch = normalizedCurl.match(/-b\s+['"]([^'"]+)['"]/);
    if (cookieMatch) {
      headers["Cookie"] = cookieMatch[1];
    }

    return { url, method, headers };
  };

  const handleSend = async () => {
    setLoading(true);
    setResponse("");
    setStatus(null);

    try {
      const { url, method, headers } = parseCurl(curlCommand);

      if (!url) {
        throw new Error("Could not parse URL from curl command");
      }

      const result = await invoke<ProxyResponse>("proxy_request", {
        url,
        method,
        headers,
      });

      setStatus(result.status ?? null);
      setFinalUrl(result.final_url ?? null);
      setResponseHeaders(result.response_headers ?? []);
      setRequestHeaders(result.request_headers ?? []);

      try {
        const json = JSON.parse(result.body);
        setResponse(JSON.stringify(json, null, 2));
      } catch {
        setResponse(result.body);
      }
    } catch (e) {
      setResponse(`Error: ${e instanceof Error ? e.message : String(e)}`);
      setStatus(null);
      setFinalUrl(null);
      setResponseHeaders([]);
      setRequestHeaders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="h-12 border-b flex items-center px-4 font-bold text-gray-800 flex-shrink-0 justify-between">
        HTTP Playground
        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Paste full cURL command below</span>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left: Input */}
          <div className="flex-1 flex flex-col p-4 border-r border-gray-200 min-w-[300px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              cURL Command
            </label>
            <textarea
              value={curlCommand}
              onChange={(e) => setCurlCommand(e.target.value)}
              className="flex-1 w-full border rounded p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50"
              placeholder="curl 'https://api.example.com' -H '...'"
              spellCheck={false}
            />
            <div className="mt-4">
              <button
                onClick={handleSend}
                disabled={loading}
                className={`w-full py-3 rounded font-bold text-white transition-colors shadow-sm ${
                  loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#007a5a] hover:bg-[#148567]"
                }`}
              >
                {loading ? "Sending Request..." : "Run Request"}
              </button>
            </div>
          </div>

          {/* Right: Response */}
          <div className="flex-1 flex flex-col p-4 bg-white min-w-[300px]">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Response</label>
              {status !== null && (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  status >= 200 && status < 300 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  Status: {status}
                </span>
              )}
            </div>
            {finalUrl && (
              <div className="text-xs text-gray-500 mb-2 break-all">
                Final URL: {finalUrl}
              </div>
            )}
            {requestHeaders.length > 0 && (
              <div className="mb-2 text-xs text-gray-600">
                <p className="font-semibold">Request Headers</p>
                <pre className="bg-gray-100 rounded p-2 mt-1 whitespace-pre-wrap break-words">
                  {requestHeaders.join("\n")}
                </pre>
              </div>
            )}
            {responseHeaders.length > 0 && (
              <div className="mb-2 text-xs text-gray-600">
                <p className="font-semibold">Response Headers</p>
                <pre className="bg-gray-100 rounded p-2 mt-1 whitespace-pre-wrap break-words">
                  {responseHeaders.join("\n")}
                </pre>
              </div>
            )}
            <div className="flex-1 border rounded bg-gray-50 p-4 overflow-auto relative">
              {response ? (
                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                  {response}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  Response body will appear here
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
