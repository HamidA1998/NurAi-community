import { QueryClient, QueryFunction } from "@tanstack/react-query";

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  responseBody?: unknown;

  constructor(
    message: string,
    status: number,
    responseBody?: unknown,
    code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.responseBody = responseBody;
    this.code = code;
  }
}

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  const explicitUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicitUrl) {
    return new URL(explicitUrl).href;
  }

  let host = process.env.EXPO_PUBLIC_DOMAIN;
  if (!host) {
    throw new Error("EXPO_PUBLIC_API_URL or EXPO_PUBLIC_DOMAIN is not set");
  }

  let url = new URL(`https://${host}`);

  return url.href;
}

function readableApiErrorCode(code: string): string {
  return code
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function customerFacingApiMessage(
  status: number,
  statusText: string,
  responseBody: unknown,
): string {
  if (status >= 500) {
    return "Something went wrong on our side. Please try again shortly.";
  }

  if (responseBody && typeof responseBody === "object") {
    const body = responseBody as {
      message?: unknown;
      error?: unknown;
      code?: unknown;
    };
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message.trim();
    }
    if (status < 500 && typeof body.error === "string" && body.error.trim()) {
      return readableApiErrorCode(body.error);
    }
    if (status < 500 && typeof body.code === "string" && body.code.trim()) {
      return readableApiErrorCode(body.code);
    }
  }

  if (status === 401) return "Please sign in again to continue.";
  if (status === 403) return "This feature is not available on your plan.";
  if (status === 404) return "We could not find that item. Please try again.";
  return statusText || "Something went wrong. Please try again.";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let responseBody: unknown;
    try {
      responseBody = text ? JSON.parse(text) : undefined;
    } catch {
      responseBody = undefined;
    }

    const code =
      responseBody &&
      typeof responseBody === "object" &&
      typeof (responseBody as { error?: unknown }).error === "string"
        ? (responseBody as { error: string }).error
        : undefined;
    throw new ApiRequestError(
      customerFacingApiMessage(res.status, res.statusText, responseBody),
      res.status,
      responseBody,
      code,
    );
  }
}

const DEFAULT_API_TIMEOUT_MS = 12000;

function createRequestSignal(
  providedSignal?: AbortSignal,
  timeoutMs = DEFAULT_API_TIMEOUT_MS,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const abortFromProvidedSignal = () => controller.abort();
  if (providedSignal) {
    if (providedSignal.aborted) {
      controller.abort();
    } else {
      providedSignal.addEventListener("abort", abortFromProvidedSignal, {
        once: true,
      });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      providedSignal?.removeEventListener("abort", abortFromProvidedSignal);
    },
  };
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  const requestSignal = createRequestSignal(options.signal, options.timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: requestSignal.signal,
    });

    await throwIfResNotOk(res);
    return res;
  } finally {
    requestSignal.cleanup();
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const requestSignal = createRequestSignal();

    const res = await fetch(url, {
      credentials: "include",
      signal: requestSignal.signal,
    }).finally(requestSignal.cleanup);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
