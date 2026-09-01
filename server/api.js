const DEFAULT_BASE_URL = process.env.API_BASE_URL || "http://localhost:5001";

function normalizeBaseURL(baseURL) {
  return String(baseURL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function buildURL(baseURL, path) {
  const normalizedBaseURL = normalizeBaseURL(baseURL);
  const normalizedPath = String(path || "").replace(/^\/+/, "");

  return `${normalizedBaseURL}/${normalizedPath}`;
}

function createApiClient(baseURL = DEFAULT_BASE_URL, config = {}) {
  const normalizedBaseURL = normalizeBaseURL(baseURL);
  const timeout = Number.isFinite(Number(config.timeout)) && Number(config.timeout) > 0 ? Number(config.timeout) : 10000;

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(buildURL(normalizedBaseURL, path), {
        ...options,
        signal: options.signal || controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    baseURL: normalizedBaseURL,
    request,
    get(path, options = {}) {
      return request(path, { ...options, method: "GET" });
    },
    post(path, data, options = {}) {
      return request(path, {
        ...options,
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    put(path, data, options = {}) {
      return request(path, {
        ...options,
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    patch(path, data, options = {}) {
      return request(path, {
        ...options,
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    delete(path, options = {}) {
      return request(path, { ...options, method: "DELETE" });
    },
  };
}

module.exports = createApiClient();
module.exports.createApiClient = createApiClient;
module.exports.DEFAULT_BASE_URL = DEFAULT_BASE_URL;
