export type ParsedCurlCommand = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | null;
};

const normalizeCurl = (curl: string) => curl.replace(/\\\s*\n/g, " ").replace(/[\r\n]+/g, " ").trim();

export const parseCurlCommand = (curl: string): ParsedCurlCommand => {
  let url = "";
  let method = "GET";
  const headers: Record<string, string> = {};
  let body: string | null = null;

  const normalizedCurl = normalizeCurl(curl);

  // Extract URL
  const urlMatch = normalizedCurl.match(/curl\s+(?:-X\s+\w+\s+)?['"]([^'"]+)['"]/);
  if (urlMatch) {
    url = urlMatch[1];
  } else {
    const fallbackMatch = normalizedCurl.match(/curl\s+(?:-X\s+\w+\s+)?([^\s'"]+)/);
    if (fallbackMatch) {
      url = fallbackMatch[1];
    }
  }

  // Method
  const methodMatch = normalizedCurl.match(/-X\s+([A-Z]+)/);
  if (methodMatch) {
    method = methodMatch[1];
  } else if (normalizedCurl.includes(" -d ") || normalizedCurl.includes(" --data ")) {
    method = "POST";
  }

  // Headers
  const headerRegex = /-H\s+(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = headerRegex.exec(normalizedCurl)) !== null) {
    const headerContent = match[1] ?? match[2] ?? "";
    const colonIndex = headerContent.indexOf(":");
    if (colonIndex > -1) {
      const key = headerContent.substring(0, colonIndex).trim();
      const value = headerContent.substring(colonIndex + 1).trim();
      if (key && value) {
        headers[key] = value;
      }
    }
  }

  // Cookies
  const cookieMatch = normalizedCurl.match(/-b\s+(?:"([^"]*)"|'([^']*)')/);
  if (cookieMatch) {
    headers["Cookie"] = cookieMatch[1] ?? cookieMatch[2] ?? "";
  }

  // Body payload (-d / --data / --data-raw / --data-binary)
  const dataRegex = /(?:--data-raw|--data-binary|--data|-d)\s+(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
  const bodyParts: string[] = [];
  let dataMatch;
  while ((dataMatch = dataRegex.exec(normalizedCurl)) !== null) {
    const value = dataMatch[1] ?? dataMatch[2] ?? dataMatch[3] ?? "";
    if (value) {
      bodyParts.push(value);
    }
  }
  if (bodyParts.length > 0) {
    body = bodyParts.join("\n");
  }

  return { url, method, headers, body };
};

