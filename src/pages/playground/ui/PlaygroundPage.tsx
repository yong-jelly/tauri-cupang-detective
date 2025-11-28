import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ProxyResponse } from "@shared/api/types";
import { parseCurlCommand } from "@shared/lib/parseCurl";

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

  const handleSend = async () => {
    setLoading(true);
    setResponse("");
    setStatus(null);

    try {
      const { url, method, headers, body } = parseCurlCommand(curlCommand);

      if (!url) {
        throw new Error("Could not parse URL from curl command");
      }

      const result = await invoke<ProxyResponse>("proxy_request", {
        url,
        method,
        headers,
        body: body ?? null,
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
    <div className="relative flex flex-col h-full bg-[#fdfbf7]">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      <div className="relative h-16 border-b-2 border-[#2d2416] bg-[#f6f1e9] flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">HTTP Playground</h1>
        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Paste full cURL command below</span>
      </div>

      <div className="relative flex-1 flex flex-col overflow-hidden">
        {/* Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left: Input */}
          <div className="flex-1 flex flex-col p-6 border-r-2 border-[#2d2416] min-w-[300px] bg-[#fffef0]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              cURL Command
            </label>
            <textarea
              value={curlCommand}
              onChange={(e) => setCurlCommand(e.target.value)}
              className="flex-1 w-full border border-gray-300 rounded-lg p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-gray-50"
              placeholder="curl 'https://api.example.com' -H '...'"
              spellCheck={false}
            />
            <div className="mt-4">
              <button
                onClick={handleSend}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-colors shadow-sm ${
                  loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? "Sending Request..." : "Run Request"}
              </button>
            </div>
          </div>

          {/* Right: Response */}
          <div className="flex-1 flex flex-col p-6 bg-[#fffef0] min-w-[300px]">
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
              <details className="mb-2 text-xs text-gray-600 bg-gray-100 rounded p-2">
                <summary className="font-semibold cursor-pointer">Request Headers</summary>
                <pre className="whitespace-pre-wrap break-words mt-2">
                  {requestHeaders.join("\n")}
                </pre>
              </details>
            )}
            {responseHeaders.length > 0 && (
              <details className="mb-2 text-xs text-gray-600 bg-gray-100 rounded p-2">
                <summary className="font-semibold cursor-pointer">Response Headers</summary>
                <pre className="whitespace-pre-wrap break-words mt-2">
                  {responseHeaders.join("\n")}
                </pre>
              </details>
            )}
            <div className="flex-1 border rounded bg-gray-50 p-4 overflow-auto relative min-h-[400px]">
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
