import { createClient } from "./generated/client/index.js"
import { Sdk } from "./generated/sdk.gen.js"
import type {
  Company,
  CompanyList,
  Job,
  JobList,
  ListCompaniesData,
  ListJobsData,
  ListRolesData,
  ReferenceList,
} from "./generated/types.gen.js"
import { TransportError } from "./errors.js"
import {
  type GeneratedResult,
  type LurantaClientOptions,
  type RawResponse,
  type RequestOptions,
  prepareTransport,
  unwrap,
  unwrapRaw,
} from "./transport.js"

export type CompaniesListParams = NonNullable<ListCompaniesData["query"]>
export type JobsListParams = NonNullable<ListJobsData["query"]>
export type ReferenceListParams = NonNullable<ListRolesData["query"]>
export type ReferenceItem = ReferenceList["data"][number]

type GeneratedSdkResult<T> = Promise<GeneratedResult<T>>

export class Luranta {
  readonly companies: CompaniesResource
  readonly jobs: JobsResource
  readonly reference: ReferenceResource

  constructor(options: LurantaClientOptions) {
    const transport = prepareTransport(options)
    const sdk = new Sdk({
      client: createClient({
        auth: transport.apiKey,
        baseUrl: transport.baseUrl,
        fetch: transport.fetch,
        responseStyle: "fields",
        throwOnError: false,
      }),
    })

    this.companies = new CompaniesResource(sdk)
    this.jobs = new JobsResource(sdk)
    this.reference = new ReferenceResource(sdk)
  }
}

export class JobsResource {
  readonly withRawResponse: JobsRawResource
  readonly #sdk: Sdk

  constructor(sdk: Sdk) {
    this.#sdk = sdk
    this.withRawResponse = new JobsRawResource(sdk)
  }

  async list(params: JobsListParams = {}, options: RequestOptions = {}): Promise<JobList> {
    return unwrap(
      this.#sdk.listJobs({
        query: params,
        signal: options.signal,
      }) as GeneratedSdkResult<JobList>,
    )
  }

  async retrieve(jobId: string, options: RequestOptions = {}): Promise<Job> {
    return unwrap(
      this.#sdk.retrieveJob({
        path: { job_id: jobId },
        signal: options.signal,
      }) as GeneratedSdkResult<Job>,
    )
  }

  async *iterate(
    params: JobsListParams = {},
    options: RequestOptions = {},
  ): AsyncGenerator<JobList["data"][number], void, undefined> {
    let pageParams = { ...params }
    const seenCursors = initialCursors(params.cursor)
    for (;;) {
      const page = await this.list(pageParams, options)
      yield* page.data
      const cursor = advanceCursor(page, seenCursors)
      if (cursor === null) {
        return
      }
      pageParams = { ...params, cursor }
    }
  }
}

export class JobsRawResource {
  readonly #sdk: Sdk

  constructor(sdk: Sdk) {
    this.#sdk = sdk
  }

  async list(
    params: JobsListParams = {},
    options: RequestOptions = {},
  ): Promise<RawResponse<JobList>> {
    return unwrapRaw(
      this.#sdk.listJobs({
        query: params,
        signal: options.signal,
      }) as GeneratedSdkResult<JobList>,
    )
  }

  async retrieve(jobId: string, options: RequestOptions = {}): Promise<RawResponse<Job>> {
    return unwrapRaw(
      this.#sdk.retrieveJob({
        path: { job_id: jobId },
        signal: options.signal,
      }) as GeneratedSdkResult<Job>,
    )
  }
}

export class CompaniesResource {
  readonly withRawResponse: CompaniesRawResource
  readonly #sdk: Sdk

  constructor(sdk: Sdk) {
    this.#sdk = sdk
    this.withRawResponse = new CompaniesRawResource(sdk)
  }

  async list(params: CompaniesListParams = {}, options: RequestOptions = {}): Promise<CompanyList> {
    return unwrap(
      this.#sdk.listCompanies({
        query: params,
        signal: options.signal,
      }) as GeneratedSdkResult<CompanyList>,
    )
  }

  async retrieve(companyId: string, options: RequestOptions = {}): Promise<Company> {
    return unwrap(
      this.#sdk.retrieveCompany({
        path: { company_id: companyId },
        signal: options.signal,
      }) as GeneratedSdkResult<Company>,
    )
  }

  async *iterate(
    params: CompaniesListParams = {},
    options: RequestOptions = {},
  ): AsyncGenerator<CompanyList["data"][number], void, undefined> {
    let pageParams = { ...params }
    const seenCursors = initialCursors(params.cursor)
    for (;;) {
      const page = await this.list(pageParams, options)
      yield* page.data
      const cursor = advanceCursor(page, seenCursors)
      if (cursor === null) {
        return
      }
      pageParams = { ...params, cursor }
    }
  }
}

export class CompaniesRawResource {
  readonly #sdk: Sdk

  constructor(sdk: Sdk) {
    this.#sdk = sdk
  }

  async list(
    params: CompaniesListParams = {},
    options: RequestOptions = {},
  ): Promise<RawResponse<CompanyList>> {
    return unwrapRaw(
      this.#sdk.listCompanies({
        query: params,
        signal: options.signal,
      }) as GeneratedSdkResult<CompanyList>,
    )
  }

  async retrieve(companyId: string, options: RequestOptions = {}): Promise<RawResponse<Company>> {
    return unwrapRaw(
      this.#sdk.retrieveCompany({
        path: { company_id: companyId },
        signal: options.signal,
      }) as GeneratedSdkResult<Company>,
    )
  }
}

type ReferenceOperation =
  | "listIndustries"
  | "listLanguages"
  | "listLocations"
  | "listRoles"
  | "listTools"

export class ReferenceResource {
  readonly industries: ReferenceCollection
  readonly languages: ReferenceCollection
  readonly locations: ReferenceCollection
  readonly roles: ReferenceCollection
  readonly tools: ReferenceCollection

  constructor(sdk: Sdk) {
    this.industries = new ReferenceCollection(sdk, "listIndustries")
    this.languages = new ReferenceCollection(sdk, "listLanguages")
    this.locations = new ReferenceCollection(sdk, "listLocations")
    this.roles = new ReferenceCollection(sdk, "listRoles")
    this.tools = new ReferenceCollection(sdk, "listTools")
  }
}

export class ReferenceCollection {
  readonly withRawResponse: ReferenceRawCollection
  readonly #operation: ReferenceOperation
  readonly #sdk: Sdk

  constructor(sdk: Sdk, operation: ReferenceOperation) {
    this.#operation = operation
    this.#sdk = sdk
    this.withRawResponse = new ReferenceRawCollection(sdk, operation)
  }

  async list(
    params: ReferenceListParams = {},
    options: RequestOptions = {},
  ): Promise<ReferenceList> {
    return unwrap(this.#request(params, options))
  }

  async *iterate(
    params: ReferenceListParams = {},
    options: RequestOptions = {},
  ): AsyncGenerator<ReferenceItem, void, undefined> {
    let pageParams = { ...params }
    const seenCursors = initialCursors(params.cursor)
    for (;;) {
      const page = await this.list(pageParams, options)
      yield* page.data
      const cursor = advanceCursor(page, seenCursors)
      if (cursor === null) {
        return
      }
      pageParams = { ...params, cursor }
    }
  }

  #request(
    params: ReferenceListParams,
    options: RequestOptions,
  ): GeneratedSdkResult<ReferenceList> {
    return this.#sdk[this.#operation]({
      query: params,
      signal: options.signal,
    }) as GeneratedSdkResult<ReferenceList>
  }
}

export class ReferenceRawCollection {
  readonly #operation: ReferenceOperation
  readonly #sdk: Sdk

  constructor(sdk: Sdk, operation: ReferenceOperation) {
    this.#operation = operation
    this.#sdk = sdk
  }

  async list(
    params: ReferenceListParams = {},
    options: RequestOptions = {},
  ): Promise<RawResponse<ReferenceList>> {
    return unwrapRaw(
      this.#sdk[this.#operation]({
        query: params,
        signal: options.signal,
      }) as GeneratedSdkResult<ReferenceList>,
    )
  }
}

function initialCursors(cursor: string | undefined): Set<string> {
  return cursor === undefined ? new Set() : new Set([cursor])
}

function advanceCursor(
  page: { has_more: boolean; next_cursor: string | null },
  seenCursors: Set<string>,
): string | null {
  if (!page.has_more) {
    return null
  }
  if (page.next_cursor === null) {
    throw new TransportError(
      "Luranta returned has_more without the next cursor required to continue pagination.",
      page,
    )
  }
  if (seenCursors.has(page.next_cursor)) {
    throw new TransportError(
      "Luranta returned a repeated cursor; pagination stopped to prevent duplicate billable reads.",
      page,
    )
  }
  seenCursors.add(page.next_cursor)
  return page.next_cursor
}
