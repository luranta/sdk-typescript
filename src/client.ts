import { createClient } from "./generated/client/index.js"
import { Sdk } from "./generated/sdk.gen.js"
import type {
  Company,
  CompanyList,
  Job,
  JobList,
  Location,
  LocationList,
  ListCompaniesData,
  ListJobsData,
  ListLocationsData,
  ListToolsData,
  TaxonomySnapshot,
  Tool,
  ToolList,
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
export type LocationsListParams = NonNullable<ListLocationsData["query"]>
export type ToolsListParams = NonNullable<ListToolsData["query"]>

type GeneratedSdkResult<T> = Promise<GeneratedResult<T>>

function abortSignal(
  signal: AbortSignal | undefined,
): { signal?: never } | { signal: AbortSignal } {
  return signal === undefined ? {} : { signal }
}

export class Luranta {
  readonly companies: CompaniesResource
  readonly jobs: JobsResource
  readonly taxonomies: TaxonomiesResource
  readonly tools: ToolsResource
  readonly locations: LocationsResource

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
    this.taxonomies = new TaxonomiesResource(sdk)
    this.tools = new ToolsResource(sdk)
    this.locations = new LocationsResource(sdk)
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
    return unwrap<JobList>(
      this.#sdk.listJobs({
        query: params,
        ...abortSignal(options.signal),
      }),
    )
  }

  async retrieve(jobId: string, options: RequestOptions = {}): Promise<Job> {
    return unwrap<Job>(
      this.#sdk.retrieveJob({
        path: { job_id: jobId },
        ...abortSignal(options.signal),
      }),
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
    return unwrapRaw<JobList>(
      this.#sdk.listJobs({
        query: params,
        ...abortSignal(options.signal),
      }),
    )
  }

  async retrieve(jobId: string, options: RequestOptions = {}): Promise<RawResponse<Job>> {
    return unwrapRaw<Job>(
      this.#sdk.retrieveJob({
        path: { job_id: jobId },
        ...abortSignal(options.signal),
      }),
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
    return unwrap<CompanyList>(
      this.#sdk.listCompanies({
        query: params,
        ...abortSignal(options.signal),
      }),
    )
  }

  async retrieve(companyId: string, options: RequestOptions = {}): Promise<Company> {
    return unwrap<Company>(
      this.#sdk.retrieveCompany({
        path: { company_id: companyId },
        ...abortSignal(options.signal),
      }),
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
    return unwrapRaw<CompanyList>(
      this.#sdk.listCompanies({
        query: params,
        ...abortSignal(options.signal),
      }),
    )
  }

  async retrieve(companyId: string, options: RequestOptions = {}): Promise<RawResponse<Company>> {
    return unwrapRaw<Company>(
      this.#sdk.retrieveCompany({
        path: { company_id: companyId },
        ...abortSignal(options.signal),
      }),
    )
  }
}

type TaxonomyCurrentRequest = (signal?: AbortSignal) => GeneratedSdkResult<TaxonomySnapshot>
type TaxonomyVersionRequest = (
  version: string,
  signal?: AbortSignal,
) => GeneratedSdkResult<TaxonomySnapshot>

export class TaxonomyResource {
  readonly #currentRequest: TaxonomyCurrentRequest
  readonly #versionRequest: TaxonomyVersionRequest

  constructor(currentRequest: TaxonomyCurrentRequest, versionRequest: TaxonomyVersionRequest) {
    this.#currentRequest = currentRequest
    this.#versionRequest = versionRequest
  }

  async current(options: RequestOptions = {}): Promise<TaxonomySnapshot> {
    return unwrap(this.#currentRequest(options.signal))
  }

  async get(version: number | string, options: RequestOptions = {}): Promise<TaxonomySnapshot> {
    return unwrap(this.#versionRequest(String(version), options.signal))
  }
}

export class TaxonomiesResource {
  readonly industries: TaxonomyResource
  readonly roles: TaxonomyResource

  constructor(sdk: Sdk) {
    this.industries = new TaxonomyResource(
      (signal) => sdk.getIndustryTaxonomy(abortSignal(signal)),
      (version, signal) =>
        sdk.getIndustryTaxonomyVersion({
          path: { version },
          ...abortSignal(signal),
        }),
    )
    this.roles = new TaxonomyResource(
      (signal) => sdk.getRoleTaxonomy(abortSignal(signal)),
      (version, signal) =>
        sdk.getRoleTaxonomyVersion({
          path: { version },
          ...abortSignal(signal),
        }),
    )
  }
}

export class ToolsResource {
  readonly withRawResponse: ToolsRawResource
  readonly #sdk: Sdk

  constructor(sdk: Sdk) {
    this.#sdk = sdk
    this.withRawResponse = new ToolsRawResource(sdk)
  }

  async list(params: ToolsListParams, options: RequestOptions = {}): Promise<ToolList> {
    return unwrap<ToolList>(
      this.#sdk.listTools({
        query: params,
        ...abortSignal(options.signal),
      }),
    )
  }

  async retrieve(code: string, options: RequestOptions = {}): Promise<Tool> {
    return unwrap<Tool>(
      this.#sdk.retrieveTool({
        path: { code },
        ...abortSignal(options.signal),
      }),
    )
  }

  async *iterate(
    params: ToolsListParams,
    options: RequestOptions = {},
  ): AsyncGenerator<ToolList["data"][number], void, undefined> {
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

export class ToolsRawResource {
  readonly #sdk: Sdk

  constructor(sdk: Sdk) {
    this.#sdk = sdk
  }

  async list(
    params: ToolsListParams,
    options: RequestOptions = {},
  ): Promise<RawResponse<ToolList>> {
    return unwrapRaw<ToolList>(
      this.#sdk.listTools({
        query: params,
        ...abortSignal(options.signal),
      }),
    )
  }

  async retrieve(code: string, options: RequestOptions = {}): Promise<RawResponse<Tool>> {
    return unwrapRaw<Tool>(
      this.#sdk.retrieveTool({
        path: { code },
        ...abortSignal(options.signal),
      }),
    )
  }
}

export class LocationsResource {
  readonly withRawResponse: LocationsRawResource
  readonly #sdk: Sdk

  constructor(sdk: Sdk) {
    this.#sdk = sdk
    this.withRawResponse = new LocationsRawResource(sdk)
  }

  async list(params: LocationsListParams, options: RequestOptions = {}): Promise<LocationList> {
    return unwrap<LocationList>(
      this.#sdk.listLocations({
        query: params,
        ...abortSignal(options.signal),
      }),
    )
  }

  async retrieve(id: string, options: RequestOptions = {}): Promise<Location> {
    return unwrap<Location>(
      this.#sdk.retrieveLocation({
        path: { id },
        ...abortSignal(options.signal),
      }),
    )
  }

  async *iterate(
    params: LocationsListParams,
    options: RequestOptions = {},
  ): AsyncGenerator<LocationList["data"][number], void, undefined> {
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

export class LocationsRawResource {
  readonly #sdk: Sdk

  constructor(sdk: Sdk) {
    this.#sdk = sdk
  }

  async list(
    params: LocationsListParams,
    options: RequestOptions = {},
  ): Promise<RawResponse<LocationList>> {
    return unwrapRaw<LocationList>(
      this.#sdk.listLocations({
        query: params,
        ...abortSignal(options.signal),
      }),
    )
  }

  async retrieve(id: string, options: RequestOptions = {}): Promise<RawResponse<Location>> {
    return unwrapRaw<Location>(
      this.#sdk.retrieveLocation({
        path: { id },
        ...abortSignal(options.signal),
      }),
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
