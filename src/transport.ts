import type { ProblemDetails } from "./generated/types.gen.js"
import { LurantaProblemError, TransportError } from "./errors.js"

const DEFAULT_BASE_URL = "https://api.luranta.com"
const DEFAULT_MAX_RETRIES = 2
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])
const PROBLEM_MEDIA_TYPE = "application/problem+json"

export type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface LurantaClientOptions {
  apiKey: string
  baseUrl?: string
  fetch?: Fetch
  maxRetries?: number
}

export interface RequestOptions {
  signal?: AbortSignal
}

export interface RawResponse<T> {
  creditBalanceUsd: string | null
  costUsd: string | null
  data: T
  requestId: string | null
  resourcesReturned: number | null
  response: Response
}

export interface GeneratedResult<T> {
  data?: T
  error?: unknown
  request?: Request
  response?: Response
}

export interface PreparedTransport {
  apiKey: string
  baseUrl: string
  fetch: typeof fetch
}

export function prepareTransport(options: LurantaClientOptions): PreparedTransport {
  if (!options.apiKey.startsWith("lur_") || options.apiKey.length <= 4) {
    throw new TypeError("apiKey must be a non-empty Luranta key beginning with lur_.")
  }
  if (
    options.maxRetries !== undefined &&
    (!Number.isInteger(options.maxRetries) || options.maxRetries < 0)
  ) {
    throw new TypeError("maxRetries must be a non-negative integer.")
  }

  const baseUrl = validatedBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL)
  const fetchImplementation = options.fetch ?? globalThis.fetch
  if (typeof fetchImplementation !== "function") {
    throw new TypeError("A Fetch API implementation is required.")
  }

  return {
    apiKey: options.apiKey,
    baseUrl,
    fetch: createRetryingFetch(
      fetchImplementation,
      options.maxRetries ?? DEFAULT_MAX_RETRIES,
    ) as typeof fetch,
  }
}

export async function unwrap<T>(
  result: GeneratedResult<T> | Promise<GeneratedResult<T>>,
): Promise<T> {
  return (await unwrapRaw(result)).data
}

export async function unwrapRaw<T>(
  result: GeneratedResult<T> | Promise<GeneratedResult<T>>,
): Promise<RawResponse<T>> {
  const resolved = await result
  if (resolved.data !== undefined && resolved.request && resolved.response) {
    return {
      creditBalanceUsd: resolved.response.headers.get("Luranta-Credit-Balance-USD"),
      costUsd: resolved.response.headers.get("Luranta-Cost-USD"),
      data: resolved.data,
      requestId: resolved.response.headers.get("X-Request-Id"),
      resourcesReturned: parseCount(resolved.response.headers.get("Luranta-Resources-Returned")),
      response: resolved.response,
    }
  }

  if (resolved.error instanceof TransportError) {
    throw resolved.error
  }

  if (resolved.response) {
    throw new LurantaProblemError(
      normalizeProblem(resolved.error, resolved.response),
      resolved.response,
    )
  }

  throw new TransportError(
    "The request failed before an HTTP response was received.",
    resolved.error,
  )
}

function validatedBaseUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new TypeError("baseUrl must be an absolute HTTPS URL.")
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.hostname
  ) {
    throw new TypeError(
      "baseUrl must be an absolute HTTPS URL without credentials, query, or hash.",
    )
  }
  return url.toString().replace(/\/+$/, "")
}

function createRetryingFetch(fetchImplementation: Fetch, maxRetries: number): Fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    for (let attempt = 0; ; attempt += 1) {
      let response: Response
      try {
        response = await fetchImplementation(cloneInput(input), init)
      } catch (cause) {
        throw new TransportError(
          "The request may have reached Luranta, so ambiguous network failures are never retried.",
          cause,
        )
      }

      if (
        attempt >= maxRetries ||
        requestMethod(input, init) !== "GET" ||
        !(await isExplicitRetryableProblem(response))
      ) {
        return response
      }

      await response.body?.cancel().catch(() => undefined)
      await sleep(retryDelayMilliseconds(response.headers.get("Retry-After"), attempt))
    }
  }
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase()
}

async function isExplicitRetryableProblem(response: Response): Promise<boolean> {
  if (
    !RETRYABLE_STATUSES.has(response.status) ||
    response.headers.has("Luranta-Cost-USD") ||
    response.headers.has("Luranta-Resources-Returned") ||
    response.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() !==
      PROBLEM_MEDIA_TYPE
  ) {
    return false
  }

  try {
    const problem: unknown = await response.clone().json()
    return isProblemDetails(problem) && problem.retryable && problem.status === response.status
  } catch {
    return false
  }
}

function cloneInput(input: RequestInfo | URL): RequestInfo | URL {
  return input instanceof Request ? input.clone() : input
}

function retryDelayMilliseconds(retryAfter: string | null, attempt: number): number {
  if (retryAfter !== null) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1_000
    }

    const date = Date.parse(retryAfter)
    if (Number.isFinite(date)) {
      return Math.max(0, date - Date.now())
    }
  }

  return 250 * 2 ** attempt
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function parseCount(value: string | null): number | null {
  if (value === null) {
    return null
  }
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function normalizeProblem(error: unknown, response: Response): ProblemDetails {
  if (isProblemDetails(error) && error.status === response.status) {
    return error
  }

  const requestId = response.headers.get("X-Request-Id") ?? "unknown"
  return {
    code: "unexpected_error_response",
    detail:
      typeof error === "string" && error.length > 0
        ? error
        : `Luranta returned HTTP ${response.status}.`,
    instance: response.url || "about:blank",
    request_id: requestId,
    retryable: false,
    status: response.status,
    title: "Unexpected error response",
    type: "https://docs.luranta.com/errors/unexpected-error-response",
  }
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  if (!value || typeof value !== "object") {
    return false
  }
  const candidate = value as Partial<ProblemDetails>
  return (
    typeof candidate.code === "string" &&
    typeof candidate.detail === "string" &&
    typeof candidate.instance === "string" &&
    typeof candidate.request_id === "string" &&
    typeof candidate.retryable === "boolean" &&
    Number.isSafeInteger(candidate.status) &&
    candidate.status! >= 400 &&
    candidate.status! <= 599 &&
    typeof candidate.title === "string" &&
    typeof candidate.type === "string"
  )
}
