import type { ProblemDetails } from "./generated/types.gen.js"

export class LurantaProblemError extends Error {
  readonly code: string
  readonly problem: ProblemDetails
  readonly requestId: string
  readonly response: Response
  readonly retryable: boolean
  readonly status: number

  constructor(problem: ProblemDetails, response: Response) {
    super(problem.detail, { cause: problem })
    this.name = "LurantaProblemError"
    this.code = problem.code
    this.problem = problem
    this.requestId = problem.request_id
    this.response = response
    this.retryable = problem.retryable
    this.status = problem.status
  }
}

export class TransportError extends Error {
  constructor(message: string, cause: unknown) {
    super(message, { cause })
    this.name = "TransportError"
  }
}
