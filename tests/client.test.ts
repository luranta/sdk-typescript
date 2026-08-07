import { describe, expect, test } from "bun:test"
import {
  Luranta,
  LurantaProblemError,
  TransportError,
  type CompanyList,
  type Fetch,
  type ProblemDetails,
  type ReferenceList,
} from "../src/index.js"

const companyList: CompanyList = {
  data: [
    {
      country: "GB",
      id: "018f1f8a-4d6e-7a6b-8a2b-7f3e8d1c9a10",
      industries: ["software"],
      logo_url: null,
      merged_into_id: null,
      name: "Luranta",
      object: "company",
      open_job_count: 2,
      status: "active",
      type: "company",
      website_url: "https://luranta.com",
    },
  ],
  has_more: false,
  next_cursor: null,
  object: "list",
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error("EXPECTED_REJECTION")
}

describe("Luranta TypeScript SDK", () => {
  test("retries only a documented HTTP failure and exposes raw metadata", async () => {
    const requests: Request[] = []
    const responses = [
      problemResponse(503, "usage_unavailable"),
      jsonResponse(companyList, {
        "Luranta-Cost-USD": "0.010",
        "Luranta-Credit-Balance-USD": "9.990",
        "Luranta-Resources-Returned": "1",
        "X-Request-Id": "019faa81-0b1a-77b1-9758-51ff24ab51ae",
      }),
    ]
    const fetchMock = (async (input: RequestInfo | URL) => {
      requests.push(input as Request)
      return responses.shift()!
    }) as Fetch

    const luranta = new Luranta({
      apiKey: "lur_test_123",
      fetch: fetchMock,
      maxRetries: 1,
    })
    const raw = await luranta.companies.withRawResponse.list({
      countries: ["GB", "US"],
    })

    expect(requests).toHaveLength(2)
    expect(requests[0]!.headers.get("Authorization")).toBe("Bearer lur_test_123")
    expect(new URL(requests[0]!.url).searchParams.getAll("countries")).toEqual(["GB", "US"])
    expect(raw.data).toEqual(companyList)
    expect(raw.resourcesReturned).toBe(1)
    expect(raw.costUsd).toBe("0.010")
    expect(raw.creditBalanceUsd).toBe("9.990")
    expect(raw.requestId).toBe("019faa81-0b1a-77b1-9758-51ff24ab51ae")
    expect(Bun.inspect(raw)).not.toContain("lur_test_123")
    expect("request" in raw).toBe(false)
  })

  test("rejects an API base URL that could expose the bearer key", () => {
    for (const baseUrl of [
      "http://api.luranta.com",
      "https://user:secret@api.luranta.com",
      "https://api.luranta.com?target=other",
    ]) {
      expect(() => new Luranta({ apiKey: "lur_test_123", baseUrl })).toThrow(TypeError)
    }
  })

  test("never retries an ambiguous network failure", async () => {
    let calls = 0
    const fetchMock = (async () => {
      calls += 1
      throw new TypeError("socket closed")
    }) as Fetch
    const luranta = new Luranta({
      apiKey: "lur_test_123",
      fetch: fetchMock,
      maxRetries: 4,
    })

    let error: unknown
    try {
      await luranta.companies.list()
    } catch (cause) {
      error = cause
    }
    expect(error).toBeInstanceOf(TransportError)
    expect(calls).toBe(1)
  })

  test("does not hide ambiguity when a retry attempt loses the response", async () => {
    let calls = 0
    const fetchMock = (async () => {
      calls += 1
      if (calls === 1) {
        return problemResponse(503, "service_unavailable")
      }
      throw new TypeError("connection reset")
    }) as Fetch
    const luranta = new Luranta({
      apiKey: "lur_test_123",
      fetch: fetchMock,
      maxRetries: 3,
    })

    let error: unknown
    try {
      await luranta.companies.list()
    } catch (cause) {
      error = cause
    }
    expect(error).toBeInstanceOf(TransportError)
    expect(calls).toBe(2)
  })

  test("retries only an explicit non-billable Problem Details response", async () => {
    for (const firstResponse of [
      problemResponse(503, "service_unavailable", { retryable: false }),
      new Response("upstream unavailable", {
        headers: { "Content-Type": "text/plain" },
        status: 503,
      }),
      problemResponse(503, "service_unavailable", {
        headers: { "Luranta-Cost-USD": "0.010" },
      }),
    ]) {
      let calls = 0
      const luranta = new Luranta({
        apiKey: "lur_test_123",
        fetch: async () => {
          calls += 1
          return firstResponse.clone()
        },
        maxRetries: 3,
      })

      expect(await rejection(luranta.companies.list())).toBeInstanceOf(LurantaProblemError)
      expect(calls).toBe(1)
    }
  })

  test("raises a typed RFC 9457 error without retrying a 400", async () => {
    let calls = 0
    const fetchMock = (async () => {
      calls += 1
      return problemResponse(400, "invalid_request")
    }) as Fetch
    const luranta = new Luranta({
      apiKey: "lur_test_123",
      fetch: fetchMock,
      maxRetries: 3,
    })

    try {
      await luranta.companies.list()
      throw new Error("Expected LurantaProblemError.")
    } catch (error) {
      expect(error).toBeInstanceOf(LurantaProblemError)
      expect((error as LurantaProblemError).code).toBe("invalid_request")
      expect((error as LurantaProblemError).status).toBe(400)
      expect((error as LurantaProblemError).requestId).toBe("019faa81-0b1a-77b1-9758-51ff24ab51ae")
    }
    expect(calls).toBe(1)
  })

  test("iterates keyset cursors without changing the original filters", async () => {
    const urls: URL[] = []
    const pages: ReferenceList[] = [
      {
        data: [{ code: "backend", label: "Backend", object: "reference" }],
        has_more: true,
        next_cursor: "next-page",
        object: "list",
      },
      {
        data: [{ code: "frontend", label: "Frontend", object: "reference" }],
        has_more: false,
        next_cursor: null,
        object: "list",
      },
    ]
    const fetchMock = (async (input: RequestInfo | URL) => {
      urls.push(new URL((input as Request).url))
      return jsonResponse(pages.shift()!)
    }) as Fetch
    const luranta = new Luranta({
      apiKey: "lur_test_123",
      fetch: fetchMock,
    })

    const codes: string[] = []
    for await (const role of luranta.reference.roles.iterate({ query: "end", limit: 1 })) {
      codes.push(role.code)
    }

    expect(codes).toEqual(["backend", "frontend"])
    expect(urls[0]!.searchParams.get("cursor")).toBeNull()
    expect(urls[1]!.searchParams.get("cursor")).toBe("next-page")
    expect(urls[1]!.searchParams.get("query")).toBe("end")
    expect(urls[1]!.searchParams.get("limit")).toBe("1")
  })

  test("stops pagination when the server repeats a billable cursor", async () => {
    let calls = 0
    const repeatedPage: ReferenceList = {
      data: [{ code: "backend", label: "Backend", object: "reference" }],
      has_more: true,
      next_cursor: "same-page",
      object: "list",
    }
    const luranta = new Luranta({
      apiKey: "lur_test_123",
      fetch: async () => {
        calls += 1
        return jsonResponse(repeatedPage)
      },
    })

    const consume = async () => {
      for await (const _item of luranta.reference.roles.iterate({
        cursor: "same-page",
      })) {
        // Consume the iterator.
      }
    }

    expect(await rejection(consume())).toBeInstanceOf(TransportError)
    expect(calls).toBe(1)
  })

  test("preserves a response enum added after SDK generation", async () => {
    const fetchMock = (async () =>
      jsonResponse({
        ...companyList,
        data: [{ ...companyList.data[0], status: "paused" }],
      })) as Fetch
    const luranta = new Luranta({
      apiKey: "lur_test_123",
      fetch: fetchMock,
    })

    const page = await luranta.companies.list()

    expect(page.data[0]!.status).toBe("paused")
  })
})

function problemResponse(
  status: number,
  code: string,
  options: {
    headers?: Record<string, string>
    retryable?: boolean
  } = {},
): Response {
  const problem: ProblemDetails = {
    code,
    detail: "The request could not be completed.",
    instance: "/v0/companies",
    request_id: "019faa81-0b1a-77b1-9758-51ff24ab51ae",
    retryable: options.retryable ?? status === 503,
    status,
    title: "Request failed",
    type: `https://docs.luranta.com/errors/${code}`,
  }

  return jsonResponse(
    problem,
    {
      "Retry-After": "0",
      "X-Request-Id": problem.request_id,
      ...options.headers,
    },
    status,
  )
}

function jsonResponse(
  value: unknown,
  headers: Record<string, string> = {},
  status = 200,
): Response {
  return new Response(JSON.stringify(value), {
    headers: {
      "Content-Type": status >= 400 ? "application/problem+json" : "application/json",
      ...headers,
    },
    status,
  })
}
