# Luranta TypeScript SDK

[![npm version](https://img.shields.io/npm/v/@luranta/sdk)](https://www.npmjs.com/package/@luranta/sdk)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D26.5.1-green.svg)](package.json)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.3.14-green.svg)](package.json)

The official TypeScript SDK for the [Luranta API](https://docs.luranta.com) — current,
rights-cleared job and company data for server-side products, agents, and MCP.

- **Server-side first:** designed for services and agents, not the browser-only.
- **Rights-cleared data:** every listing is licensed and reconciliated before publication.
- **Fully typed:** generated from the canonical OpenAPI contract; ships `.d.ts` + source maps.
- **Reliable:** bounded timeouts, retry/backoff, and typed errors.

> Package: [`@luranta/sdk`](https://www.npmjs.com/package/@luranta/sdk) · Source:
> [luranta/sdk-typescript](https://github.com/luranta/sdk-typescript) · Docs:
> [docs.luranta.com](https://docs.luranta.com)

## Install

```bash
npm install @luranta/sdk
# or
pnpm add @luranta/sdk
# or
yarn add @luranta/sdk
# or
bun add @luranta/sdk
```

## Quickstart

```ts
import { createLurantaClient } from "@luranta/sdk"

const client = createLurantaClient({
  // Public API key from https://luranta.com/developers
  apiKey: process.env.LURANTA_API_KEY!,
})

const { items } = await client.jobs.list({
  roles: ["software-engineer"],
  locations: ["london"],
  limit: 20,
})

for (const job of items) {
  console.log(job.title, job.company.name, job.compensation)
}
```

## Authentication

Create an API key in the [developer console](https://luranta.com/developers) and supply it
as `apiKey` (or the `LURANTA_API_KEY` environment variable). Keys are bearer tokens; keep them
**server-side only** — never ship them in client-side code.

## Examples

- `client.jobs.list()` / `client.jobs.retrieve(id)`
- `client.companies.list()` / `client.companies.retrieve(id)`
- `client.reference.list("roles")` — stable roles, locations, industries, tools, languages

## API reference

See the [Luranta API reference](https://docs.luranta.com/reference) for endpoints, schemas,
pagination, filtering, and error codes. The generated types in this SDK mirror that contract
exactly (OpenAPI 3.1).

## Releases

This repository is the public source for the generated SDK. Releases are cut
from a tag here and published to npm with sigstore provenance via Trusted Publishing.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md). Changes are reviewed and merged in this repository.

## Security

Report vulnerabilities privately via [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
