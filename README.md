# `@luranta/sdk`

Official TypeScript SDK for Luranta's preview API, published as `@luranta/sdk`.

```ts
import { Luranta } from "@luranta/sdk"

const luranta = new Luranta({ apiKey: process.env.LURANTA_API_KEY! })

for await (const job of luranta.jobs.iterate({ roles: ["software-engineering"] })) {
  console.log(job.title)
}
```

`jobs`, `companies`, `tools`, and `locations` expose `list`, `retrieve` where
applicable, cursor iterators, and `withRawResponse` methods. Versioned role and
industry taxonomies are available through `luranta.taxonomies.roles` and
`luranta.taxonomies.industries`; use their `current()` and `get(version)`
methods. Raw responses include the request ID and Luranta billing headers.

Taxonomy values, tools, and locations are evolving resources. Languages are
accepted as canonical BCP 47 strings (for example `en-GB` or `zh-Hans`) rather
than a generated enum.

The SDK is intended for trusted server-side code. Never place a Luranta API
key in browser-delivered JavaScript. The source remains browser-Fetch
compatible so edge runtimes can use it safely.

Only HTTP `408`, `429`, `500`, `502`, `503`, and `504` responses carrying
valid RFC 9457 Problem Details with `retryable: true` and no billing evidence
are retried. `Retry-After` is honored. Network failures are ambiguous and
immediately raise `TransportError`. Cursor iterators stop on malformed or
repeated cursors rather than risk duplicate billable reads.

## Generation

`src/generated` is disposable and generated from
`../../apps/api/openapi/openapi.json` using exactly
`@hey-api/openapi-ts@0.99.0`. Handwritten runtime files never duplicate API
models. A deterministic response-only transform widens evolving enum fields
to strings while keeping request enums and structural `object` discriminators
strict.

```sh
bun run generate
bun run generate:check
```

The public source repository is [luranta/sdk-typescript](https://github.com/luranta/sdk-typescript).
Releases use npm Trusted Publishing with provenance.

Hey API 0.99.0 still requires the compiler API removed from TypeScript 7. Its
Node-only generator therefore lives in `tooling/generator` with its own frozen
lockfile and exact TypeScript 6.0.3 compatibility pin, matching Hey API's own
published development cohort. The launcher verifies
that cohort and requires Node 26; TypeScript 6 never becomes a dependency of
the SDK runtime or the repository's TypeScript 7 build.
